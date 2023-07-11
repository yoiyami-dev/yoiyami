import * as fs from 'node:fs';
import * as os from 'node:os';
import * as child_process from 'child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import chalk from 'chalk';
import Logger from '@/services/logger.js';
import loadConfig from '@/config/load.js';
import { Config } from '@/config/types';
import { initDb, db } from '@/db/postgre.js';

// TypeORM
import 'reflect-metadata';

const bootupLogger = new Logger('boot', 'cyan');
const exitLogger = new Logger('exit', 'red');

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

let config!: Config;

export type servers = 'main' | 'v12c';

//うまく取得する方法がまだわからないので暫定でpackage.jsonから直接取得しちゃってる（起動中に編集されたらたぶんこわれる）
// 古いのから一旦そのまま持ってきているので、このへんのロジックは大きく変わるかも
const package_json = JSON.parse(fs.readFileSync(`${_dirname}/../../../../package.json`, 'utf-8'));

//TODO: ちゃんとconfigチェックしてないのでなんとかする

// Process Manager
export async function initCore(): Promise<void> {
	try {
		greet();
		envInfo();
		await versionInfo();
		config = loadConfigFile();
	}
	catch (e) {
		bootupLogger.error('!Core process startup Failure!', null, true);
	}

	// start Processes

	let main;
	let v12c;

	// この先使う可能性があって変数に入れてるのでとりあえず黙らせておく
	try {
		const processes = startChiledProcess();
		if (processes instanceof Array) { //警告が出るので明示的にinstanceofでチェック(そもそも引数がなかったら配列以外帰ってこないけど)
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			main = processes[0];
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			v12c = processes[1];
		}
	}
	catch (e) {
		bootupLogger.error('!Child process startup Failure!', null, true);
	}

	// TODO: リスナ設置していろいろしたい
}

function startChiledProcess(target?: servers): child_process.ChildProcess | child_process.ChildProcess[] {
	if (target) { //targetが指定されてるときはプロセスが死亡した場合なのでそれだけ起動したい
		if (target === 'main') {
			return setExitListener(child_process.fork('./built/boot/main/index.js'), 'main');
		}
		// まだ増やすかもしれないのでno-unnecessary-conditionはひねり潰しておく
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		else if (target === 'v12c') {
			return setExitListener(child_process.fork('./built/boot/v12c/index.js'), 'v12c');
		}
		else {
			throw new Error('Invalid target');
		}
	}
	else {
		return [
			setExitListener(child_process.fork('./built/boot/main/index.js'), 'main'),
			setExitListener(child_process.fork('./built/boot/v12c/index.js'), 'v12c'),
		];
	}
}

function setExitListener(target: child_process.ChildProcess, server_name: servers): child_process.ChildProcess {
	target.on('exit', code => {
		if (code === 0 && config.recover_on_normal_exit === false) {
			exitLogger.info(`${server_name}-Primary process exited normally`);
		}
		else {
			exitLogger.error(`${server_name}-Primary process died: ${code}`);
			exitLogger.info(`${server_name}-Primary restarting...`);
			startChiledProcess(server_name);
		}
	});
	return target;
}

function greet(): void {
	console.log(chalk.green('yoiyami Core process initializing...'));

	console.log(chalk.hex('#FF80C0')('   :::   :::       ::::::::       :::::::::::    :::   :::           :::          :::   :::       :::::::::::'));
	console.log(chalk.hex('#FF80C0')('  :+:   :+:      :+:    :+:          :+:        :+:   :+:         :+: :+:       :+:+: :+:+:          :+:'));
	console.log(chalk.hex('#FF80C0')('  +:+ +:+       +:+    +:+          +:+         +:+ +:+         +:+   +:+     +:+ +:+:+ +:+         +:+'));
	console.log(chalk.hex('#FF80C0')('  +#++:        +#+    +:+          +#+          +#++:         +#++:++#++:    +#+  +:+  +#+         +#+'));
	console.log(chalk.hex('#FF80C0')('  +#+         +#+    +#+          +#+           +#+          +#+     +#+    +#+       +#+         +#+'));
	console.log(chalk.hex('#FF80C0')(' #+#         #+#    #+#          #+#           #+#          #+#     #+#    #+#       #+#         #+#'));
	console.log(chalk.hex('#FF80C0')('###          ########       ###########       ###          ###     ###    ###       ###     ###########'));
	// Greet design by @cat@kokuzei.cyou
	// TODO: つくる
}

async function versionInfo(): Promise<void> {
	const versionLogger = bootupLogger.createSubLogger('ver', 'pink');
	
	versionLogger.info('Version Information:');

	versionLogger.info(`  yoiyami: ${package_json.version}`);
	versionLogger.info(`  based on: Misskey ${package_json.based_version}`);
	versionLogger.info(`  Node.js: ${process.version}`);
	versionLogger.info('  Database: Connecting...');
	process.stdout.write('\x1b[1F'); //1行上の行頭にカーソル移すやつ（書き変えたいので
	const dbVersion = await getDbVersion();
	versionLogger.info(`  Database: PostgreSQL ${dbVersion}`);
}

function envInfo(): void {
	// 環境情報出すやつ
	const envLogger = bootupLogger.createSubLogger('env', 'yellow');

	envLogger.info('Environment Information:');
	envLogger.info(`  OS: ${os.type()} ${os.release()} ${os.arch()}`);
	envLogger.info(`  CPU: ${os.cpus()[0].model} x ${os.cpus().length}`);
	envLogger.info(`  Memory: ${Math.round(os.freemem() / 1024 / 1024 )}/${Math.round(os.totalmem() / 1024 / 1024 )}MB`);
	envLogger.info(`  Platform: ${process.platform}`);
	envLogger.debug(`  PID: ${process.pid}`);
	envLogger.debug(`  PWD: ${process.cwd()}`);
	envLogger.debug(`  ExecPath: ${process.execPath}`);
}

async function getDbVersion(): Promise<string> {
	try {
		await initDb();
		const v = await db.query('SHOW server_version').then(x => x[0].server_version);
		return v;
	} catch (e) {
		if (e instanceof Error || typeof e === 'string') {
			bootupLogger.error('Database connection failed...', null, true);
			bootupLogger.error(e);
			process.exit(1);
		}
		else {
			throw e;
		}
	}
}

function loadConfigFile(): Config {
	const configLogger = bootupLogger.createSubLogger('conf', 'green');
	try {
		config = loadConfig();
	} catch (exception) {
		if (typeof exception === 'string') {
			configLogger.error(exception);
			process.exit(1);
		}
		// if (exception.code === 'ENOENT') { // TODO: ちゃんとハンドリングする
		// configLogger.error('Configuration file not found', null, true);
		// process.exit(1);
		// }
		configLogger.error('A problem occurred while loading the configuration file.', null, true);
		if (exception instanceof Error) { //debug
			configLogger.error(exception.message); 
		}
		throw exception;
	}
		
	//TODO: ハードコーディングやめる、もちょっとちゃんと分岐する
	if (config.configTemplateVersion < '0.2.0') {
		configLogger.warn('Configuration file is old. Please update it.');
		configLogger.debug('Configuration file version: ' + config.configTemplateVersion);
	}
	else {
		configLogger.succ('Configuration file loaded.(version: ' + config.configTemplateVersion + ')');
	}

	return config;
}

// Dying away...
process.on('exit', code => {
	exitLogger.info(`The process is going to exit with code ${code}`);
});
