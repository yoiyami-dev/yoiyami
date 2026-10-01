import * as assert from 'node:assert';
import { Headers, type Response } from 'node-fetch';
import { assertActivityMatchesUrls, FetchAllowSoftFailMask as Mask } from '../src/remote/activitypub/misc/check-against-url.js';
import { parseActivityResponse } from '../src/remote/activitypub/fetch.js';
import { validateContentTypeSetAsActivityPub, validateContentTypeSetAsJsonLD } from '../src/remote/activitypub/misc/validator.js';

const id = 'https://example.com/users/alice';
const object = (value: unknown = id) => ({ type: 'Person', id: value as string });

function response(url: string, contentType: string | null, body: unknown = object()): Response {
	const headers = new Headers(contentType == null ? {} : { 'content-type': contentType });
	return { url, headers, json: async () => body } as unknown as Response;
}

describe('ActivityPub response validation', () => {
	it('accepts only ActivityStreams media types for objects', () => {
		for (const type of [
			'application/activity+json',
			'application/activity+json; charset=utf-8',
			'application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
		]) assert.doesNotThrow(() => validateContentTypeSetAsActivityPub(response(id, type)));
		for (const type of [null, 'application/json', 'application/ld+json', 'text/html', 'text/plain', 'application/activity+json-malicious', 'application/ld+json; note="; profile=https://www.w3.org/ns/activitystreams"', 'application/ld+json; note="escaped \\"; profile=https://www.w3.org/ns/activitystreams"']) {
			assert.throws(() => validateContentTypeSetAsActivityPub(response(id, type)));
		}
	});

	it('allows JSON-LD document media types separately', () => {
		for (const type of ['application/ld+json', 'application/json', 'application/example+json', 'text/example+json']) {
			assert.doesNotThrow(() => validateContentTypeSetAsJsonLD(response(id, type)));
		}
		for (const type of [null, 'text/html', 'image/png', 'application/json-malicious']) {
			assert.throws(() => validateContentTypeSetAsJsonLD(response(id, type)));
		}
	});

	it('rejects invalid media type, missing id and mismatched final URL before returning a body', async () => {
		await assert.rejects(parseActivityResponse(id, response(id, 'application/json')));
		await assert.rejects(parseActivityResponse(id, response(id, 'application/activity+json', { type: 'Person' })));
		await assert.rejects(parseActivityResponse(id, response('https://evil.example/object', 'application/activity+json')));
		assert.deepStrictEqual(await parseActivityResponse(id, response(id, 'application/activity+json')), object());
	});
});

describe('ActivityPub URL identity', () => {
	const check = (request: string, final: string, activityId: unknown, mask = Mask.Strict) =>
		assertActivityMatchesUrls(request, { type: 'Person', id: activityId as string }, [final], mask);

	it('accepts canonical URLs and the www synonym', () => {
		assert.doesNotThrow(() => check(id, id, id));
		assert.doesNotThrow(() => check('https://www.example.com/users/alice', id, id));
		assert.doesNotThrow(() => check('https://EXAMPLE.com/users/alice', id, id));
	});

	it('allows a same-origin alias only with NonCanonicalId', () => {
		const alias = 'https://example.com/@alice';
		assert.throws(() => check(alias, id, id));
		assert.doesNotThrow(() => check(alias, id, id, Mask.NonCanonicalId));
		assert.throws(() => check(alias, alias, id));
		assert.doesNotThrow(() => check(alias, alias, id, Mask.NonCanonicalId));
	});

	it('allows third-party lookup only with CrossOrigin', () => {
		const lookup = 'https://lookup.example/@alice';
		assert.throws(() => check(lookup, id, id));
		assert.throws(() => check(lookup, id, id, Mask.NonCanonicalId));
		assert.doesNotThrow(() => check(lookup, id, id, Mask.CrossOrigin));
	});

	it('never accepts a response claiming another authority', () => {
		for (const final of [
			'https://evil.example/object',
			'https://example.com:8443/users/alice',
			'https://sub.example.com/users/alice',
			'http://example.com/users/alice',
		]) assert.throws(() => check(final, final, id, Mask.Any));
	});

	it('never accepts HTTPS downgrade, including relaxed lookup', () => {
		assert.throws(() => check(id, 'http://example.com/users/alice', 'http://example.com/users/alice', Mask.Any));
	});

	it('requires an absolute HTTP(S) id and rejects malformed identity state', () => {
		for (const badId of [undefined, null, 42, '/users/alice', 'javascript:alert(1)', 'https://user@example.com/users/alice', `${id}#fragment`]) {
			assert.throws(() => check(id, id, badId, Mask.Any));
		}
		assert.throws(() => assertActivityMatchesUrls(id, object(), []));
	});
});
