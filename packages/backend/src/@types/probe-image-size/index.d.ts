declare module 'probe-image-size' {
	import { ReadStream } from 'node:fs';

	function probeImageSize(src: string | ReadStream, options?: probeImageSize.ProbeOptions): Promise<probeImageSize.ProbeResult>;
	function probeImageSize(src: string | ReadStream, callback: (error: Error | null, result?: probeImageSize.ProbeResult) => void): void;
	function probeImageSize(src: string | ReadStream, options: probeImageSize.ProbeOptions, callback: (error: Error | null, result?: probeImageSize.ProbeResult) => void): void;

	namespace probeImageSize {
		export type ProbeOptions = {
			retries?: number;
			timeout?: number;
		};

		export type ProbeResult = {
			width: number;
			height: number;
			length?: number;
			type: string;
			mime: string;
			wUnits: 'in' | 'mm' | 'cm' | 'pt' | 'pc' | 'px' | 'em' | 'ex';
			hUnits: 'in' | 'mm' | 'cm' | 'pt' | 'pc' | 'px' | 'em' | 'ex';
			orientation?: number;
			url?: string;
		};
	}

	export = probeImageSize;
}
