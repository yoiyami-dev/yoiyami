import * as fs from 'node:fs';
import * as os from 'node:os';
import * as child_process from 'child_process';
import chalk from 'chalk';
import Logger from '@/services/logger.js';
import loadConfig from '@/config/load.js';
import { envOption } from '../env.js';
import { initDb, db } from '@/db/postgre.js';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { Config } from '@/config/types';

// TypeORM
import 'reflect-metadata';
import { ChildEntity } from 'typeorm';

const bootupLogger = new Logger('boot', 'cyan');
const exitLogger = new Logger('exit', 'red');

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

let config!: Config;

export type servers = 'main' | 'v12c';

//うまく取得する方法がまだわからないので暫定でpackage.jsonから直接取得しちゃってる（起動中に編集されたらたぶんこわれる）
// 古いのから一旦そのまま持ってきているので、このへんのロジックは大きく変わるかも
const package_json = JSON.parse(fs.readFileSync(`${_dirname}/../../../../package.json`, 'utf-8'));

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

	try {
		const processes = startChiledProcess();
		if (processes instanceof Array) { //警告が出るので明示的にinstanceofでチェック(そもそも引数がなかったら配列以外帰ってこないけど)
			main = processes[0];
			v12c = processes[1];
		}
	}
	catch (e) {
		bootupLogger.error('!Child process startup Failure!', null, true);
	}

	// クラスタリング無効だとハングしたときPrimaryが死ぬので（監視して復活させたいけどforkじゃないので死んだあと監視を再開させるのがむずかしそう
	// Listen
	main?.on('exit', code => {
		exitLogger.error(`Main-primary process died: ${code}`);
		process.exit(1);
	});
	v12c?.on('exit', code => {
		exitLogger.error(`v12c-primary process died: ${code}`);
		process.exit(1);
	});
}

function startChiledProcess(target?: servers): child_process.ChildProcess | child_process.ChildProcess[] {
	if (target) { //targetが指定されてるときはプロセスが死亡した場合なのでそれだけ起動したい
		if (target === 'main') {
			return child_process.fork('./built/boot/main/index.js');
		}
		// まだ増やすかもしれないのでno-unnecessary-conditionはひねり潰しておく
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		else if (target === 'v12c') {
			return child_process.fork('./built/boot/v12c/index.js');
		}
		else {
			throw new Error('Invalid target');
		}
	}
	else {
		return [
			child_process.fork('./built/boot/main/index.js'),
			child_process.fork('./built/boot/v12c/index.js'),
		];
	}
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
		bootupLogger.error('Database connection failed...', null, true);
		bootupLogger.error(e);
		process.exit(1);
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
		if (exception.code === 'ENOENT') {
			configLogger.error('Configuration file not found', null, true);
			process.exit(1);
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
