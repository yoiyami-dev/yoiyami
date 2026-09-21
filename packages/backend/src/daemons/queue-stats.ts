import Xev from 'xev';
import { QueueEvents } from 'bullmq';
import { deliverQueue, inboxQueue } from '../queue/queues.js';
import { queuePrefix, redisConnection } from '../queue/connection.js';

const ev = new Xev();

const interval = 10000;

/**
 * Report queue stats regularly
 */
export default function() {
	const log = [] as any[];

	ev.on('requestQueueStatsLog', x => {
		ev.emit(`queueStatsLog:${x.id}`, log.slice(0, x.length || 50));
	});

	let activeDeliverJobs = 0;
	let activeInboxJobs = 0;

	const deliverEvents = new QueueEvents(deliverQueue.name, {
		connection: redisConnection(),
		prefix: queuePrefix,
	});
	const inboxEvents = new QueueEvents(inboxQueue.name, {
		connection: redisConnection(),
		prefix: queuePrefix,
	});

	deliverEvents.on('active', () => {
		activeDeliverJobs++;
	});

	inboxEvents.on('active', () => {
		activeInboxJobs++;
	});

	async function tick() {
		const deliverJobCounts = await deliverQueue.getJobCounts();
		const inboxJobCounts = await inboxQueue.getJobCounts();

		const stats = {
			deliver: {
				activeSincePrevTick: activeDeliverJobs,
				active: deliverJobCounts.active,
				waiting: deliverJobCounts.waiting,
				delayed: deliverJobCounts.delayed,
			},
			inbox: {
				activeSincePrevTick: activeInboxJobs,
				active: inboxJobCounts.active,
				waiting: inboxJobCounts.waiting,
				delayed: inboxJobCounts.delayed,
			},
		};

		ev.emit('queueStats', stats);

		log.unshift(stats);
		if (log.length > 200) log.pop();

		activeDeliverJobs = 0;
		activeInboxJobs = 0;
	}

	tick();

	setInterval(tick, interval);
}
