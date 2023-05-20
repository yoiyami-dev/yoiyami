import cluster from 'node:cluster';
import { initCore } from './core.js';

// eslint-disable-next-line import/no-default-export
export default async function(): Promise<void> {
	// Core Process Entry Point
	process.title = 'yoiyami-core';

	if (cluster.isPrimary) {
		await initCore();
	}
	// TODO: 増やせるようにするべきかも
}

