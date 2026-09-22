process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import * as childProcess from 'child_process';
import { async, signup, request, post, startServer, shutdownServer } from './utils.js';

describe('users/get-frequently-replied-users', () => {
	let p: childProcess.ChildProcess;

	let restrictedReplyAuthor: any;
	let restrictedReplyTarget: any;
	let followersReplyAuthor: any;
	let followersReplyTarget: any;
	let followersReplyViewer: any;
	let publicReplyAuthor: any;
	let publicReplyTarget: any;

	const includesUser = (body: any, userId: string): boolean => {
		return Array.isArray(body) && body.some((reply: any) => reply.user?.id === userId);
	};

	before(async () => {
		p = await startServer();

		restrictedReplyAuthor = await signup({ username: 'ghsa_author1' });
		restrictedReplyTarget = await signup({ username: 'ghsa_target1' });
		followersReplyAuthor = await signup({ username: 'ghsa_author2' });
		followersReplyTarget = await signup({ username: 'ghsa_target2' });
		followersReplyViewer = await signup({ username: 'ghsa_viewer' });
		publicReplyAuthor = await signup({ username: 'ghsa_author3' });
		publicReplyTarget = await signup({ username: 'ghsa_target3' });

		await request('/following/create', {
			userId: followersReplyAuthor.id,
		}, followersReplyViewer);

		const restrictedTargetNote = await post(restrictedReplyTarget, {
			visibility: 'specified',
			visibleUserIds: [restrictedReplyAuthor.id],
		});
		await post(restrictedReplyAuthor, {
			replyId: restrictedTargetNote.id,
			visibility: 'public',
		});

		const publicTargetNote = await post(followersReplyTarget, {
			visibility: 'public',
		});
		await post(followersReplyAuthor, {
			replyId: publicTargetNote.id,
			visibility: 'followers',
		});

		const publicReplyTargetNote = await post(publicReplyTarget, {
			visibility: 'public',
		});
		await post(publicReplyAuthor, {
			replyId: publicReplyTargetNote.id,
			visibility: 'public',
		});
	});

	after(async () => {
		await shutdownServer(p);
	});

	it('does not expose a restricted reply target to an anonymous caller', async(async () => {
		const anonymousRes = await request('/users/get-frequently-replied-users', {
			userId: restrictedReplyAuthor.id,
			limit: 100,
		});

		assert.strictEqual(anonymousRes.status, 200);
		assert.strictEqual(includesUser(anonymousRes.body, restrictedReplyTarget.id), false);
	}));

	it('keeps a restricted reply target visible to the authorized author', async(async () => {
		const ownerRes = await request('/users/get-frequently-replied-users', {
			userId: restrictedReplyAuthor.id,
			limit: 100,
		}, restrictedReplyAuthor);

		assert.strictEqual(ownerRes.status, 200);
		assert.strictEqual(includesUser(ownerRes.body, restrictedReplyTarget.id), true);
	}));

	it('does not expose a followers-only reply to a non-follower', async(async () => {
		const anonymousRes = await request('/users/get-frequently-replied-users', {
			userId: followersReplyAuthor.id,
			limit: 100,
		});

		assert.strictEqual(anonymousRes.status, 200);
		assert.strictEqual(includesUser(anonymousRes.body, followersReplyTarget.id), false);
	}));

	it('keeps a followers-only reply visible to a follower', async(async () => {
		const followerRes = await request('/users/get-frequently-replied-users', {
			userId: followersReplyAuthor.id,
			limit: 100,
		}, followersReplyViewer);

		assert.strictEqual(followerRes.status, 200);
		assert.strictEqual(includesUser(followerRes.body, followersReplyTarget.id), true);
	}));

	it('keeps public replies visible to an anonymous caller', async(async () => {
		const anonymousRes = await request('/users/get-frequently-replied-users', {
			userId: publicReplyAuthor.id,
			limit: 100,
		});

		assert.strictEqual(anonymousRes.status, 200);
		assert.strictEqual(includesUser(anonymousRes.body, publicReplyTarget.id), true);
	}));
});
