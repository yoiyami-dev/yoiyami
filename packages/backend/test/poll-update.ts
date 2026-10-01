import * as assert from 'node:assert';
import { Notes, Polls, Users } from '../src/models/index.js';
import { updateQuestion, InvalidPollUpdateError } from '../src/remote/activitypub/models/question.js';
import update from '../src/remote/activitypub/kernel/update/index.js';
import type Resolver from '../src/remote/activitypub/resolver.js';
import type { CacheableRemoteUser } from '../src/models/entities/user.js';
import type { IObject, IQuestion, IUpdate } from '../src/remote/activitypub/type.js';

const pollUri = 'https://remote.example/notes/poll';
const aliceUri = 'https://remote.example/users/alice';
const malloryUri = 'https://remote.example/users/mallory';
const alice = { uri: aliceUri } as CacheableRemoteUser;
const mallory = { uri: malloryUri } as CacheableRemoteUser;
const original = {
	noteFind: Notes.findOneBy,
	pollFind: Polls.findOneBy,
	userFind: Users.findOneBy,
	pollUpdate: Polls.update,
};

function question(overrides: Record<string, unknown> = {}): IQuestion {
	return {
		id: pollUri,
		type: 'Question',
		attributedTo: aliceUri,
		oneOf: [
			{ name: 'Yes', replies: { totalItems: 10 } },
			{ name: 'No', replies: { totalItems: 2 } },
		],
		...overrides,
	} as IQuestion;
}

describe('ActivityPub Question updates', () => {
	let votes: number[];
	let writes: number;
	let noteOwner: string;
	let resolvedQuestion: IObject | undefined;
	const resolver = { resolve: async (value: string | IObject) => resolvedQuestion ?? value as IObject } as Resolver;

	beforeEach(() => {
		votes = [1, 2];
		writes = 0;
		noteOwner = 'alice';
		resolvedQuestion = undefined;
		(Notes as any).findOneBy = async () => ({ id: 'poll-note', uri: pollUri, userId: noteOwner });
		(Polls as any).findOneBy = async () => ({ noteId: 'poll-note', userId: 'alice', choices: ['Yes', 'No'], votes });
		(Users as any).findOneBy = async () => ({ id: 'alice', uri: aliceUri });
		(Polls as any).update = async (_criteria: unknown, update: { votes: number[] }) => {
			writes++;
			votes = [...update.votes];
		};
	});

	afterEach(() => {
		(Notes as any).findOneBy = original.noteFind;
		(Polls as any).findOneBy = original.pollFind;
		(Users as any).findOneBy = original.userFind;
		(Polls as any).update = original.pollUpdate;
	});

	async function rejectsWithoutWriting(value: IQuestion, actor = alice): Promise<void> {
		await assert.rejects(updateQuestion(value, actor, resolver), InvalidPollUpdateError);
		assert.deepStrictEqual(votes, [1, 2]);
		assert.strictEqual(writes, 0);
	}

	it('updates only a poll owned by the authenticated actor', async () => {
		assert.strictEqual(await updateQuestion(question(), alice, resolver), true);
		assert.deepStrictEqual(votes, [10, 2]);
		assert.strictEqual(writes, 1);
		assert.strictEqual(await updateQuestion(question(), alice, resolver), false);
		assert.strictEqual(writes, 1);
	});

	it('rejects another user on the same host, even with forged or omitted attribution', async () => {
		await rejectsWithoutWriting(question(), mallory);
		await rejectsWithoutWriting(question({ attributedTo: malloryUri }), mallory);
		await rejectsWithoutWriting(question({ attributedTo: undefined }), mallory);
	});

	it('uses the existing owner when attribution is absent', async () => {
		assert.strictEqual(await updateQuestion(question({ attributedTo: undefined }), alice, resolver), true);
		assert.deepStrictEqual(votes, [10, 2]);
	});

	it('accepts nonnegative integer vote counts', async () => {
		for (const count of [0, 1, 10]) {
			assert.strictEqual(await updateQuestion(question({ oneOf: [
				{ name: 'Yes', replies: { totalItems: count } },
				{ name: 'No', replies: { totalItems: 2 } },
			] }), alice, resolver), true);
			assert.deepStrictEqual(votes, [count, 2]);
		}
		assert.strictEqual(writes, 3);
	});

	it('rejects conflicting ownership or Question identity', async () => {
		await rejectsWithoutWriting(question({ attributedTo: malloryUri }));
		await rejectsWithoutWriting(question({ attributedTo: [] }));
		resolvedQuestion = question({ id: 'https://remote.example/notes/other' });
		await rejectsWithoutWriting(question());
		resolvedQuestion = undefined;
		noteOwner = 'mallory';
		await rejectsWithoutWriting(question());
	});

	it('rejects missing and duplicate choices without a partial write', async () => {
		await rejectsWithoutWriting(question({ oneOf: [{ name: 'Yes', replies: { totalItems: 10 } }] }));
		await rejectsWithoutWriting(question({ oneOf: [
			{ name: 'Yes', replies: { totalItems: 10 } },
			{ name: 'Yes', replies: { totalItems: 11 } },
			{ name: 'No', replies: { totalItems: 2 } },
		] }));
	});

	it('updates existing polls with repeated choice labels by occurrence', async () => {
		(Polls as any).findOneBy = async () => ({
			noteId: 'poll-note', userId: 'alice', choices: ['Yes', 'Yes', 'No'], votes: [1, 1, 2],
		});
		assert.strictEqual(await updateQuestion(question({ oneOf: [
			{ name: 'Yes', replies: { totalItems: 10 } },
			{ name: 'Yes', replies: { totalItems: 11 } },
			{ name: 'No', replies: { totalItems: 2 } },
		] }), alice, resolver), true);
		assert.deepStrictEqual(votes, [10, 11, 2]);
		assert.strictEqual(writes, 1);
	});

	it('rejects invalid counts after checking all choices, without a partial write', async () => {
		for (const count of [-1, 1.5, NaN, Infinity, null, undefined, '10']) {
			await rejectsWithoutWriting(question({ oneOf: [
				{ name: 'Yes', replies: { totalItems: 10 } },
				{ name: 'No', replies: { totalItems: count } },
			] }));
		}
	});

	it('rejects a mismatched Update actor before resolving the object', async () => {
		for (const activityActor of [malloryUri, { id: malloryUri, type: 'Person' }, undefined]) {
			const result = await update(alice, {
				type: 'Update',
				actor: activityActor,
				object: question(),
			} as IUpdate);
			assert.strictEqual(result, 'skip: invalid actor');
			assert.strictEqual(writes, 0);
		}
	});

	it('reports a forged poll Update as rejected and leaves votes unchanged', async () => {
		assert.strictEqual(await update(mallory, {
			type: 'Update',
			actor: { id: malloryUri, type: 'Person' },
			object: question({ attributedTo: malloryUri }),
		} as IUpdate), 'skip: Question update rejected');
		assert.deepStrictEqual(votes, [1, 2]);
		assert.strictEqual(writes, 0);
	});
});
