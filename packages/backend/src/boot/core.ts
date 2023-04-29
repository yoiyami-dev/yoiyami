import * as os from 'node:os';
import * as child_process from 'child_process';
import chalk from 'chalk';
import Logger from '@/services/logger.js';
import { envOption } from '../env.js';
import { initDb } from '@/db/postgre.js';

// TypeORM
import 'reflect-metadata';

const coreLogger = new Logger('core', 'cyan');

// Process Manager
export async function initCore(): Promise<void> {

	greet();
	initDb();

	const main = child_process.fork('./built/boot/main/index.js');

	main.on('message', (message) => {
		if (message === 'worker-ready') {
			coreLogger.info('Main process is ready.');
		}
	});

	console.log(process.title);

	if (!envOption.noDaemons) {
		import('../daemons/server-stats.js').then(x => x.default());
		import('../daemons/queue-stats.js').then(x => x.default());
		import('../daemons/janitor.js').then(x => x.default());
	}
}

function greet() {
	console.log(chalk.green('yoiyami Core process initializing...'));
	// TODO: つくる
}

// Dying away...
process.on('exit', code => {
	coreLogger.info(`The process is going to exit with code ${code}`);
});


