/**
 * Config loader
 */

import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, resolve } from 'node:path';
import * as yaml from 'js-yaml';
import { Config, Source, ResolvedSource, Mixin } from './types.js';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

/**
 * Path of configuration directory
 */
const dir = resolve(_dirname, '../../../../.config');

/**
 * Path of configuration file
 */
type Environment = Readonly<Record<string, string | undefined>>;

export default function load(): Config {
	const meta = JSON.parse(fs.readFileSync(`${_dirname}/../../../../built/meta.json`, 'utf-8'));
	const clientManifest = JSON.parse(fs.readFileSync(`${_dirname}/../../../../built/_client_dist_/manifest.json`, 'utf-8'));
	const config = resolveSource(loadSource(process.env), process.env);

	const mixin = {} as Mixin;

	const url = tryCreateUrl(config.url);

	config.url = url.origin;

	mixin.version = meta.version;
	mixin.buildVersion = meta.buildVersion ?? meta.version;
	mixin.softwareName = meta.name ?? 'yoiyami';
	mixin.host = url.host;
	mixin.hostname = url.hostname;
	mixin.scheme = url.protocol.replace(/:$/, '');
	mixin.wsScheme = mixin.scheme.replace('http', 'ws');
	mixin.wsUrl = `${mixin.wsScheme}://${mixin.host}`;
	mixin.apiUrl = `${mixin.scheme}://${mixin.host}/api`;
	mixin.authUrl = `${mixin.scheme}://${mixin.host}/auth`;
	mixin.driveUrl = `${mixin.scheme}://${mixin.host}/files`;
	mixin.userAgent = `${mixin.softwareName}/${meta.version} (${config.url})`;
	mixin.clientEntry = clientManifest['src/init.ts'];

	if (!config.redis.prefix) config.redis.prefix = mixin.host;

	return Object.assign(config, mixin);
}

/**
 * Load the optional YAML base configuration. An explicitly selected file must
 * exist; the conventional default file may be omitted when environment
 * variables provide a complete configuration.
 */
export function loadSource(env: Environment): Source {
	const configuredPath = env.MISSKEY_CONFIG_YML;
	const fileName = configuredPath ?? (env.NODE_ENV === 'test' ? 'test.yml' : 'default.yml');
	const path = isAbsolute(fileName) ? fileName : resolve(dir, fileName);

	if (!fs.existsSync(path)) {
		if (configuredPath != null || env.NODE_ENV === 'test') {
			throw new Error(`Configuration file not found: ${path}`);
		}
		return {};
	}

	let source: unknown;
	try {
		source = yaml.load(fs.readFileSync(path, 'utf-8'));
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new Error(`Unable to read configuration file ${path}: ${reason}`);
	}

	if (source == null) return {};
	if (typeof source !== 'object' || Array.isArray(source)) {
		throw new Error(`Configuration file must contain a YAML object: ${path}`);
	}

	return source as Source;
}

/** Resolve environment overrides and validate the settings needed at startup. */
export function resolveSource(source: Source, env: Environment): ResolvedSource {
	const db = source.db ?? {};
	const redis = source.redis ?? {};

	const config = {
		...source,
		url: env.MISSKEY_URL ?? source.url,
		port: integerFromEnv(env, 'PORT', source.port ?? 3000, { min: 1, max: 65535 }),
		db: {
			...db,
			host: env.DATABASE_HOST ?? db.host,
			port: integerFromEnv(env, 'DATABASE_PORT', db.port ?? 5432, { min: 1, max: 65535 }),
			db: env.DATABASE_DB ?? env.POSTGRES_DB ?? db.db,
			user: env.DATABASE_USER ?? env.POSTGRES_USER ?? db.user,
			pass: env.DATABASE_PASSWORD ?? env.POSTGRES_PASSWORD ?? db.pass,
		},
		redis: {
			...redis,
			host: env.REDIS_HOST ?? redis.host,
			port: integerFromEnv(env, 'REDIS_PORT', redis.port ?? 6379, { min: 1, max: 65535 }),
			family: optionalIntegerFromEnv(env, 'REDIS_FAMILY', redis.family, { allowed: [0, 4, 6] }),
			pass: optionalStringFromEnv(env, 'REDIS_PASSWORD', redis.pass),
			db: optionalIntegerFromEnv(env, 'REDIS_DB', redis.db, { min: 0 }),
			prefix: optionalStringFromEnv(env, 'REDIS_PREFIX', redis.prefix),
		},
		id: env.MISSKEY_ID_GENERATION ?? source.id ?? 'aid',
	};

	const missing = [
		['url', config.url, 'MISSKEY_URL'],
		['db.host', config.db.host, 'DATABASE_HOST'],
		['db.db', config.db.db, 'DATABASE_DB'],
		['db.user', config.db.user, 'DATABASE_USER'],
		['db.pass', config.db.pass, 'DATABASE_PASSWORD'],
		['redis.host', config.redis.host, 'REDIS_HOST'],
	]
		.filter(([, value]) => typeof value !== 'string' || value.length === 0)
		.map(([field, , variable]) => `${field} (set ${variable} or configure it in YAML)`);

	if (missing.length > 0) {
		throw new Error(`Missing required configuration:\n- ${missing.join('\n- ')}`);
	}

	return config as ResolvedSource;
}

function integerFromEnv(
	env: Environment,
	name: string,
	fallback: number,
	constraints: { min?: number; max?: number; allowed?: number[] } = {},
): number {
	return parseInteger(name, env[name], fallback, constraints) as number;
}

function optionalIntegerFromEnv(
	env: Environment,
	name: string,
	fallback: number | undefined,
	constraints: { min?: number; max?: number; allowed?: number[] } = {},
): number | undefined {
	return parseInteger(name, env[name], fallback, constraints);
}

function parseInteger(
	name: string,
	value: string | undefined,
	fallback: number | undefined,
	constraints: { min?: number; max?: number; allowed?: number[] },
): number | undefined {
	if (value == null) return fallback;
	if (!/^-?\d+$/.test(value)) throw new Error(`${name} must be an integer, got ${JSON.stringify(value)}`);

	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) throw new Error(`${name} is outside the supported integer range`);
	if (constraints.min != null && parsed < constraints.min) throw new Error(`${name} must be at least ${constraints.min}`);
	if (constraints.max != null && parsed > constraints.max) throw new Error(`${name} must be at most ${constraints.max}`);
	if (constraints.allowed != null && !constraints.allowed.includes(parsed)) {
		throw new Error(`${name} must be one of: ${constraints.allowed.join(', ')}`);
	}

	return parsed;
}

function optionalStringFromEnv(env: Environment, name: string, fallback: string | undefined): string | undefined {
	const value = env[name];
	return value == null ? fallback : value || undefined;
}

function tryCreateUrl(url: string) {
	try {
		return new URL(url);
	} catch (e) {
		throw `url="${url}" is not a valid URL.`;
	}
}
