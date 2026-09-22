import * as assert from 'node:assert';
import { resolveSource } from '../src/config/load.js';

const environmentOnly = {
	MISSKEY_URL: 'https://example.test',
	DATABASE_HOST: 'database',
	DATABASE_DB: 'misskey',
	DATABASE_USER: 'misskey-user',
	DATABASE_PASSWORD: 'misskey-password',
	REDIS_HOST: 'redis',
};

describe('configuration loader', () => {
	it('builds a complete configuration from environment variables', () => {
		const config = resolveSource({}, environmentOnly);

		assert.strictEqual(config.url, 'https://example.test');
		assert.strictEqual(config.port, 3000);
		assert.deepStrictEqual(config.db, {
			host: 'database',
			port: 5432,
			db: 'misskey',
			user: 'misskey-user',
			pass: 'misskey-password',
		});
		assert.deepStrictEqual(config.redis, {
			host: 'redis',
			port: 6379,
			family: undefined,
			pass: undefined,
			db: undefined,
			prefix: undefined,
		});
		assert.strictEqual(config.id, 'aid');
	});

	it('uses environment variables as overrides for YAML values', () => {
		const config = resolveSource({
			url: 'https://from-file.test',
			port: 4000,
			db: {
				host: 'file-database',
				port: 15432,
				db: 'file-db',
				user: 'file-user',
				pass: 'file-password',
			},
			redis: {
				host: 'file-redis',
				port: 16379,
			},
			id: 'ulid',
		}, {
			...environmentOnly,
			PORT: '8080',
			DATABASE_PORT: '25432',
			REDIS_PORT: '26379',
			REDIS_DB: '2',
			REDIS_FAMILY: '4',
			REDIS_PREFIX: 'test-prefix',
			MISSKEY_ID_GENERATION: 'meid',
		});

		assert.strictEqual(config.url, environmentOnly.MISSKEY_URL);
		assert.strictEqual(config.port, 8080);
		assert.strictEqual(config.db.host, environmentOnly.DATABASE_HOST);
		assert.strictEqual(config.db.port, 25432);
		assert.strictEqual(config.redis.host, environmentOnly.REDIS_HOST);
		assert.strictEqual(config.redis.port, 26379);
		assert.strictEqual(config.redis.db, 2);
		assert.strictEqual(config.redis.family, 4);
		assert.strictEqual(config.redis.prefix, 'test-prefix');
		assert.strictEqual(config.id, 'meid');
	});

	it('accepts PostgreSQL image variable names as credential fallbacks', () => {
		const { DATABASE_DB, DATABASE_USER, DATABASE_PASSWORD, ...withoutCanonicalCredentials } = environmentOnly;
		const config = resolveSource({}, {
			...withoutCanonicalCredentials,
			POSTGRES_DB: DATABASE_DB,
			POSTGRES_USER: DATABASE_USER,
			POSTGRES_PASSWORD: DATABASE_PASSWORD,
		});

		assert.strictEqual(config.db.db, DATABASE_DB);
		assert.strictEqual(config.db.user, DATABASE_USER);
		assert.strictEqual(config.db.pass, DATABASE_PASSWORD);
	});

	it('reports every missing required setting', () => {
		assert.throws(
			() => resolveSource({}, {}),
			(error: Error) => [
				'MISSKEY_URL',
				'DATABASE_HOST',
				'DATABASE_DB',
				'DATABASE_USER',
				'DATABASE_PASSWORD',
				'REDIS_HOST',
			].every(variable => error.message.includes(variable)),
		);
	});

	it('rejects malformed numeric environment variables', () => {
		assert.throws(
			() => resolveSource({}, { ...environmentOnly, DATABASE_PORT: 'postgres' }),
			/DATABASE_PORT must be an integer/,
		);
	});
});
