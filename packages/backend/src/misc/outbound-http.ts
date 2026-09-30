import * as dns from 'node:dns';
import * as http from 'node:http';
import * as https from 'node:https';
import { isIP } from 'node:net';
import type { Duplex } from 'node:stream';
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent';
import { isBlockedOutboundAddress, isIpInCidr, parseCidr, type ParsedCidr } from './ip.js';

export type OutboundPolicy = 'public-only' | 'allow-configured-private';
export type ResolvedAddress = { address: string, family: number };
export type ResolveAddresses = (hostname: string) => Promise<ResolvedAddress[]>;

export function policyForOutboundHop(original: URL, current: URL, policy: OutboundPolicy): OutboundPolicy {
	return policy === 'allow-configured-private' && current.origin !== original.origin ? 'public-only' : policy;
}

function hostnameOf(url: URL): string {
	return url.hostname.replace(/^\[/, '').replace(/\]$/, '');
}

export function assertOutboundUrl(url: URL, policy: OutboundPolicy, networks: ParsedCidr[]): void {
	if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(`Unsupported outbound URL scheme: ${url.protocol}`);
	const hostname = hostnameOf(url);
	if (!hostname) throw new Error('Outbound URL has no hostname');
	if (isIP(hostname)) assertAddress(hostname, policy, networks);
}

function assertAddress(address: string, policy: OutboundPolicy, networks: ParsedCidr[]): void {
	if (!isBlockedOutboundAddress(address)) return;
	if (policy === 'allow-configured-private' && networks.some(network => isIpInCidr(address, network))) return;
	throw new Error(`Blocked outbound address: ${address}`);
}

export function createOutboundAgents(options: {
	policy: OutboundPolicy,
	allowedPrivateNetworks?: string[],
	proxy?: string,
	resolve?: ResolveAddresses,
	maxSockets?: number,
	privateHostnames?: string[],
	allowPrivateSubdomains?: boolean,
}): { http: http.Agent, https: https.Agent } {
	const networks = (options.allowedPrivateNetworks ?? []).map(parseCidr);
	const resolve = options.resolve ?? (hostname => dns.promises.lookup(hostname, { all: true }));
	const policyForHost = (hostname: string): OutboundPolicy => {
		const host = hostname.replace(/^\[/, '').replace(/\]$/, '');
		return options.policy === 'allow-configured-private' && options.privateHostnames &&
			!options.privateHostnames.some(allowed => host === allowed || (options.allowPrivateSubdomains && !isIP(allowed) && host.endsWith(`.${allowed}`)))
			? 'public-only' : options.policy;
	};
	const choose = async (hostname: string): Promise<ResolvedAddress> => {
		const literal = hostname.replace(/^\[/, '').replace(/\]$/, '');
		const addresses = isIP(literal)
			? [{ address: literal, family: isIP(literal) }]
			: await resolve(literal);
		if (addresses.length === 0) throw new Error(`No addresses for ${hostname}`);
		// Reject mixed DNS answers too: a later selection must never reach a blocked IP.
		const policy = policyForHost(literal);
		for (const address of addresses) assertAddress(address.address, policy, networks);
		return addresses[0];
	};
	const lookup = ((hostname: string, lookupOptions: { all?: boolean }, callback: (error: NodeJS.ErrnoException | null, address?: string | ResolvedAddress[], family?: number) => void) => {
		void choose(hostname).then(address => {
			if (lookupOptions.all) callback(null, [address]);
			else callback(null, address.address, address.family);
		}, error => callback(error as NodeJS.ErrnoException));
	}) as NonNullable<http.AgentOptions['lookup']>;
	const common = { keepAlive: true, keepAliveMsecs: 30_000, maxSockets: options.maxSockets ?? 256, maxFreeSockets: 256, scheduling: 'lifo' as const };
	if (!options.proxy) {
		class GuardedHttpAgent extends http.Agent {
			createConnection(connectionOptions: http.ClientRequestArgs, callback?: (error: Error | null, socket: Duplex) => void): Duplex | null | undefined {
				const host = String(connectionOptions.hostname ?? connectionOptions.host ?? '');
				try {
					if (isIP(host)) assertAddress(host, policyForHost(host), networks);
				} catch (error) {
					process.nextTick(() => callback?.(error as Error, undefined as unknown as Duplex));
					return undefined;
				}
				return super.createConnection(connectionOptions, callback);
			}
		}
		class GuardedHttpsAgent extends https.Agent {
			createConnection(connectionOptions: https.RequestOptions, callback?: (error: Error | null, socket: Duplex) => void): Duplex | null | undefined {
				const host = String(connectionOptions.hostname ?? connectionOptions.host ?? '');
				try {
					if (isIP(host)) assertAddress(host, policyForHost(host), networks);
				} catch (error) {
					process.nextTick(() => callback?.(error as Error, undefined as unknown as Duplex));
					return undefined;
				}
				return super.createConnection(connectionOptions, callback);
			}
		}
		return {
			http: new GuardedHttpAgent({ ...common, lookup }),
			https: new GuardedHttpsAgent({ ...common, lookup }),
		};
	}
	class PinnedHttpProxyAgent extends HttpProxyAgent {
		createConnection(connectionOptions: http.ClientRequestArgs, callback?: (error: Error | null, socket: Duplex) => void): undefined {
			void choose(String(connectionOptions.host)).then(destination => {
				const host = destination.family === 6 ? `[${destination.address}]` : destination.address;
				super.createConnection({ ...connectionOptions, host }, callback);
			}, error => callback?.(error, undefined as unknown as Duplex));
			return undefined;
		}
	}
	class PinnedHttpsProxyAgent extends HttpsProxyAgent {
		createConnection(connectionOptions: https.RequestOptions, callback?: (error: Error | null, socket: Duplex) => void): undefined {
			const originalHost = String(connectionOptions.host);
			void choose(originalHost).then(destination => {
				const host = destination.family === 6 ? `[${destination.address}]` : destination.address;
				const servername = connectionOptions.servername ?? (isIP(originalHost) ? undefined : originalHost);
				super.createConnection({ ...connectionOptions, host, servername }, callback);
			}, error => callback?.(error, undefined as unknown as Duplex));
			return undefined;
		}
	}
	return {
		http: new PinnedHttpProxyAgent({ ...common, proxy: options.proxy }),
		https: new PinnedHttpsProxyAgent({ ...common, proxy: options.proxy }),
	};
}

export function parseAllowedPrivateNetworks(values: string[] | undefined): ParsedCidr[] {
	return (values ?? []).map(parseCidr);
}
