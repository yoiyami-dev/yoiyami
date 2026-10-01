import config from '@/config/index.js';
import { Notes, Polls, Users } from '@/models/index.js';
import { IPoll } from '@/models/entities/poll.js';
import { CacheableRemoteUser } from '@/models/entities/user.js';
import Resolver from '../resolver.js';
import { IObject, IQuestion, getOneApId, isQuestion } from '../type.js';
import { apLogger } from '../logger.js';

export async function extractPollFromQuestion(source: string | IObject, resolver?: Resolver): Promise<IPoll> {
	if (resolver == null) resolver = new Resolver();

	const question = await resolver.resolve(source);

	if (!isQuestion(question)) {
		throw new Error('invalid type');
	}

	const multiple = !question.oneOf;
	const expiresAt = question.endTime ? new Date(question.endTime) : question.closed ? new Date(question.closed) : null;

	if (multiple && !question.anyOf) {
		throw new Error('invalid question');
	}

	const choices = question[multiple ? 'anyOf' : 'oneOf']!
		.map((x, i) => x.name!);

	const votes = question[multiple ? 'anyOf' : 'oneOf']!
		.map((x, i) => x.replies && x.replies.totalItems || x._misskey_votes || 0);

	return {
		choices,
		votes,
		multiple,
		expiresAt,
	};
}

/**
 * Update votes of Question
 * @param value AP Question object or its URI
 * @param actor Authenticated remote actor requesting the update
 * @returns true if updated
 */
export async function updateQuestion(value: string | IObject, actor: CacheableRemoteUser, resolver?: Resolver): Promise<boolean> {
	const uri = typeof value === 'string' ? value : value?.id;
	if (typeof uri !== 'string') throw new InvalidPollUpdateError('Question has no valid id');

	// URIがこのサーバーを指しているならスキップ
	if (uri.startsWith(config.url + '/')) throw new InvalidPollUpdateError('uri points local');

	//#region このサーバーに既に登録されているか
	const note = await Notes.findOneBy({ uri });
	if (note == null) throw new InvalidPollUpdateError('Question is not registered');

	const poll = await Polls.findOneBy({ noteId: note.id });
	if (poll == null) throw new InvalidPollUpdateError('Question is not registered');
	if (poll.userId !== note.userId) throw new InvalidPollUpdateError('Poll owner mismatch');

	const owner = await Users.findOneBy({ id: poll.userId });
	if (owner?.uri == null) throw new InvalidPollUpdateError('Poll owner has no remote URI');
	//#endregion

	// resolve new Question object
	if (resolver == null) resolver = new Resolver();
	const question = await resolver.resolve(value) as IQuestion;
	apLogger.debug(`fetched question: ${JSON.stringify(question, null, 2)}`);

	if (question.type !== 'Question') throw new InvalidPollUpdateError('object is not a Question');
	if (question.id !== uri) throw new InvalidPollUpdateError('Question id mismatch');

	let attribution = owner.uri;
	if (question.attributedTo != null) {
		try {
			attribution = getOneApId(question.attributedTo);
		} catch {
			throw new InvalidPollUpdateError('Question has invalid attributedTo');
		}
	}
	if (attribution !== owner.uri || actor.uri !== owner.uri) {
		throw new InvalidPollUpdateError('Refusing to ingest update for poll by different user');
	}

	const apChoices = question.oneOf || question.anyOf;
	if (!Array.isArray(apChoices)) throw new InvalidPollUpdateError('Question has no choices');

	const newVotes = poll.choices.map((choice, index) => {
		const matches = apChoices.filter(ap => ap?.name === choice);
		const occurrences = poll.choices.filter(name => name === choice).length;
		if (matches.length !== occurrences) throw new InvalidPollUpdateError(`invalid choice: ${choice}`);
		const occurrence = poll.choices.slice(0, index).filter(name => name === choice).length;
		const count = matches[occurrence].replies?.totalItems;
		if (!Number.isInteger(count) || count == null || count < 0) {
			throw new InvalidPollUpdateError(`invalid vote count: ${count}`);
		}
		return count;
	});
	const changed = newVotes.some((count, index) => count !== poll.votes[index]);
	if (!changed) return false;

	await Polls.update({ noteId: note.id }, {
		votes: newVotes,
	});

	return changed;
}

export class InvalidPollUpdateError extends Error {}
