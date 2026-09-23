import type { SchemaType } from '../../src/misc/schema.js';

type UsersShowParams = SchemaType<typeof import('../../src/server/api/endpoints/users/show.js').paramDef>;
type MessagingMessagesParams = SchemaType<typeof import('../../src/server/api/endpoints/messaging/messages.js').paramDef>;
type FollowersParams = SchemaType<typeof import('../../src/server/api/endpoints/users/followers.js').paramDef>;
type ReadNotificationParams = SchemaType<typeof import('../../src/server/api/endpoints/notifications/read.js').paramDef>;

const usersShowById: UsersShowParams = { userId: 'user-id' };
const usersShowByUsername: UsersShowParams = { username: 'alice', host: null };
const messagingByUser: MessagingMessagesParams = { limit: 10, markAsRead: true, userId: 'user-id' };
const messagingByGroup: MessagingMessagesParams = { limit: 10, markAsRead: true, groupId: 'group-id' };
const followersById: FollowersParams = { limit: 10, userId: 'user-id' };
const followersByUsername: FollowersParams = { limit: 10, username: 'alice', host: null };
const readOneNotification: ReadNotificationParams = { notificationId: 'notification-id' };
const readManyNotifications: ReadNotificationParams = { notificationIds: ['notification-id'] };

void usersShowById;
void usersShowByUsername;
void messagingByUser;
void messagingByGroup;
void followersById;
void followersByUsername;
void readOneNotification;
void readManyNotifications;

// @ts-expect-error A users/show request must identify a user by id or username.
const invalidUsersShow: UsersShowParams = { groupId: 'group-id' };

void invalidUsersShow;
