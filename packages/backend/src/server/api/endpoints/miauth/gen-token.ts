import define from '../../define.js';
import { ApiError } from '../../error.js';
import { AccessTokens } from '@/models/index.js';
import { genId } from '@/misc/gen-id.js';
import { secureRndstr } from '@/misc/secure-rndstr.js';

export const meta = {
	tags: ['auth'],

	requireCredential: true,

	secure: true,

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			token: {
				type: 'string',
				optional: false, nullable: false,
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		session: { type: 'string', nullable: true },
		name: { type: 'string', nullable: true },
		description: { type: 'string', nullable: true },
		iconUrl: { type: 'string', nullable: true },
		permission: { type: 'array', uniqueItems: true, items: {
			type: 'string',
		} },
	},
	required: ['session', 'permission'],
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, paramDef, async (ps, user) => {
	// iconUrl のスキームを検証し、javascript:等によるXSSを防止する (GHSA-cc6r-chgr-8r5m)
	if (ps.iconUrl != null) {
		let u: URL;
		try {
			u = new URL(ps.iconUrl);
		} catch (e) {
			throw new ApiError({ message: 'invalid iconUrl', code: 'INVALID_ICON_URL', id: 'b1e0e3ad-64d2-4f8e-b8c0-3f6e2a2c9e51' });
		}
		if (!['http:', 'https:'].includes(u.protocol)) {
			throw new ApiError({ message: 'invalid iconUrl', code: 'INVALID_ICON_URL', id: 'b1e0e3ad-64d2-4f8e-b8c0-3f6e2a2c9e51' });
		}
	}

	// Generate access token
	const accessToken = secureRndstr(32, true);

	const now = new Date();

	// Insert access token doc
	await AccessTokens.insert({
		id: genId(),
		createdAt: now,
		lastUsedAt: now,
		session: ps.session,
		userId: user.id,
		token: accessToken,
		hash: accessToken,
		name: ps.name,
		description: ps.description,
		iconUrl: ps.iconUrl,
		permission: ps.permission,
	});

	return {
		token: accessToken,
	};
});
