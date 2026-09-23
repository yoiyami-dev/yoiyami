declare module 'color-convert' {
	const convertColor: {
		keyword: {
			rgb(color: string): [number, number, number];
		};
	};

	export default convertColor;
}

declare module 'content-disposition' {
	namespace contentDisposition {
		interface Options {
			type?: string;
			fallback?: string | boolean;
		}
	}

	function contentDisposition(filename?: string, options?: contentDisposition.Options): string;

	export = contentDisposition;
}

declare module 'opentype.js' {
	export interface Font {
		readonly [key: string]: unknown;
	}
}

declare module 'pg' {
	interface Types {
		setTypeParser(oid: number, parser: (value: string) => unknown): void;
	}

	const pg: {
		types: Types;
	};

	export default pg;
}

declare module 'redis-lock' {
	type Unlock = () => void;
	type LockCallback = (unlock: Unlock) => void;
	type Lock = (lockName: string, timeout: number, callback: LockCallback) => void;

	function redisLock(client: unknown, retryDelay?: number): Lock;

	export default redisLock;
}

declare module 'twemoji-parser/dist/lib/regex.js' {
	const twemojiRegex: {
		readonly default: RegExp;
	};

	export default twemojiRegex;
}
