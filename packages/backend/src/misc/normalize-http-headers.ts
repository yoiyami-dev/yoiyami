import type { IncomingHttpHeaders } from 'node:http';

/**
 * Convert Node's request headers into a JSON-safe object for the signin log.
 * Undefined values are not meaningful in the persisted JSONB document.
 */
export function normalizeHttpHeaders(headers: IncomingHttpHeaders): Record<string, any> {
	return Object.fromEntries(Object.entries(headers).filter(([, value]) => value !== undefined));
}
