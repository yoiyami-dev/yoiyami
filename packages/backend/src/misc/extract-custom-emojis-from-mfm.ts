import * as mfm from 'mfm-js';
import { unique } from '@/prelude/array.js';
import { extractMfmNodes } from './extract-mfm-nodes.js';

export function extractCustomEmojisFromMfm(nodes: mfm.MfmNode[]): string[] {
	const emojiNodes = extractMfmNodes(nodes, 'emojiCode');

	return unique(emojiNodes.filter(x => x.props.name.length <= 100).map(x => x.props.name));
}
