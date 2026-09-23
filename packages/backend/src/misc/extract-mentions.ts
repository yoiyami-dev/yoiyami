// test is located in test/extract-mentions

import * as mfm from 'mfm-js';
import { extractMfmNodes } from './extract-mfm-nodes.js';

export function extractMentions(nodes: mfm.MfmNode[]): mfm.MfmMention['props'][] {
	// TODO: 重複を削除
	const mentionNodes = extractMfmNodes(nodes, 'mention');
	const mentions = mentionNodes.map(x => x.props);

	return mentions;
}
