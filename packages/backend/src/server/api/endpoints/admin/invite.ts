import { secureRndstr } from '@/misc/secure-rndstr.js';
import define from '../../define.js';
import { RegistrationTickets } from '@/models/index.js';
import { genId } from '@/misc/gen-id.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			code: {
				type: 'string',
				optional: false, nullable: false,
				example: '2ERUA5VR',
				maxLength: 8,
				minLength: 8,
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, paramDef, async () => {
	// Rejection-sample over the unambiguous alphabet [2-9A-HJ-NP-Z] (32 chars).
	// `secureRndstr` draws uniformly from 36 lowercase chars; map base-36
	// digits 0-31 to the alphabet so each code remains 40-bit and uniform.
	const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
	let code = '';
	for (let i = 0; i < 8; i++) {
		let r: number;
		do {
			r = parseInt(secureRndstr(1, false), 36);
		} while (r >= 32);
		code += ALPHABET[r];
	}

	await RegistrationTickets.insert({
		id: genId(),
		createdAt: new Date(),
		code,
	});

	return {
		code,
	};
});
