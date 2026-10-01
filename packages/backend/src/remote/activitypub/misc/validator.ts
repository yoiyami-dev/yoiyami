import type { Response } from 'node-fetch';

const activityStreamsProfile = 'https://www.w3.org/ns/activitystreams';

function parseContentType(response: Response): { type: string, params: Map<string, string> } | null {
	const header = response.headers.get('content-type');
	if (!header) return null;
	const parts: string[] = [];
	let start = 0;
	let quoted = false;
	for (let i = 0; i < header.length; i++) {
		if (quoted && header[i] === '\\') {
			i++;
			continue;
		}
		if (header[i] === '"') quoted = !quoted;
		if (header[i] === ';' && !quoted) {
			parts.push(header.slice(start, i).trim());
			start = i + 1;
		}
	}
	if (quoted) return null;
	parts.push(header.slice(start).trim());
	const type = parts.shift()?.toLowerCase() ?? '';
	if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(type)) return null;
	const params = new Map<string, string>();
	for (const part of parts) {
		const match = /^([a-z0-9!#$&^_.+-]+)\s*=\s*(?:"((?:\\.|[^"\\])*)"|([^\s;"=]+))$/i.exec(part);
		if (!match) return null;
		const name = match[1].toLowerCase();
		if (params.has(name)) return null;
		params.set(name, match[2]?.replace(/\\(.)/g, '$1') ?? match[3]);
	}
	return { type, params };
}

export function validateContentTypeSetAsActivityPub(response: Response): void {
	const parsed = parseContentType(response);
	if (parsed?.type === 'application/activity+json') return;
	if (parsed?.type === 'application/ld+json' && parsed.params.get('profile')?.split(/\s+/).includes(activityStreamsProfile)) return;

	throw new Error('invalid ActivityPub Content-Type');
}

export function validateContentTypeSetAsJsonLD(response: Response): void {
	const type = parseContentType(response)?.type;
	if (type === 'application/json' || /^(?:application|text)\/[a-z0-9!#$&^_.+-]+\+json$/.test(type ?? '')) return;
	throw new Error('invalid JSON-LD Content-Type');
}
