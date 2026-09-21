import * as http from 'node:http';
import { WebSocketServer } from 'ws';

import MainStreamConnection from './stream/index.js';
import authenticate from './authenticate.js';
import { EventEmitter } from 'node:events';
import { subsdcriber as redisClient } from '../../db/redis.js';
import { Users } from '@/models/index.js';

export const initializeStreamingServer = (server: http.Server) => {
	const ws = new WebSocketServer({ server });

	ws.on('connection', async (connection, request) => {
		const url = new URL(request.url ?? '/', 'http://localhost');
		const token = url.searchParams.get('i');

		// TODO: トークンが間違ってるなどしてauthenticateに失敗したら
		// コネクション切断するなりエラーメッセージ返すなりする
		// (現状はエラーがキャッチされておらずサーバーのログに流れて邪魔なので)
		const [user, app] = await authenticate(token);

		if (user?.isSuspended) {
			connection.close(1008, 'suspended');
			return;
		}

		const ev = new EventEmitter();

		async function onRedisMessage(_: string, data: string) {
			const parsed = JSON.parse(data);
			ev.emit(parsed.channel, parsed.message);
		}

		redisClient.on('message', onRedisMessage);

		const main = new MainStreamConnection(connection, ev, user, app);

		const intervalId = user ? setInterval(() => {
			Users.update(user.id, {
				lastActiveDate: new Date(),
			});
		}, 1000 * 60 * 5) : null;
		if (user) {
			Users.update(user.id, {
				lastActiveDate: new Date(),
			});
		}

		connection.once('close', () => {
			ev.removeAllListeners();
			main.dispose();
			redisClient.off('message', onRedisMessage);
			if (intervalId) clearInterval(intervalId);
		});

		connection.on('message', data => {
			if (data.toString() === 'ping') connection.send('pong');
		});
	});
};
