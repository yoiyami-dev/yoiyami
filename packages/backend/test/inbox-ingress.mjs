import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import httpSignature from '@peertube/http-signature';
import { parseInboxBody } from '../src/server/activitypub/inbox-body.ts';
import { createInboxHandler } from '../src/server/activitypub/inbox.ts';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const actor = 'https://example.com/users/a';
const compact = JSON.stringify({ type: 'Create', actor });
const pretty = JSON.stringify({ type: 'Create', actor }, null, 2);

function requestOptions(overrides = {}) {
	const body = overrides.body ?? compact;
	const digest = overrides.digest === undefined
		? 'SHA-256=' + crypto.createHash('sha256').update(body).digest('base64')
		: overrides.digest;
	const host = overrides.host ?? 'local.test';
	const date = new Date().toUTCString();
	const path = overrides.path ?? '/inbox';
	const signedHeaders = overrides.signedHeaders ?? ['(request-target)', 'host', 'date', 'digest'];
	const values = { '(request-target)': 'post ' + path, host, date, digest };
	const signingString = signedHeaders.map(header => header + ': ' + values[header]).join('\n');
	const signature = crypto.sign('sha256', Buffer.from(signingString), privateKey).toString('base64');
	return {
		body,
		path,
		headers: {
			host,
			date,
			...(digest == null ? {} : { digest }),
			signature: 'keyId="' + actor + '#main-key",algorithm="rsa-sha256",headers="' + signedHeaders.join(' ') + '",signature="' + signature + '"',
		},
	};
}

async function deliver(options, { skipParser = false } = {}) {
	const req = new PassThrough();
	req.method = 'POST';
	req.url = options.path;
	req.headers = options.headers;
	req.end(options.body);
	const queued = [];
	const ctx = { req, request: {}, state: {}, status: 404 };
	const inbox = createInboxHandler('local.test', (body, signature) => queued.push({ body, signature }));
	let continued = false;
	if (skipParser) {
		ctx.request.body = JSON.parse(options.body);
		inbox(ctx);
	} else {
		await parseInboxBody(ctx, async () => {
			continued = true;
			inbox(ctx);
		});
	}
	return { ctx, queued, continued };
}

test('both inbox routes accept a valid signature, host, and digest', async () => {
	for (const path of ['/inbox', '/users/a/inbox']) {
		const { ctx, queued } = await deliver(requestOptions({ path }));
		assert.equal(ctx.status, 202);
		assert.equal(queued.length, 1);
		assert.deepEqual(queued[0].body, JSON.parse(compact));
		assert.equal(httpSignature.verifySignature(queued[0].signature, publicKey.export({ type: 'spki', format: 'pem' })), true);
	}
});

test('digest is calculated from received bytes, including JSON whitespace', async () => {
	const compactResult = await deliver(requestOptions({ body: compact }));
	const prettyResult = await deliver(requestOptions({ body: pretty }));
	assert.equal(compactResult.ctx.status, 202);
	assert.equal(prettyResult.ctx.status, 202);
	assert.deepEqual(compactResult.queued[0].body, prettyResult.queued[0].body);
	const compactDigest = requestOptions({ body: compact }).headers.digest;
	const mismatch = await deliver(requestOptions({ body: pretty, digest: compactDigest }));
	assert.equal(mismatch.ctx.status, 401);
	assert.equal(mismatch.queued.length, 0);
});

for (const [name, changes, status] of [
	['missing Digest', { digest: null }, 401],
	['unsigned Digest', { signedHeaders: ['(request-target)', 'host', 'date'] }, 401],
	['malformed Digest', { digest: 'SHA-256=not base64!' }, 401],
	['unsupported Digest algorithm', { digest: 'SHA-512=YWJj' }, 401],
	['body and Digest mismatch', { digest: 'SHA-256=' + crypto.createHash('sha256').update('other').digest('base64') }, 401],
	['unsigned Host', { signedHeaders: ['(request-target)', 'date', 'digest'] }, 401],
	['wrong destination Host', { host: 'elsewhere.test' }, 401],
	['missing date signature', { signedHeaders: ['(request-target)', 'host', 'digest'] }, 401],
	['malformed JSON', { body: '{"actor":' }, 400],
	['actorless Activity', { body: '{"type":"Create"}' }, 400],
]) {
	test(name + ' is rejected before queueing', async () => {
		const { ctx, queued } = await deliver(requestOptions(changes));
		assert.equal(ctx.status, status);
		assert.equal(queued.length, 0);
	});
}

test('missing raw body fails closed after parsed body is present', async () => {
	const { ctx, queued } = await deliver(requestOptions(), { skipParser: true });
	assert.equal(ctx.status, 400);
	assert.equal(queued.length, 0);
});

test('parsing failure does not call the inbox handler', async () => {
	const { ctx, queued, continued } = await deliver(requestOptions({ body: '{"actor":' }));
	assert.equal(ctx.status, 400);
	assert.equal(continued, false);
	assert.equal(queued.length, 0);
});

test('malformed Signature is rejected before queueing', async () => {
	const options = requestOptions();
	options.headers.signature = 'broken';
	const { ctx, queued } = await deliver(options);
	assert.equal(ctx.status, 401);
	assert.equal(queued.length, 0);
});

test('inbox body size limit stops parsing before queueing', async () => {
	const options = requestOptions({ body: JSON.stringify({ actor, padding: 'x'.repeat(1024 * 1024) }) });
	const { ctx, queued, continued } = await deliver(options);
	assert.equal(ctx.status, 413);
	assert.equal(continued, false);
	assert.equal(queued.length, 0);
});
