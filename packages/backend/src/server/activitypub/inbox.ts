import * as crypto from 'node:crypto';
import type Router from '@koa/router';
import httpSignature from '@peertube/http-signature';
import type { IActivity } from '@/remote/activitypub/type.js';

type EnqueueInbox = (activity: IActivity, signature: httpSignature.IParsedSignature) => unknown;

export function createInboxHandler(expectedHost: string, enqueue: EnqueueInbox) {
	return (ctx: Router.RouterContext) => {
		let signature: httpSignature.IParsedSignature;
		try {
			// These headers are also required by current upstream before queueing.
			signature = httpSignature.parseRequest(ctx.req, {
				headers: ['(request-target)', 'host', 'date', 'digest'],
				authorizationHeaderName: 'signature',
			});
		} catch {
			ctx.status = 401;
			return;
		}

		if (!signature.params.headers.includes('host') || ctx.req.headers.host !== expectedHost) {
			ctx.status = 401;
			return;
		}

		if (!signature.params.headers.includes('digest')) {
			ctx.status = 401;
			return;
		}

		const digest = ctx.req.headers.digest;
		if (typeof digest !== 'string') {
			ctx.status = 401;
			return;
		}

		const match = /^([a-zA-Z0-9-]+)=([a-zA-Z0-9+/]+={0,2})$/.exec(digest);
		if (match == null || match[1].toUpperCase() !== 'SHA-256') {
			ctx.status = 401;
			return;
		}

		const expectedDigest = Buffer.from(match[2], 'base64');
		if (expectedDigest.length !== 32 || expectedDigest.toString('base64') !== match[2]) {
			ctx.status = 401;
			return;
		}

		const rawBody = ctx.state.rawInboxBody;
		if (!Buffer.isBuffer(rawBody)) {
			ctx.status = 400;
			return;
		}

		const actualDigest = crypto.createHash('sha256').update(rawBody).digest();
		if (!crypto.timingSafeEqual(actualDigest, expectedDigest)) {
			ctx.status = 401;
			return;
		}

		const body = ctx.request.body;
		if (typeof body !== 'object' || body == null || !('actor' in body) || body.actor == null) {
			ctx.status = 400;
			return;
		}

		enqueue(body, signature);
		ctx.status = 202;
	};
}
