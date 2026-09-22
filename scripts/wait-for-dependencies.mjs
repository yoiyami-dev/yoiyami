import net from 'node:net';
import config from '../packages/backend/built/config/index.js';

const timeoutValue = process.env.STARTUP_WAIT_TIMEOUT_SECONDS ?? '60';
if (!/^\d+$/.test(timeoutValue)) {
	throw new Error(`STARTUP_WAIT_TIMEOUT_SECONDS must be a non-negative integer, got ${JSON.stringify(timeoutValue)}`);
}

const timeoutMs = Number(timeoutValue) * 1000;
const dependencies = [
	{ name: 'PostgreSQL', host: config.db.host, port: config.db.port },
	{ name: 'Redis', host: config.redis.host, port: config.redis.port },
];

await Promise.all(dependencies.map(dependency => waitForTcp(dependency, timeoutMs)));

async function waitForTcp(dependency, timeout) {
	const deadline = Date.now() + timeout;
	let lastError;
	let attempt = 0;

	for (;;) {
		attempt++;
		try {
			await connect(dependency.host, dependency.port);
			console.log(`[startup] ${dependency.name} is reachable at ${dependency.host}:${dependency.port}`);
			return;
		} catch (error) {
			lastError = error;
		}

		if (Date.now() >= deadline) {
			const reason = lastError instanceof Error ? lastError.message : String(lastError);
			throw new Error(`Timed out waiting for ${dependency.name} at ${dependency.host}:${dependency.port}: ${reason}`);
		}

		if (attempt === 1 || attempt % 10 === 0) {
			console.log(`[startup] Waiting for ${dependency.name} at ${dependency.host}:${dependency.port}`);
		}
		await delay(1000);
	}
}

function connect(host, port) {
	return new Promise((resolve, reject) => {
		const socket = net.createConnection({ host, port });
		let settled = false;

		const finish = (error) => {
			if (settled) return;
			settled = true;
			socket.destroy();
			if (error == null) resolve();
			else reject(error);
		};

		socket.setTimeout(1000);
		socket.once('connect', () => finish());
		socket.once('timeout', () => finish(new Error('connection attempt timed out')));
		socket.once('error', finish);
	});
}

function delay(milliseconds) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}
