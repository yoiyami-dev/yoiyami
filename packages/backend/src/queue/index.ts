import { QueueEvents, Worker, type Job, type Queue } from 'bullmq';
import httpSignature from '@peertube/http-signature';
import { v4 as uuid } from 'uuid';

import config from '@/config/index.js';
import { DriveFile } from '@/models/entities/drive-file.js';
import { IActivity } from '@/remote/activitypub/type.js';
import { Webhook, webhookEventTypes } from '@/models/entities/webhook.js';
import { envOption } from '../env.js';

import processDeliver from './processors/deliver.js';
import processInbox from './processors/inbox.js';
import { dbProcessors } from './processors/db/index.js';
import { objectStorageProcessors } from './processors/object-storage/index.js';
import { systemProcessors } from './processors/system/index.js';
import processWebhookDeliver from './processors/webhook-deliver.js';
import { endedPollNotification } from './processors/ended-poll-notification.js';
import { queueLogger } from './logger.js';
import { getJobInfo } from './get-job-info.js';
import { systemQueue, dbQueue, deliverQueue, inboxQueue, objectStorageQueue, endedPollNotificationQueue, webhookDeliverQueue } from './queues.js';
import { ThinUser } from './types.js';
import { queuePrefix, redisConnection } from './connection.js';
import { scheduleSystemJobs } from './system-jobs.js';
import { withTimeout } from './job-timeout.js';

type JobHandler<T> = (job: Job<T>) => Promise<unknown> | unknown;

const jobTimeouts: Readonly<Record<string, number>> = {
	deliver: 1 * 60 * 1000,
	inbox: 5 * 60 * 1000,
	webhookDeliver: 1 * 60 * 1000,
};

function renderError(error: unknown): { stack?: string; message: string; name: string } {
	const normalized = error instanceof Error ? error : new Error(String(error));
	return {
		stack: normalized.stack,
		message: normalized.message,
		name: normalized.name,
	};
}

function startWorker<T>(queue: Queue<T>, processors: Record<string, JobHandler<T>>, concurrency: number, limiter?: { max: number; duration: number }): Worker<T> {
	const worker = new Worker<T>(queue.name, async job => {
		const processor = processors[job.name];
		if (processor == null) throw new Error(`No processor registered for ${job.name}`);

		const operation = Promise.resolve().then(() => processor(job));
		const timeout = jobTimeouts[job.name];
		return timeout == null
			? operation
			: withTimeout(operation, timeout, `Job ${job.name} (${job.id})`);
	}, {
		connection: redisConnection(),
		prefix: queuePrefix,
		concurrency,
		limiter,
		settings: {
			backoffStrategy: apBackoff,
		},
	});

	return worker;
}

function attachQueueLogging<T>(
	queue: Queue<T>,
	worker: Worker<T>,
	logger: ReturnType<typeof queueLogger.createSubLogger>,
	formatJob: (job: Job<T>, includeTarget?: boolean) => string = job => `id=${job.id}`,
) {
	const events = new QueueEvents(queue.name, {
		connection: redisConnection(),
		prefix: queuePrefix,
	});

	events.on('waiting', ({ jobId }) => logger.debug(`waiting id=${jobId}`));
	events.on('error', error => logger.error(`queue events error ${error}`, { e: renderError(error) }));
	worker.on('active', job => logger.debug(`active ${formatJob(job, true)}`));
	worker.on('completed', (job, result) => logger.debug(`completed(${result}) ${formatJob(job, true)}`));
	worker.on('failed', (job, error) => {
		if (job == null) {
			logger.warn(`failed(${error})`);
		} else {
			logger.warn(`failed(${error}) ${formatJob(job)}`, { job, e: renderError(error) });
		}
	});
	worker.on('error', error => logger.error(`worker error ${error}`, { e: renderError(error) }));
	worker.on('stalled', jobId => logger.warn(`stalled id=${jobId}`));
}

const systemLogger = queueLogger.createSubLogger('system');
const deliverLogger = queueLogger.createSubLogger('deliver');
const webhookLogger = queueLogger.createSubLogger('webhook');
const inboxLogger = queueLogger.createSubLogger('inbox');
const dbLogger = queueLogger.createSubLogger('db');
const objectStorageLogger = queueLogger.createSubLogger('objectStorage');

export function deliver(user: ThinUser, content: unknown, to: string | null) {
	if (content == null || to == null) return null;

	return deliverQueue.add('deliver', {
		user: { id: user.id },
		content,
		to,
	}, {
		attempts: config.deliverJobMaxAttempts || 12,
		backoff: { type: 'apBackoff' },
		removeOnComplete: true,
		removeOnFail: true,
	});
}

export function inbox(activity: IActivity, signature: httpSignature.IParsedSignature) {
	return inboxQueue.add('inbox', {
		activity,
		signature,
	}, {
		attempts: config.inboxJobMaxAttempts || 8,
		backoff: { type: 'apBackoff' },
		removeOnComplete: true,
		removeOnFail: true,
	});
}

const transientJobOptions = {
	removeOnComplete: true,
	removeOnFail: true,
} as const;

export function createDeleteDriveFilesJob(user: ThinUser) {
	return dbQueue.add('deleteDriveFiles', { user }, transientJobOptions);
}

export function createExportCustomEmojisJob(user: ThinUser) {
	return dbQueue.add('exportCustomEmojis', { user }, transientJobOptions);
}

