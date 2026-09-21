import type { Queue } from 'bullmq';

export const systemJobSchedules = [
	{ name: 'tickCharts', pattern: '55 * * * *' },
	{ name: 'resyncCharts', pattern: '0 0 * * *' },
	{ name: 'cleanCharts', pattern: '0 0 * * *' },
	{ name: 'clean', pattern: '0 0 * * *' },
	{ name: 'checkExpiredMutings', pattern: '*/5 * * * *' },
] as const;

export type SystemJobQueue = Pick<Queue<Record<string, unknown>>, 'upsertJobScheduler'>;

export function scheduleSystemJobs(queue: SystemJobQueue) {
	return Promise.all(systemJobSchedules.map(({ name, pattern }) => queue.upsertJobScheduler(name, {
		pattern,
	}, {
		name,
		data: {},
		opts: {
			removeOnComplete: true,
		},
	})));
}
