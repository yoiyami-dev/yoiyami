import * as assert from 'node:assert';
import { genRsaKeyPair } from '../src/misc/gen-key-pair.js';
import { CONTEXT } from '../src/remote/activitypub/misc/contexts.js';
import { LdSignature } from '../src/remote/activitypub/misc/ld-signature.js';
import { verifyAndCompactLdSignedActivity } from '../src/remote/activitypub/misc/verified-activity.js';
import { renderActivity } from '../src/remote/activitypub/renderer/index.js';
import type { IActivity } from '../src/remote/activitypub/type.js';

const signer = 'https://signer.example/users/alice';
const otherActor = 'https://other.example/users/bob';
const signatureCreator = `${signer}#main-key`;

describe('LD-signed ActivityPub activities', () => {
	it('uses the unchanged renderer vocabulary, including Yoiyami terms', () => {
		const rendered = renderActivity({ id: `${signer}/activities/1`, type: 'Create' });
		assert.deepStrictEqual(rendered?.['@context'], CONTEXT);
		const terms = CONTEXT[2] as Record<string, string>;
		for (const term of ['_misskey_talk', '_misskey_content', '_misskey_quote', '_misskey_reaction', '_misskey_votes', 'isCat']) {
			assert.strictEqual(terms[term], `misskey:${term}`);
		}
	});

	it('verifies the original document and passes a compacted activity onward', async () => {
		const keys = await genRsaKeyPair();
		const jsonLd = new LdSignature();
		const original = {
			'@context': [
				'https://www.w3.org/ns/activitystreams',
				'https://w3id.org/security/v1',
				{ actor: { '@id': 'https://example.org/ns#decoyActor', '@type': '@id' }, signerAlias: { '@id': 'as:actor', '@type': '@id' }, misskey: 'https://misskey-hub.net/ns#', _misskey_talk: 'misskey:_misskey_talk' },
			],
			id: 'https://signer.example/activities/1',
			type: 'Create',
			actor: signer,
			signerAlias: signer,
			object: { id: 'https://signer.example/notes/1', type: 'Note', attributedTo: signer, content: 'hello', _misskey_talk: 'hello' },
		};
		const signed = await jsonLd.signRsaSignature2017(original, keys.privateKey, signatureCreator) as IActivity;
		assert.strictEqual(await jsonLd.verifyRsaSignature2017(signed, keys.publicKey), true);
		assert.strictEqual(signed.actor, signer);

		const compacted = await verifyAndCompactLdSignedActivity(signed, keys.publicKey, signer);
		assert.notStrictEqual(compacted, signed);
		assert.strictEqual(compacted.actor, signer);
		assert.strictEqual(compacted.type, 'Create');
		assert.strictEqual((compacted.object as any)._misskey_talk, 'hello');
		assert.deepStrictEqual(compacted.signature, signed.signature);
		assert.strictEqual(signed.actor, signer);
	});

	it('rejects a valid signature when the semantic actor differs from the raw actor', async () => {
		const keys = await genRsaKeyPair();
		const jsonLd = new LdSignature();
		const original = {
			'@context': [
				'https://www.w3.org/ns/activitystreams',
				'https://w3id.org/security/v1',
				{ actor: { '@id': 'https://example.org/ns#decoyActor', '@type': '@id' }, actualActor: { '@id': 'as:actor', '@type': '@id' } },
			],
			id: 'https://signer.example/activities/2',
			type: 'Create',
			actor: signer,
			actualActor: otherActor,
			object: { id: 'https://signer.example/notes/2', type: 'Note', content: 'hello' },
		};
		const signed = await jsonLd.signRsaSignature2017(original, keys.privateKey, signatureCreator) as IActivity;
		assert.strictEqual(await jsonLd.verifyRsaSignature2017(signed, keys.publicKey), true);
		assert.strictEqual(signed.actor, signer);
		await assert.rejects(verifyAndCompactLdSignedActivity(signed, keys.publicKey, signer), /LD-Signature user.*activity.actor/);
	});

	it('rejects altered signatures without returning the raw activity', async () => {
		const keys = await genRsaKeyPair();
		const jsonLd = new LdSignature();
		const signed = await jsonLd.signRsaSignature2017({
			'@context': CONTEXT,
			id: 'https://signer.example/activities/3',
			type: 'Create',
			actor: signer,
			object: { id: 'https://signer.example/notes/3', type: 'Note', content: 'hello' },
		}, keys.privateKey, signatureCreator) as IActivity;
		signed.object = { id: 'https://signer.example/notes/3', type: 'Note', content: 'changed' };
		await assert.rejects(verifyAndCompactLdSignedActivity(signed, keys.publicKey, signer), /verification failed/);
	});

	it('fails closed if compaction cannot complete after a valid signature', async () => {
		const keys = await genRsaKeyPair();
		const jsonLd = new LdSignature();
		const signed = await jsonLd.signRsaSignature2017({
			'@context': CONTEXT,
			id: 'https://signer.example/activities/4',
			type: 'Create',
			actor: signer,
			object: { id: 'https://signer.example/notes/4', type: 'Note', content: 'hello' },
		}, keys.privateKey, signatureCreator) as IActivity;
		assert.strictEqual(await jsonLd.verifyRsaSignature2017(signed, keys.publicKey), true);

		const compact = LdSignature.prototype.compact;
		LdSignature.prototype.compact = async () => { throw new Error('context unavailable'); };
		try {
			await assert.rejects(verifyAndCompactLdSignedActivity(signed, keys.publicKey, signer), /context unavailable/);
			assert.strictEqual(signed.actor, signer);
			assert.ok(signed.signature);
		} finally {
			LdSignature.prototype.compact = compact;
		}
	});

	it('uses one remote context snapshot for verification and compaction', async () => {
		const keys = await genRsaKeyPair();
		const contextUrl = 'https://contexts.example/actor';
		const originalFetch = (LdSignature.prototype as any).fetchDocument;
		let fetches = 0;
		(LdSignature.prototype as any).fetchDocument = async function (url: string) {
			if (url !== contextUrl) return await originalFetch.call(this, url);
			fetches++;
			return fetches === 1
				? { '@context': { alias: { '@id': 'as:actor', '@type': '@id' } } }
				: { '@context': { actor: { '@id': 'https://example.org/ns#decoyActor', '@type': '@id' } } };
		};
		try {
			const signed = await new LdSignature().signRsaSignature2017({
				'@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1', contextUrl],
				id: 'https://signer.example/activities/5',
				type: 'Create',
				actor: signer,
				object: { id: 'https://signer.example/notes/5', type: 'Note', content: 'hello' },
			}, keys.privateKey, signatureCreator) as IActivity;
			fetches = 0;
			const compacted = await verifyAndCompactLdSignedActivity(signed, keys.publicKey, signer);
			assert.strictEqual(compacted.actor, signer);
			assert.strictEqual(fetches, 1);
		} finally {
			(LdSignature.prototype as any).fetchDocument = originalFetch;
		}
	});
});
