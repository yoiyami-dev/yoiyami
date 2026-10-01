import { CacheableRemoteUser } from '@/models/entities/user.js';
import { getApId, getApType, IUpdate, isActor } from '../../type.js';
import { apLogger } from '../../logger.js';
import { InvalidPollUpdateError, updateQuestion } from '../../models/question.js';
import Resolver from '../../resolver.js';
import { updatePerson } from '../../models/person.js';

/**
 * Updateアクティビティを捌きます
 */
export default async (actor: CacheableRemoteUser, activity: IUpdate): Promise<string> => {
	let activityActor: string;
	try {
		activityActor = getApId(activity.actor);
	} catch {
		return 'skip: invalid actor';
	}
	if (actor.uri !== activityActor) {
		return 'skip: invalid actor';
	}

	apLogger.debug('Update');

	const resolver = new Resolver();

	const object = await resolver.resolve(activity.object).catch(e => {
		apLogger.error(`Resolution failed: ${e}`);
		throw e;
	});

	if (isActor(object)) {
		await updatePerson(actor.uri!, resolver, object);
		return 'ok: Person updated';
	} else if (getApType(object) === 'Question') {
		try {
			const changed = await updateQuestion(object, actor, resolver);
			return changed ? 'ok: Question updated' : 'ok: Question unchanged';
		} catch (e) {
			if (!(e instanceof InvalidPollUpdateError)) throw e;
			apLogger.warn(`Question update rejected: ${e.message}`);
			return 'skip: Question update rejected';
		}
	} else {
		return `skip: Unknown type: ${getApType(object)}`;
	}
};
