import config from '@/config/index.js';
import { Blocking } from '@/models/entities/blocking.js';

/**
 * Renders a block into its ActivityPub representation.
 *
 * @param block The block to be rendered. The blockee relation must be loaded.
 */
export function renderBlock(block: Blocking) {
	if (block.blockee?.uri == null) {
		throw new Error('renderBlock: missing blockee uri');
	}

	return {
		type: 'Block',
		id: `${config.main.url}/blocks/${block.id}`,
		actor: `${config.main.url}/users/${block.blockerId}`,
		object: block.blockee.uri,
	};
}
