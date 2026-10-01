import type { IActivity } from '../type.js';
import { getApId } from '../type.js';
import { LdSignature } from './ld-signature.js';

/** Interpret only the meaning covered by the original LD Signature. */
export async function verifyAndCompactLdSignedActivity(
	activity: IActivity,
	publicKey: string,
	expectedActor: string,
): Promise<IActivity> {
	const signature = activity.signature;
	if (signature == null) throw new Error('missing LD-Signature');

	const jsonLd = new LdSignature();
	const verified = await jsonLd.verifyRsaSignature2017(activity, publicKey).catch(() => false);
	if (!verified) throw new Error('LD-Signature verification failed');

	const unsignedActivity = { ...activity };
	delete unsignedActivity.signature;
	const compacted = await jsonLd.compact(unsignedActivity) as unknown as IActivity;
	if (compacted == null || typeof compacted !== 'object' || Array.isArray(compacted)) {
		throw new Error('invalid compacted LD-signed activity');
	}

	let actor: string;
	try {
		actor = getApId(compacted.actor);
	} catch {
		throw new Error('invalid compacted activity.actor');
	}
	if (actor !== expectedActor) {
		throw new Error(`LD-Signature user(${expectedActor}) !== activity.actor(${actor})`);
	}

	compacted.signature = signature;
	return compacted;
}
