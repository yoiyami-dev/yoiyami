import define from '../../define.js';
import Resolver from '@/remote/activitypub/resolver.js';
import { parseUri } from '@/remote/activitypub/db-resolver.js';
import { Notes } from '@/models/index.js';
import { ApiError } from '../../error.js';
import ms from 'ms';

export const meta = {
	tags: ['federation'],

	requireCredential: true,

	limit: {
		duration: ms('1hour'),
		max: 30,
	},

	errors: {
		noSuchObject: {
			message: 'No such object.',
			code: 'NO_SUCH_OBJECT',
			id: '1f0e9e34-8c5d-4a52-987c-53f8f4a834d6',
		},
	},

	res: {
		type: 'object',
		optional: false, nullable: false,
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		uri: { type: 'string' },
	},
	required: ['uri'],
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, paramDef, async (ps, me) => {
	// The AP resolver renders local objects straight from the database,
	// bypassing the per-note visibility masking used by normal Note packing.
	// Enforce visibility for local notes (including /notes/:id/activity) and
	// polls (which embed the note text and vote counts) before resolving, so
	// an authenticated user cannot fetch another user's specified (DM) or
	// otherwise private notes.
	const parsed = parseUri(ps.uri);
	if (parsed.local && (parsed.type === 'notes' || parsed.type === 'questions')) {
		const note = await Notes.findOneBy({ id: parsed.id });
		if (note == null || !(await Notes.isVisibleForMe(note, me.id))) {
			throw new ApiError(meta.errors.noSuchObject);
		}
	}

	const resolver = new Resolver();
	const object = await resolver.resolve(ps.uri);
	return object;
});
