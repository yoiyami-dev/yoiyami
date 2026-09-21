declare module 'unzipper' {
	import { Writable } from 'node:stream';

	const unzipper: {
		Extract(options: { path: string }): Writable;
	};

	export default unzipper;
}
