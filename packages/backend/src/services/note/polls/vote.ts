import { publishNoteStream } from '@/services/stream.js';
import { CacheableUser, User } from '@/models/entities/user.js';
import { Note } from '@/models/entities/note.js';
import { PollVotes, NoteWatchings, Polls, Blockings } from '@/models/index.js';
import { Not } from 'typeorm';
import { genId } from '@/misc/gen-id.js';
import { createNotification } from '../../create-notification.js';
import { db } from '@/db/postgre.js';

export default async function(user: CacheableUser, note: Note, choice: number) {
	const poll = await Polls.findOneBy({ noteId: note.id });

	if (poll == null) throw new Error('poll not found');

	// Check whether is valid choice
	if (poll.choices[choice] == null) throw new Error('invalid choice param');

	// Check blocking
	if (note.userId !== user.id) {
		const block = await Blockings.findOneBy({
			blockerId: note.userId,
			blockeeId: user.id,
		});
		if (block) {
			throw new Error('blocked');
		}
	}

	// Check for an existing vote and insert atomically: hold the poll row
	// with FOR UPDATE inside the transaction so concurrent votes for the
	// same note serialize here and cannot interleave check and insert.
	const index = choice + 1; // In SQL, array index is 1 based
	await db.transaction(async (manager) => {
		await manager.query(`SELECT 1 FROM poll WHERE "noteId" = $1 FOR UPDATE`, [poll.noteId]);

		// if already voted
		const exist = await manager.findBy(PollVotes, {
			noteId: note.id,
			userId: user.id,
		});

		if (poll.multiple) {
			if (exist.some(x => x.choice === choice)) {
				throw new Error('already voted');
			}
		} else if (exist.length !== 0) {
			throw new Error('already voted');
		}

		// Create vote
		await manager.insert(PollVotes, {
			id: genId(),
			createdAt: new Date(),
			noteId: note.id,
			userId: user.id,
			choice: choice,
		});

		// Increment votes count
		await manager.query(`UPDATE poll SET votes[${index}] = votes[${index}] + 1 WHERE "noteId" = $1`, [poll.noteId]);
	});

	publishNoteStream(note.id, 'pollVoted', {
		choice: choice,
		userId: user.id,
	});

	// Notify
	createNotification(note.userId, 'pollVote', {
		notifierId: user.id,
		noteId: note.id,
		choice: choice,
	});

	// Fetch watchers
	NoteWatchings.findBy({
		noteId: note.id,
		userId: Not(user.id),
	})
	.then(watchers => {
		for (const watcher of watchers) {
			createNotification(watcher.userId, 'pollVote', {
				notifierId: user.id,
				noteId: note.id,
				choice: choice,
			});
		}
	});
}
