import * as assert from 'assert';
import { scheduleSystemJobs, type SystemJobQueue } from '../src/queue/system-jobs.js';

describe('system queue schedulers', () => {
	it('registers every recurring system job with BullMQ', async () => {
		const scheduled: Array<{ id: string; pattern: string; name: string }> = [];
		const queue: SystemJobQueue = {
			upsertJobScheduler: async (id, repeatOpts, jobTemplate) => {
				scheduled.push({
					id,
					pattern: repeatOpts.pattern ?? '',
					name: jobTemplate?.name ?? '',
				});
				return undefined as never;
			},
		};

		await scheduleSystemJobs(queue);

		assert.deepStrictEqual(scheduled, [
			{ id: 'tickCharts', pattern: '55 * * * *', name: 'tickCharts' },
			{ id: 'resyncCharts', pattern: '0 0 * * *', name: 'resyncCharts' },
			{ id: 'cleanCharts', pattern: '0 0 * * *', name: 'cleanCharts' },
			{ id: 'clean', pattern: '0 0 * * *', name: 'clean' },
			{ id: 'checkExpiredMutings', pattern: '*/5 * * * *', name: 'checkExpiredMutings' },
		]);
	});
});
