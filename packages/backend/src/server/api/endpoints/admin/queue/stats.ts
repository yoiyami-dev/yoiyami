import { deliverQueue, inboxQueue, dbQueue, objectStorageQueue } from '@/queue/queues.js';
import define from '../../../define.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			deliver: {
				optional: false, nullable: false,
				ref: 'QueueCount',
			},
			inbox: {
				optional: false, nullable: false,
				ref: 'QueueCount',
			},
			db: {
				optional: false, nullable: false,
				ref: 'QueueCount',
			},
			objectStorage: {
				optional: false, nullable: false,
				ref: 'QueueCount',
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

const getQueueCounts = async (queue: { getJobCounts: () => Promise<Record<string, number>> }) => {
	const counts = await queue.getJobCounts();
	return {
		waiting: counts.waiting,
		active: counts.active,
		completed: counts.completed,
		failed: counts.failed,
		delayed: counts.delayed,
	};
};

// eslint-disable-next-line import/no-default-export
export default define(meta, paramDef, async (ps) => {
	const deliverJobCounts = await getQueueCounts(deliverQueue);
	const inboxJobCounts = await getQueueCounts(inboxQueue);
	const dbJobCounts = await getQueueCounts(dbQueue);
	const objectStorageJobCounts = await getQueueCounts(objectStorageQueue);

	return {
		deliver: deliverJobCounts,
		inbox: inboxJobCounts,
		db: dbJobCounts,
		objectStorage: objectStorageJobCounts,
	};
});
