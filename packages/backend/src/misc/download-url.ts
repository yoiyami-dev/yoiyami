import * as fs from 'node:fs';
import * as http from 'node:http';
import * as https from 'node:https';
import * as stream from 'node:stream';
import * as util from 'node:util';
import got, * as Got from 'got';
import { getAgentByUrl, StatusError } from './fetch.js';
import config from '@/config/index.js';
import chalk from 'chalk';
import Logger from '@/services/logger.js';
import { assertOutboundUrl } from './outbound-http.js';

const pipeline = util.promisify(stream.pipeline);

function agentsForUrl(url: URL) {
	const httpUrl = new URL(url);
	httpUrl.protocol = 'http:';
	const httpsUrl = new URL(url);
	httpsUrl.protocol = 'https:';
	return { http: getAgentByUrl(httpUrl) as http.Agent, https: getAgentByUrl(httpsUrl) as https.Agent };
}

export async function downloadUrl(url: string, path: string): Promise<void> {
	const target = new URL(url);
	assertOutboundUrl(target, 'public-only', []);
	const logger = new Logger('download');

	logger.info(`Downloading ${chalk.cyan(url)} ...`);

	const timeout = 30 * 1000;
	const operationTimeout = 60 * 1000;
	const maxSize = config.maxFileSize || 262144000;

	const req = got.stream(url, {
		headers: {
			'User-Agent': config.userAgent,
		},
		timeout: {
			lookup: timeout,
			connect: timeout,
			secureConnect: timeout,
			socket: timeout,	// read timeout
			response: timeout,
			send: timeout,
			request: operationTimeout,	// whole operation timeout
		},
		agent: agentsForUrl(target),
		http2: false,	// default
		retry: {
			limit: 0,
		},
		hooks: {
			beforeRedirect: [options => {
				if (!options.url) throw new Error('Redirect URL is missing');
				const redirect = new URL(String(options.url));
				assertOutboundUrl(redirect, 'public-only', []);
				options.agent = agentsForUrl(redirect);
			}],
		},
	}).on('response', (res: Got.Response) => {
		const contentLength = res.headers['content-length'];
		if (contentLength != null) {
			const size = Number(contentLength);
			if (size > maxSize) {
				logger.warn(`maxSize exceeded (${size} > ${maxSize}) on response`);
				req.destroy();
			}
		}
	}).on('downloadProgress', (progress: Got.Progress) => {
		if (progress.transferred > maxSize) {
			logger.warn(`maxSize exceeded (${progress.transferred} > ${maxSize}) on downloadProgress`);
			req.destroy();
		}
	});

	try {
		await pipeline(req, fs.createWriteStream(path));
	} catch (e) {
		if (e instanceof Got.HTTPError) {
			throw new StatusError(`${e.response.statusCode} ${e.response.statusMessage}`, e.response.statusCode, e.response.statusMessage);
		} else {
			throw e;
		}
	}

	logger.succ(`Download finished: ${chalk.cyan(url)}`);
}
