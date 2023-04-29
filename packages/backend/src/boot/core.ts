import * as os from 'node:os';
import * as child_process from 'child_process';
import chalk from 'chalk';
import Logger from '@/services/logger.js';
import { envOption } from '../env.js';
import { initDb } from '@/db/postgre.js';
import Xev from 'xev';

// TypeORM
import 'reflect-metadata';

const ev = new Xev();

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

	ev.mount();

}

function greet() {
	console.log(chalk.green('yoiyami Core process initializing...'));
	// TODO: つくる
}

// Dying away...
process.on('exit', code => {
	coreLogger.info(`The process is going to exit with code ${code}`);
});


