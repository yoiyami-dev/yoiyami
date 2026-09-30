import { URL } from 'node:url';
import fetch from 'node-fetch';
import config from '@/config/index.js';
import { assertOutboundUrl, createOutboundAgents, parseAllowedPrivateNetworks, policyForOutboundHop, type OutboundPolicy } from './outbound-http.js';

export async function getJson<T = unknown>(url: string, accept = 'application/json, */*', timeout = 10000, headers?: Record<string, string>, policy: OutboundPolicy = 'public-only'): Promise<T> {
	const res = await getResponse({
		url,
		method: 'GET',
		headers: Object.assign({
			'User-Agent': config.userAgent,
			Accept: accept,
		}, headers || {}),
		timeout,
		policy,
	});

	return await res.json() as T;
}

export async function getHtml(url: string, accept = 'text/html, */*', timeout = 10000, headers?: Record<string, string>) {
	const res = await getResponse({
		url,
		method: 'GET',
		headers: Object.assign({
			'User-Agent': config.userAgent,
			Accept: accept,
		}, headers || {}),
		timeout,
	});

	return await res.text();
}

export async function getResponse(args: { url: string, method: string, body?: string, headers: Record<string, string>, timeout?: number, size?: number, policy?: OutboundPolicy }) {
	const timeout = args.timeout || 10 * 1000;
	const policy = args.policy ?? 'public-only';
	const original = new URL(args.url);
	assertOutboundUrl(original, policy, allowedNetworks);

	const controller = new AbortController();
	setTimeout(() => {
		controller.abort();
	}, timeout * 6);

	const res = await fetch(args.url, {
		method: args.method,
		headers: args.headers,
		body: args.body,
		size: args.size || 10 * 1024 * 1024,
		agent: url => getAgentByUrl(url, false, policyForOutboundHop(original, url, policy)),
		signal: controller.signal,
	});

	if (!res.ok) {
		throw new StatusError(`${res.status} ${res.statusText}`, res.status, res.statusText);
	}

	return res;
}

const allowedNetworks = parseAllowedPrivateNetworks(config.allowedPrivateNetworks);
const maxSockets = Math.max(256, config.deliverJobConcurrency || 128);
const publicDirect = createOutboundAgents({ policy: 'public-only', maxSockets });
const publicProxied = config.proxy ? createOutboundAgents({ policy: 'public-only', proxy: config.proxy, maxSockets }) : publicDirect;
const configuredAgents = new Map<string, ReturnType<typeof createOutboundAgents>>();

/**
 * Get agent by URL
 * @param url URL
 * @param bypassProxy Allways bypass proxy
 */
export function getAgentByUrl(url: URL, bypassProxy = false, policy: OutboundPolicy = 'public-only', allowPrivateSubdomains = false) {
	assertOutboundUrl(url, policy, allowedNetworks);
	const direct = bypassProxy || (config.proxyBypassHosts || []).includes(url.hostname);
	let agents;
	if (policy === 'public-only') {
		agents = direct ? publicDirect : publicProxied;
	} else {
		const key = `${direct ? 'direct' : 'proxy'}:${url.hostname}:${allowPrivateSubdomains}`;
		agents = configuredAgents.get(key);
		if (!agents) {
			agents = createOutboundAgents({
				policy,
				allowedPrivateNetworks: config.allowedPrivateNetworks,
				privateHostnames: [url.hostname.replace(/^\[/, '').replace(/\]$/, '')],
				allowPrivateSubdomains,
				proxy: direct ? undefined : config.proxy,
				maxSockets,
			});
			configuredAgents.set(key, agents);
		}
	}
	return url.protocol === 'http:' ? agents.http : agents.https;
}

export class StatusError extends Error {
	public statusCode: number;
	public statusMessage?: string;
	public isClientError: boolean;

	constructor(message: string, statusCode: number, statusMessage?: string) {
		super(message);
		this.name = 'StatusError';
		this.statusCode = statusCode;
		this.statusMessage = statusMessage;
		this.isClientError = typeof this.statusCode === 'number' && this.statusCode >= 400 && this.statusCode < 500;
	}
}
