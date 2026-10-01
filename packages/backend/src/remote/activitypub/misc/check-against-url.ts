import type { IObject } from '../type.js';

export enum FetchAllowSoftFailMask {
	Strict = 0,
	NonCanonicalId = 1 << 0,
	MisalignedOrigin = 1 << 1,
	CrossOrigin = (1 << 2) | MisalignedOrigin,
	Any = ~0,
}

function parseIdentityUrl(value: string): URL {
	const url = new URL(value);
	if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) {
		throw new Error('invalid ActivityPub identity URL');
	}
	return url;
}

function synonymousUrl(url: URL): URL {
	const normalized = new URL(url);
	if (normalized.hostname.startsWith('www.')) normalized.hostname = normalized.hostname.slice(4);
	return normalized;
}

export function assertActivityMatchesUrls(
	requestUrl: string,
	activity: IObject,
	candidateUrls: string[],
	allowSoftfail: FetchAllowSoftFailMask = FetchAllowSoftFailMask.Strict,
): void {
	if (activity == null || typeof activity !== 'object' || typeof activity.id !== 'string') {
		throw new Error('ActivityPub object has no id');
	}
	if (candidateUrls.length === 0) throw new Error('ActivityPub response has no final URL');

	const requested = synonymousUrl(parseIdentityUrl(requestUrl));
	const id = synonymousUrl(parseIdentityUrl(activity.id));
	for (const candidate of candidateUrls) {
		const final = synonymousUrl(parseIdentityUrl(candidate));
		if (requested.protocol === 'https:' && final.protocol !== 'https:') {
			throw new Error('ActivityPub fetch downgraded HTTPS');
		}
		// The responding authority must own the claimed ID, even for manual lookup.
		if (final.protocol !== id.protocol || final.host !== id.host) {
			throw new Error('ActivityPub response and id have different origins');
		}
		if (final.href !== id.href && !(allowSoftfail & FetchAllowSoftFailMask.NonCanonicalId)) {
			throw new Error('ActivityPub response URL is not the object id');
		}
		if (requested.origin !== final.origin &&
			(allowSoftfail & FetchAllowSoftFailMask.CrossOrigin) !== FetchAllowSoftFailMask.CrossOrigin) {
			throw new Error('ActivityPub fetch crossed origins');
		}
		if (requested.href !== id.href && requested.origin === final.origin &&
			!(allowSoftfail & FetchAllowSoftFailMask.NonCanonicalId)) {
			throw new Error('ActivityPub request URL is not canonical');
		}
	}
}
