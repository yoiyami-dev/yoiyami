import { createRequire } from 'node:module';
import Koa from 'koa';
import config from '@/config/index.js';
import { fetchMeta } from '@/misc/fetch-meta.js';

const manifest = createRequire(import.meta.url)('./manifest.json');

export const manifestHandler = async (ctx: Koa.Context) => {
	// TODO
	//const res = structuredClone(manifest);
	const res = JSON.parse(JSON.stringify(manifest));

	const instance = await fetchMeta(true);

	res.short_name = instance.name || config.softwareName;
	res.name = instance.name || config.softwareName;
	if (instance.themeColor) res.theme_color = instance.themeColor;

	ctx.set('Cache-Control', 'max-age=300');
	ctx.body = res;
};
