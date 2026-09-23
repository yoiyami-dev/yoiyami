import * as mfm from 'mfm-js';
import { unique } from '@/prelude/array.js';
import { extractMfmNodes } from './extract-mfm-nodes.js';

export function extractHashtags(nodes: mfm.MfmNode[]): string[] {
	const hashtagNodes = extractMfmNodes(nodes, 'hashtag');
	const hashtags = unique(hashtagNodes.map(x => x.props.hashtag));

	return hashtags;
}