export function createExportNotesJob(user: ThinUser) {
	return dbQueue.add('exportNotes', { user }, transientJobOptions);
}

export function createExportFollowingJob(user: ThinUser, excludeMuting = false, excludeInactive = false) {
	return dbQueue.add('exportFollowing', { user, excludeMuting, excludeInactive }, transientJobOptions);
}

export function createExportMuteJob(user: ThinUser) {
	return dbQueue.add('exportMute', { user }, transientJobOptions);
}

export function createExportBlockingJob(user: ThinUser) {
	return dbQueue.add('exportBlocking', { user }, transientJobOptions);
}

export function createExportUserListsJob(user: ThinUser) {
	return dbQueue.add('exportUserLists', { user }, transientJobOptions);
}

export function createImportFollowingJob(user: ThinUser, fileId: DriveFile['id']) {
	return dbQueue.add('importFollowing', { user, fileId }, transientJobOptions);
}

export function createImportMutingJob(user: ThinUser, fileId: DriveFile['id']) {
	return dbQueue.add('importMuting', { user, fileId }, transientJobOptions);
}

export function createImportBlockingJob(user: ThinUser, fileId: DriveFile['id']) {
	return dbQueue.add('importBlocking', { user, fileId }, transientJobOptions);
}

export function createImportUserListsJob(user: ThinUser, fileId: DriveFile['id']) {
	return dbQueue.add('importUserLists', { user, fileId }, transientJobOptions);
}

export function createImportCustomEmojisJob(user: ThinUser, fileId: DriveFile['id']) {
	return dbQueue.add('importCustomEmojis', { user, fileId }, transientJobOptions);
}

export function createDeleteAccountJob(user: ThinUser, opts: { soft?: boolean } = {}) {
	return dbQueue.add('deleteAccount', { user, soft: opts.soft }, transientJobOptions);
}

export function createDeleteObjectStorageFileJob(key: string) {
	return objectStorageQueue.add('deleteFile', { key }, transientJobOptions);
}

export function createCleanRemoteFilesJob() {
	return objectStorageQueue.add('cleanRemoteFiles', {}, transientJobOptions);
}

export function webhookDeliver(webhook: Webhook, type: typeof webhookEventTypes[number], content: unknown) {
	return webhookDeliverQueue.add('webhookDeliver', {
		type,
		content,
		webhookId: webhook.id,
		userId: webhook.userId,
		to: webhook.url,
		secret: webhook.secret,
		createdAt: Date.now(),
		eventId: uuid(),
	}, {
		attempts: 4,
		backoff: { type: 'apBackoff' },
		removeOnComplete: true,
		removeOnFail: true,
	});
}

export default async function() {
	if (envOption.onlyServer) return;

	const deliverWorker = startWorker(deliverQueue, { deliver: processDeliver }, config.deliverJobConcurrency || 128, { max: config.deliverJobPerSec || 128, duration: 1000 });
	const inboxWorker = startWorker(inboxQueue, { inbox: processInbox }, config.inboxJobConcurrency || 16, { max: config.inboxJobPerSec || 16, duration: 1000 });
	const endedPollWorker = startWorker(endedPollNotificationQueue, { endedPollNotification }, 1);
	const webhookWorker = startWorker(webhookDeliverQueue, { webhookDeliver: processWebhookDeliver }, 64, { max: 64, duration: 1000 });
	const dbWorker = startWorker(dbQueue, dbProcessors, 1);
	const objectStorageWorker = startWorker(objectStorageQueue, objectStorageProcessors, 16, { max: 16, duration: 1000 });
	const systemWorker = startWorker(systemQueue, systemProcessors, 1);

	attachQueueLogging(systemQueue, systemWorker, systemLogger);
	attachQueueLogging(deliverQueue, deliverWorker, deliverLogger, (job, includeTarget) => `${getJobInfo(job, includeTarget)} to=${job.data.to}`);
	attachQueueLogging(inboxQueue, inboxWorker, inboxLogger, (job, includeTarget) => getJobInfo(job, includeTarget));
	attachQueueLogging(dbQueue, dbWorker, dbLogger);
	attachQueueLogging(objectStorageQueue, objectStorageWorker, objectStorageLogger);
	attachQueueLogging(webhookDeliverQueue, webhookWorker, webhookLogger, (job, includeTarget) => `${getJobInfo(job, includeTarget)} to=${job.data.to}`);

	await scheduleSystemJobs(systemQueue);
}

export async function destroy() {
	const deliverCleaned = await deliverQueue.clean(0, 10000, 'delayed');
	deliverLogger.succ(`Cleaned ${deliverCleaned.length} delayed jobs`);
	const inboxCleaned = await inboxQueue.clean(0, 10000, 'delayed');
	inboxLogger.succ(`Cleaned ${inboxCleaned.length} delayed jobs`);
}

// ref. https://github.com/misskey-dev/misskey/pull/7635#issue-971097019
function apBackoff(attemptsMade: number, type?: string) {
	if (type !== undefined && type !== 'apBackoff') return 0;
	const baseDelay = 60 * 1000;
	const maxBackoff = 8 * 60 * 60 * 1000;
	let backoff = (Math.pow(2, attemptsMade) - 1) * baseDelay;
	backoff = Math.min(backoff, maxBackoff);
	backoff += Math.round(backoff * Math.random() * 0.2);
	return backoff;
}
