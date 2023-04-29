import * as os from 'node:os';
import cluster from 'node:cluster';

import Logger from '@/services/logger.js';
import loadConfig from '@/config/load.js';
import { Config } from '@/config/types';
import { envOption } from '../../env.js';
import { db, initDb } from '../../db/postgre.js';
import boot from '../index.js';

const logger = new Logger('main', 'purple');
const bootLogger = logger.createSubLogger('boot', 'orange', false);

export async function initPrimary() {
	let config!: Config;

	try {
		bootLogger.info('Booting...');
		config = loadConfigBoot();
		await connectDb();
	}
	catch (e) {
		bootLogger.error('Cannot boot', null, true);
		bootLogger.error(e);
		process.exit(1);
	}

	bootLogger.succ('Check point 1 passed');
 
	// Greetとかはここのプロセスを起動する前(Core)でやっているので、
	// そもそもクラスタリング無効ときここを呼び出す必要がない
	spawnWorkers(config.clusterLimit);
}

async function connectDb(): Promise<void> {
	const dbLogger = bootLogger.createSubLogger('db');

	// Try to connect to DB
	try {
		dbLogger.info('Connecting...');
		await initDb();
		const v = await db.query('SHOW server_version').then(x => x[0].server_version);
		dbLogger.succ(`Connected: v${v}`);
	} catch (e) {
		dbLogger.error('Cannot connect', null, true);
		dbLogger.error(e);
		process.exit(1);
	}
}

function loadConfigBoot(): Config {
	const configLogger = bootLogger.createSubLogger('config');
	let config;

	try {
		config = loadConfig();
	} catch (exception) {
		if (typeof exception === 'string') {
			configLogger.error(exception);
			process.exit(1);
		}
		if (exception.code === 'ENOENT') {
			configLogger.error('Configuration file not found', null, true);
			process.exit(1);
		}
		throw exception;
	}

	configLogger.succ('Loaded');

	return config;
}

async function spawnWorkers(limit: number = 1) {
	const workers = Math.min(limit, os.cpus().length);
	bootLogger.info(`Starting ${workers} worker${workers === 1 ? '' : 's'}...`);
	await Promise.all([...Array(workers)].map(spawnWorker));
	bootLogger.succ('All workers started');
}

function spawnWorker(): Promise<void> {
	return new Promise(res => {
		const worker = cluster.fork();
		worker.on('message', message => {
			if (message === 'listenFailed') {
				bootLogger.error(`The server Listen failed due to the previous error.`);
				process.exit(1);
			}
			if (message !== 'ready') return;
			res();
		});
	});
}
