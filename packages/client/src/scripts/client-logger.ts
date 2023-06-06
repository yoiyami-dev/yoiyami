// yoiyami client logger (v1)
//
// How to use:
// import * as clientLogger from '@/scripts/client-logger';
// clientLogger.info('Hello, world!');
// clientLogger.info('Hello, world!', 'my-tag');
//
// 型セーフじゃないので、基本的にはデバッグ用途で使うことを想定しています, 型によって動作を振り分けているけど...
// 第二引数にタグを指定すると、そのタグがついて出力されます（ファイル名とか書くとお得かも）
// （（自動で取得したかったけどあんまりうまくいかなそうだったので...））
import { defaultStore } from '@/store';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

//Objectを出力したいこともあるし、stringを出力したいこともあるし、そもそもデバッグ用で型セーフじゃなくてもよさそうなのでany
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function warn(obj: any, tag?: string): void {
	if (defaultStore.state.debugMode) {
		outLog('warn', obj, tag);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function error(obj: any, tag?: string): void {
	if (defaultStore.state.debugMode) {
		outLog('error', obj, tag);
	}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function info(obj: any, tag?: string): void {
	if (defaultStore.state.debugMode) {
		outLog('info', obj, tag);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debug(obj: any, tag?: string): void {
	if (defaultStore.state.debugMode) {
		outLog('debug', obj, tag);
	}
}

//logger
function outLog(level: LogLevel, obj: any, tag?: string): void {
	let log = '';

	if (typeof obj === 'string') { //string
		log = `${level.toUpperCase()}`;
		if (tag) {
			log += ` [${tag}]`;
		}
		log += ` ${obj}`;
	}
	else if (typeof obj === 'object') { //object
		log = `${level.toUpperCase()}`;
		if (tag) {
			log += ` [${tag}]`;
		}
		log += ` ${JSON.stringify(obj)}`; //Stringfyしないほうがいい場合あるかも→任意オプションとして追加するかも？
	}
	else { //other: それ以外はとりあえずそのまま出力しようとしてみる（これでこわれるものはそもそも普通に出してもこわれるので）
		log = `${level.toUpperCase()}`;
		if (tag) {
			log += ` [${tag}]`;
		}
		log += ` ${obj}`;
	}

	console.log(log);
}
