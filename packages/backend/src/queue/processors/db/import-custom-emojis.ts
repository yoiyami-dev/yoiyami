import type { Job } from 'bullmq';
import * as fs from 'node:fs';
import { join } from 'node:path';

import { queueLogger } from '../../logger.js';
import { createTempDir } from '@/misc/create-temp.js';
import { downloadUrl } from '@/misc/download-url.js';
import { ZipFile } from '@/misc/zip.js';
import { DriveFiles, Emojis } from '@/models/index.js';
import { DbUserImportJobData } from '@/queue/types.js';
import { addFile } from '@/services/drive/add-file.js';
import { genId } from '@/misc/gen-id.js';
import { db } from '@/db/postgre.js';

const logger = queueLogger.createSubLogger('import-custom-emojis');

const MAX_META_JSON_SIZE = 64 * 1024 * 1024;
const MAX_EMOJI_FILE_SIZE = 32 * 1024 * 1024;
const MAX_NAME_LENGTH = 255;
const FILE_NAME_PATTERN = /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9]+)*$/;
const EMOJI_NAME_PATTERN = /^[a-zA-Z0-9_]+$/;

type EmojiRecord = {
	fileName: string;
	downloaded: boolean;
	emoji: {
		name: string;
		category: string | null;
		aliases: string[];
	};
};

function isValidName(value: unknown, pattern: RegExp): value is string {
	return typeof value === 'string' && value.length <= MAX_NAME_LENGTH && pattern.test(value);
}

function isEmojiRecord(value: unknown): value is EmojiRecord {
	if (typeof value !== 'object' || value === null) return false;
	const record = value as { fileName?: unknown; downloaded?: unknown; emoji?: unknown };
	if (typeof record.fileName !== 'string' || typeof record.downloaded !== 'boolean') return false;
	if (typeof record.emoji !== 'object' || record.emoji === null) return false;
	const emoji = record.emoji as { name?: unknown; category?: unknown; aliases?: unknown };
	return typeof emoji.name === 'string'
		&& (typeof emoji.category === 'string' || emoji.category === null)
		&& Array.isArray(emoji.aliases)
		&& emoji.aliases.every(alias => typeof alias === 'string');
}

function truncateForLog(value: unknown): string {
	const text = typeof value === 'string' ? value : JSON.stringify(value) ?? String(value);
	return text.length > MAX_NAME_LENGTH ? text.slice(0, MAX_NAME_LENGTH) + '...' : text;
}

// TODO: 名前衝突時の動作を選べるようにする
export async function importCustomEmojis(job: Job<DbUserImportJobData>): Promise<void> {
	logger.info(`Importing custom emojis ...`);

	const file = await DriveFiles.findOneBy({
		id: job.data.fileId,
	});
	if (file == null) {
		return;
	}

	const [path, cleanup] = await createTempDir();

	logger.info(`Temp dir is ${path}`);

	const destPath = path + '/emojis.zip';

	try {
		fs.writeFileSync(destPath, '', 'binary');
		await downloadUrl(file.url, destPath);
	} catch (e) { // TODO: 何度か再試行
		if (e instanceof Error || typeof e === 'string') {
			logger.error(e);
		}
		throw e;
	}

	const outputPath = path + '/emojis';
	try {
		await fs.promises.mkdir(outputPath);
		const zip = await ZipFile.open(destPath);
		try {
			const metaPath = outputPath + '/meta.json';
			let metaFound = false;
			for await (const entry of zip.entries()) {
				if (entry.filename !== 'meta.json') continue;
				await zip.extractToFile(entry, metaPath, { maxBytes: MAX_META_JSON_SIZE });
				metaFound = true;
			}
			if (!metaFound) {
				throw new Error('meta.json not found in the archive');
			}

			const metaRaw = await fs.promises.readFile(metaPath, 'utf-8');
			const meta = JSON.parse(metaRaw) as { emojis?: unknown };
			if (!Array.isArray(meta.emojis)) {
				throw new Error('invalid meta.json: emojis must be an array');
			}

			const wanted = new Map<string, EmojiRecord[]>();
			for (const rawRecord of meta.emojis) {
				if (!isEmojiRecord(rawRecord)) {
					logger.error(`invalid emoji record: ${truncateForLog(rawRecord)}`);
					continue;
				}
				if (!rawRecord.downloaded) continue;
				if (!isValidName(rawRecord.fileName, FILE_NAME_PATTERN)) {
					logger.error(`invalid filename: ${truncateForLog(rawRecord.fileName)}`);
					continue;
				}
				if (!isValidName(rawRecord.emoji.name, EMOJI_NAME_PATTERN)) {
					logger.error(`invalid emojiname: ${truncateForLog(rawRecord.emoji.name)}`);
					continue;
				}
				const records = wanted.get(rawRecord.fileName);
				if (records == null) {
					wanted.set(rawRecord.fileName, [rawRecord]);
				} else {
					records.push(rawRecord);
				}
			}

			for await (const entry of zip.entries()) {
				const records = wanted.get(entry.filename);
				if (records == null) continue;
				wanted.delete(entry.filename);

				const emojiPath = join(outputPath, records[0].fileName);
				try {
					await zip.extractToFile(entry, emojiPath, { maxBytes: MAX_EMOJI_FILE_SIZE });
				} catch (error) {
					logger.error(error instanceof Error ? error : new Error(String(error)));
					continue;
				}

				try {
					for (const record of records) {
						const emojiInfo = record.emoji;
						await Emojis.delete({ name: emojiInfo.name });
						const driveFile = await addFile({ user: null, path: emojiPath, name: record.fileName, force: true });
						await Emojis.insert({
							id: genId(),
							updatedAt: new Date(),
							name: emojiInfo.name,
							category: emojiInfo.category,
							host: null,
							aliases: emojiInfo.aliases,
							originalUrl: driveFile.url,
							publicUrl: driveFile.webpublicUrl ?? driveFile.url,
							type: driveFile.webpublicType ?? driveFile.type,
						}).then(x => Emojis.findOneByOrFail(x.identifiers[0]));
					}
				} finally {
					await fs.promises.rm(emojiPath, { force: true });
				}
			}

			for (const fileName of wanted.keys()) {
				logger.error(`file not found in the archive: ${fileName}`);
			}

			await db.queryResultCache!.remove(['meta_emojis']);
		} finally {
			await zip.close();
		}
		logger.succ('Imported');
	} finally {
		cleanup();
	}
}
