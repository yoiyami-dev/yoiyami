import Koa from 'koa';
import { fetchMeta } from '@/misc/fetch-meta.js';
import Logger from '@/services/logger.js';
import config from '@/config/index.js';
import { query } from '@/prelude/url.js';
import { getJson } from '@/misc/fetch.js';

const logger = new Logger('url-preview');

type UrlPreviewSummary = {
	title: string;
	icon?: string | null;
	thumbnail?: string | null;
	[key: string]: unknown;
};

export const urlPreviewHandler = async (ctx: Koa.Context) => {
	const url = ctx.query.url;
	if (typeof url !== 'string') {
		ctx.status = 400;
		return;
	}

	const lang = ctx.query.lang;
	if (Array.isArray(lang)) {
		ctx.status = 400;
		return;
	}

	const meta = await fetchMeta();
	if (!meta.summalyProxy) {
		ctx.status = 503;
		ctx.body = '{}';
		return;
	}

	logger.info(`(Proxy) Getting preview of ${url}@${lang} ...`);

	try {
		const summary = await getJson<UrlPreviewSummary>(`${meta.summalyProxy}?${query({
			url: url,
			lang: lang ?? 'ja-JP',
		})}`);

		logger.succ(`Got preview of ${url}: ${summary.title}`);

		summary.icon = wrap(summary.icon);
		summary.thumbnail = wrap(summary.thumbnail);

		// Cache 7days
		ctx.set('Cache-Control', 'max-age=604800, immutable');

		ctx.body = summary;
	} catch (err) {
		logger.warn(`Failed to get preview of ${url}: ${err}`);
		ctx.status = 200;
		ctx.set('Cache-Control', 'max-age=86400, immutable');
		ctx.body = '{}';
	}
};

function wrap(url?: string | null): string | null {
	return url != null
		? url.match(/^https?:\/\//)
			? `${config.url}/proxy/preview.webp?${query({
				url,
				preview: '1',
			})}`
			: url
		: null;
}
