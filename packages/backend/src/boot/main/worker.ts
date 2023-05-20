import cluster from 'node:cluster';
import { initDb } from '@/db/postgre.js';

export async function initWorker(): Promise<void> {
	await initDb();

	await import('../../servers/main/index.js').then(x => x.default());

	import('../../queue/index.js').then(x => x.default());
	// await server();
	// initQueue();

	if (cluster.isWorker) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		process.send!('worker-ready');
	}
}
