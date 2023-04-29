import * as os from 'node:os';
import * as child_process from 'child_process';
import chalk from 'chalk';
import Logger from '@/services/logger.js';

// TypeORM
import 'reflect-metadata';

const coreLogger = new Logger('core', 'cyan');

// Process Manager
export async function initCore(): Promise<void> {
	greet();
	
	const main = child_process.fork('./built/boot/main/index.js');

	main.on('message', (message) => {
		if (message === 'worker-ready') {
			coreLogger.info('Main process is ready.');
		}
	});
}

function greet() {
	console.log(chalk.green('yoiyami Core process initializing...'));
	// TODO: つくる
}

