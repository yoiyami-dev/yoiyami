import * as mfm from 'mfm-js';

export function extractMfmNodes<T extends mfm.MfmNode['type']>(nodes: mfm.MfmNode[], type: T): mfm.NodeType<T>[] {
	return mfm.extract(nodes, node => node.type === type) as mfm.NodeType<T>[];
}
