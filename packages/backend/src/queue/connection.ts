import config from '@/config/index.js';

export const queuePrefix = config.redis.prefix ? `${config.redis.prefix}:queue` : 'queue';

export function redisConnection() {
	return {
		port: config.redis.port,
		host: config.redis.host,
		family: config.redis.family == null ? 0 : config.redis.family,
		password: config.redis.pass,
		db: config.redis.db || 0,
		maxRetriesPerRequest: null,
	};
}
