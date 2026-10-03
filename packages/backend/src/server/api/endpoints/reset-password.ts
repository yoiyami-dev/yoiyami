import bcrypt from 'bcryptjs';
import ms from 'ms';
import { publishInternalEvent } from '@/services/stream.js';
import generateUserToken from '../common/generate-native-user-token.js';
import { Users, UserProfiles, PasswordResetRequests } from '@/models/index.js';
import define from '../define.js';
import { ApiError } from '../error.js';

export const meta = {
	tags: ['reset password'],

	requireCredential: false,

	description: 'Complete the password reset that was previously requested.',

	limit: {
		// Prevents token probing/brute force (keyed by IP while
		// unauthenticated). Own bucket so legitimate request+complete
		// sequences are not squeezed by the shared limit.
		duration: ms('1hour'),
		max: 10,
		minInterval: 1000,
		key: 'reset-password',
	},

	errors: {
		noSuchToken: {
			message: 'No such token.',
			code: 'NO_SUCH_TOKEN',
			id: '3e0e3d34-8b47-4b7e-b38d-61d2f0b76d94',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		token: { type: 'string' },
		password: { type: 'string' },
	},
	required: ['token', 'password'],
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, paramDef, async (ps, user) => {
	const req = await PasswordResetRequests.findOneBy({
		token: ps.token,
	});

	// 発行してから30分以上経過していたら無効
	if (req == null || Date.now() - req.createdAt.getTime() > 1000 * 60 * 30) {
		// Delete the (expired) row so the token cannot be replayed, then
		// return a clean client error instead of an unhandled 500.
		if (req != null) PasswordResetRequests.delete(req.id);
		throw new ApiError(meta.errors.noSuchToken);
	}

	// Generate hash of password
	const salt = await bcrypt.genSalt(8);
	const hash = await bcrypt.hash(ps.password, salt);

	await UserProfiles.update(req.userId, {
		password: hash,
	});

	// Invalidate the existing user key so sessions bound to the old token
	// stop working once the password was reset through a possibly-compromised
	// channel (mirrors i/regenerate-token.ts cache invalidation).
	const target = await Users.findOneByOrFail({ id: req.userId });
	const oldToken = target.token;
	const newToken = generateUserToken();
	await Users.update(req.userId, { token: newToken });
	publishInternalEvent('userTokenRegenerated', { id: req.userId, oldToken, newToken });

	PasswordResetRequests.delete(req.id);
});
