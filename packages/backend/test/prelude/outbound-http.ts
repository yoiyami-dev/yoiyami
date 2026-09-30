import * as assert from 'node:assert';
import * as http from 'node:http';
import fetch from 'node-fetch';
import got from 'got';
import { createOutboundAgents, assertOutboundUrl, policyForOutboundHop } from '../../src/misc/outbound-http.js';
import { parseCidr } from '../../src/misc/ip.js';

async function server(host: string, handler: http.RequestListener) {
	const instance = http.createServer(handler);
	await new Promise<void>(resolve => instance.listen(0, host, resolve));
	const address = instance.address();
	if (!address || typeof address === 'string') throw new Error('No test port');
	return { instance, port: address.port };
}

async function close(instance: http.Server): Promise<void> {
	await new Promise<void>((resolve, reject) => instance.close(error => error ? reject(error) : resolve()));
}

describe('outbound HTTP connection policy', () => {
	it('rejects literal, mapped, and DNS-resolved loopback before any HTTP request', async () => {
		let requests = 0;
		const target = await server('127.0.0.1', (_request, response) => { requests++; response.end('unexpected'); });
		const agents = createOutboundAgents({ policy: 'public-only', resolve: async () => [{ address: '127.0.0.1', family: 4 }] });
		try {
			for (const host of ['127.0.0.1', '[::ffff:127.0.0.1]', '[::ffff:7f00:1]', '2130706433', '0x7f000001', '127.0.0.1.', 'test.invalid']) {
				const url = new URL(`http://${host}:${target.port}/`);
				await assert.rejects(fetch(url.toString(), { agent: () => {
					assertOutboundUrl(url, 'public-only', []);
					return agents.http;
				} }));
			}
			await assert.rejects(got(`http://test.invalid:${target.port}/`, { agent: agents, retry: { limit: 0 } }));
			await assert.rejects(got(`http://[::ffff:127.0.0.1]:${target.port}/`, { agent: agents, retry: { limit: 0 } }));
			assert.strictEqual(requests, 0);
		} finally {
			await close(target.instance);
		}
	});

	it('validates each redirect and preserves an explicit private allowance', async () => {
		let blockedRequests = 0;
		const blocked = await server('127.0.0.1', (_request, response) => { blockedRequests++; response.end('unexpected'); });
		const allowed = await server('127.0.0.2', (request, response) => {
			if (request.url === '/redirect') {
				response.writeHead(302, { Location: `http://127.0.0.1:${blocked.port}/` });
				response.end();
			} else response.end('ok');
		});
		const original = new URL(`http://127.0.0.2:${allowed.port}/`);
		const networks = [parseCidr('127.0.0.2/32'), parseCidr('127.0.0.1/32')];
		const agents = createOutboundAgents({ policy: 'allow-configured-private', allowedPrivateNetworks: ['127.0.0.2/32', '127.0.0.1/32'], privateHostnames: ['127.0.0.2'] });
		const select = (url: URL) => {
			assertOutboundUrl(url, policyForOutboundHop(original, url, 'allow-configured-private'), networks);
			return agents.http;
		};
		try {
			const response = await fetch(`http://127.0.0.2:${allowed.port}/`, { agent: select });
			assert.strictEqual(await response.text(), 'ok');
			await assert.rejects(fetch(`http://127.0.0.2:${allowed.port}/redirect`, { agent: select }));
			assert.strictEqual((await got(`http://127.0.0.2:${allowed.port}/`, { agent: agents })).body, 'ok');
			await assert.rejects(got(`http://127.0.0.2:${allowed.port}/redirect`, { agent: agents, retry: { limit: 0 } }));
			assert.strictEqual(blockedRequests, 0);
		} finally {
			await close(allowed.instance);
			await close(blocked.instance);
		}
	});

	it('keeps fetch and download entry points on the public-only policy', async () => {
		const previousPassword = process.env.DATABASE_PASSWORD;
		process.env.DATABASE_PASSWORD = 'test';
		const { getResponse } = await import('../../src/misc/fetch.js');
		const { downloadUrl } = await import('../../src/misc/download-url.js');
		let requests = 0;
		const target = await server('127.0.0.1', (_request, response) => { requests++; response.end('unexpected'); });
		try {
			await assert.rejects(getResponse({ url: `http://127.0.0.1:${target.port}/`, method: 'GET', headers: {} }));
			await assert.rejects(getResponse({ url: `http://127.0.0.1:${target.port}/`, method: 'POST', headers: {}, body: '{}' }));
			await assert.rejects(downloadUrl(`http://127.0.0.1:${target.port}/`, '/tmp/yoiyami-blocked-download'));
			assert.strictEqual(requests, 0);
		} finally {
			await close(target.instance);
			if (previousPassword === undefined) delete process.env.DATABASE_PASSWORD;
			else process.env.DATABASE_PASSWORD = previousPassword;
		}
	});

	it('validates before proxy CONNECT and pins CONNECT to the checked IP', async () => {
		const connectTargets: string[] = [];
		const proxy = await server('127.0.0.1', (_request, response) => response.end('unexpected'));
		proxy.instance.on('connect', (request, socket) => {
			connectTargets.push(request.url ?? '');
			socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
		});
		try {
			const blocked = createOutboundAgents({ policy: 'public-only', proxy: `http://127.0.0.1:${proxy.port}`, resolve: async () => [{ address: '127.0.0.1', family: 4 }] });
			await assert.rejects(fetch('http://test.invalid/', { agent: () => blocked.http }));
			assert.deepStrictEqual(connectTargets, []);

			const allowed = createOutboundAgents({ policy: 'allow-configured-private', allowedPrivateNetworks: ['127.0.0.2/32'], proxy: `http://127.0.0.1:${proxy.port}`, resolve: async () => [{ address: '127.0.0.2', family: 4 }] });
			await assert.rejects(fetch('http://test.invalid:1234/', { agent: () => allowed.http }));
			assert.deepStrictEqual(connectTargets, ['127.0.0.2:1234']);
		} finally {
			await close(proxy.instance);
		}
	});

	it('rejects unsupported URL schemes before requesting', () => {
		assert.throws(() => assertOutboundUrl(new URL('file:///etc/passwd'), 'public-only', []), /scheme/);
		assert.strictEqual(policyForOutboundHop(new URL('https://admin.example/'), new URL('http://127.0.0.1/'), 'allow-configured-private'), 'public-only');
	});
});
