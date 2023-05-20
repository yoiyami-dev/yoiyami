import cluster from 'node:cluster';
import { initDb } from '@/db/postgre.js';
// import server from '@/server/index.js';
// import initQueue from '@/queue/index.js';

export async function initWorker() {
	await initDb();

	await import('../../servers/v12c/index.js').then(x => x.default());

	import('../../queue/index.js').then(x => x.default());
	// await server();
	// initQueue();

	if (cluster.isWorker) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		process.send!('worker-ready');
	}
}
