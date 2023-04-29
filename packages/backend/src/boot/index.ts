import cluster from 'node:cluster';
import Logger from '@/services/logger.js';
import { initCore } from './core.js';

export default async function() {
	// Core Process Entry Point

	if (cluster.isPrimary) {
		await initCore();
	}
	// TODO: 増やせるようにするべきかも
}
