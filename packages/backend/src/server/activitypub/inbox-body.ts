import type Router from '@koa/router';

const MAX_INBOX_BODY_SIZE = 1024 * 1024; // koa-json-body's previous default
const strictJson = /^[\x20\x09\x0a\x0d]*(\[|\{)/;

/** Keep the received bytes alongside the usual parsed request body for inboxes only. */
export async function parseInboxBody(ctx: Router.RouterContext, next: () => Promise<unknown>) {
	if (ctx.req.headers['content-encoding'] && ctx.req.headers['content-encoding'] !== 'identity') {
		ctx.status = 415;
		return;
	}

	const chunks: Buffer[] = [];
	let length = 0;
	try {
		for await (const chunk of ctx.req) {
			const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
			length += bytes.length;
			if (length > MAX_INBOX_BODY_SIZE) {
				ctx.status = 413;
				return;
			}
			chunks.push(bytes);
		}
	} catch {
		ctx.status = 400;
		return;
	}

	const rawBody = Buffer.concat(chunks, length);
	const text = rawBody.toString('utf8');
	try {
		// Match koa-json-body's strict JSON default, including an empty object for an empty body.
		if (text !== '' && !strictJson.test(text)) throw new Error('invalid JSON');
		ctx.request.body = text === '' ? {} : JSON.parse(text);
	} catch {
		ctx.status = 400;
		return;
	}
	ctx.state.rawInboxBody = rawBody;
	await next();
}
