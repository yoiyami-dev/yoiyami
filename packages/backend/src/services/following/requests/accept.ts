import { renderActivity } from '@/remote/activitypub/renderer/index.js';
import renderFollow from '@/remote/activitypub/renderer/follow.js';
import renderAccept from '@/remote/activitypub/renderer/accept.js';
import { deliver } from '@/queue/index.js';
import { publishMainStream } from '@/services/stream.js';
import { insertFollowingDoc } from '../create.js';
import { db } from '@/db/postgre.js';
import { User, ILocalUser, CacheableUser } from '@/models/entities/user.js';
import { FollowRequest } from '@/models/entities/follow-request.js';
import { Blocking } from '@/models/entities/blocking.js';
import { Users } from '@/models/index.js';
import { IdentifiableError } from '@/misc/identifiable-error.js';

export default async function(followee: { id: User['id']; host: User['host']; uri: User['host']; inbox: User['inbox']; sharedInbox: User['sharedInbox']; }, follower: CacheableUser) {
	// Hold the request row with FOR UPDATE inside the transaction so concurrent
	// accept/cancel/block cannot interleave the check and the act (strix vuln-0007).
	const request = await db.transaction(async (manager) => {
		const request = await manager.getRepository(FollowRequest).findOne({
			where: {
				followeeId: followee.id,
				followerId: follower.id,
			},
			lock: { mode: 'pessimistic_write' },
		});

		if (request == null) {
			throw new IdentifiableError('8884c2dd-5795-4ac9-b27e-6a01d38190f9', 'No follow request.');
		}

		// キー取得後にブロック関係が成立していた場合は承認しない (strix vuln-0007)
		const blocked = await manager.getRepository(Blocking).findOne({
			where: [
				{ blockerId: follower.id, blockeeId: followee.id },
				{ blockerId: followee.id, blockeeId: follower.id },
			],
		});

		if (blocked != null) {
			throw new IdentifiableError('8884c2dd-5795-4ac9-b27e-6a01d38190f9', 'No follow request.');
		}

		// ロックを保持したままリクエストを消費する
		await manager.getRepository(FollowRequest).delete({
			followeeId: followee.id,
			followerId: follower.id,
		});

		return request;
	});

	await insertFollowingDoc(followee, follower);

	if (Users.isRemoteUser(follower) && Users.isLocalUser(followee)) {
		const content = renderActivity(renderAccept(renderFollow(follower, followee, request.requestId!), followee));
		deliver(followee, content, follower.inbox);
	}

	Users.pack(followee.id, followee, {
		detail: true,
	}).then(packed => publishMainStream(followee.id, 'meUpdated', packed));
}
