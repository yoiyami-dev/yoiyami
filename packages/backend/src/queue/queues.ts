import { Queue } from 'bullmq';
import { queuePrefix, redisConnection } from './connection.js';
import { DeliverJobData, InboxJobData, DbJobData, ObjectStorageJobData, EndedPollNotificationJobData, WebhookDeliverJobData } from './types.js';

const queueOptions = {
	prefix: queuePrefix,
	connection: redisConnection(),
};

export const systemQueue = new Queue<Record<string, unknown>>('system', queueOptions);
export const endedPollNotificationQueue = new Queue<EndedPollNotificationJobData>('endedPollNotification', queueOptions);
export const deliverQueue = new Queue<DeliverJobData>('deliver', queueOptions);
export const inboxQueue = new Queue<InboxJobData>('inbox', queueOptions);
export const dbQueue = new Queue<DbJobData>('db', queueOptions);
export const objectStorageQueue = new Queue<ObjectStorageJobData>('objectStorage', queueOptions);
export const webhookDeliverQueue = new Queue<WebhookDeliverJobData>('webhookDeliver', queueOptions);

export const queues = [
	systemQueue,
	endedPollNotificationQueue,
	deliverQueue,
	inboxQueue,
	dbQueue,
	objectStorageQueue,
	webhookDeliverQueue,
];
