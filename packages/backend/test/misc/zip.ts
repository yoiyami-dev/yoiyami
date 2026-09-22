import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { BlobWriter, TextReader, Uint8ArrayReader, ZipWriter } from '@zip.js/zip.js';
import { ZipExtractError, ZipFile } from '../../src/misc/zip.js';

type TestEntry = {
	name: string;
	data: string | Uint8Array;
	unixMode?: number;
};

const S_IFLNK = 0o120000;

async function buildZip(entries: TestEntry[]): Promise<Uint8Array> {
	const writer = new ZipWriter(new BlobWriter('application/zip'), { useWebWorkers: false });
	for (const entry of entries) {
		const reader = typeof entry.data === 'string' ? new TextReader(entry.data) : new Uint8ArrayReader(entry.data);
		await writer.add(entry.name, reader, entry.unixMode != null ? { unixMode: entry.unixMode } : {});
	}
	const blob = await writer.close();
	return new Uint8Array(await blob.arrayBuffer());
}

function forgeUncompressedSize(zip: Uint8Array, size: number): Uint8Array {
	const forged = new Uint8Array(zip);
	const view = new DataView(forged.buffer, forged.byteOffset, forged.byteLength);
	let patched = 0;
	for (let i = 0; i + 4 <= forged.byteLength; i++) {
		const signature = view.getUint32(i, true);
		if (signature === 0x04034b50) {
			view.setUint32(i + 22, size, true);
			patched++;
		} else if (signature === 0x02014b50) {
			view.setUint32(i + 24, size, true);
			patched++;
		}
	}
	assert.equal(patched, 2);
	return forged;
}

async function findEntry(zip: ZipFile, name: string) {
	for await (const entry of zip.entries()) {
		if (entry.filename === name) return entry;
	}
	return null;
}

async function listNames(zip: ZipFile): Promise<string[]> {
	const names: string[] = [];
	for await (const entry of zip.entries()) names.push(entry.filename);
	return names.sort();
}

describe('misc:zip', () => {
	let dir: string;

	async function writeZip(entries: TestEntry[] | Uint8Array): Promise<string> {
		const zipPath = path.join(dir, 'test.zip');
		await fs.promises.writeFile(zipPath, entries instanceof Uint8Array ? entries : await buildZip(entries));
		return zipPath;
	}

	beforeEach(async () => {
		dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'yoiyami-zip-test-'));
	});

	afterEach(async () => {
		await fs.promises.rm(dir, { recursive: true, force: true });
	});

	it('lists file entries and extracts them', async () => {
		const image = new Uint8Array(70000);
		for (let i = 0; i < image.length; i++) image[i] = (i * 31) & 0xff;
		const zipPath = await writeZip([
			{ name: 'meta.json', data: '{"emojis":[]}' },
			{ name: 'sub/', data: '' },
			{ name: 'sub/nested.txt', data: 'nested' },
			{ name: 'ok.png', data: image },
		]);

		const zip = await ZipFile.open(zipPath);
		try {
			assert.deepEqual(await listNames(zip), ['meta.json', 'ok.png', 'sub/nested.txt']);

			const metaPath = path.join(dir, 'meta.json');
			await zip.extractToFile((await findEntry(zip, 'meta.json'))!, metaPath, { maxBytes: 1024 });
			assert.equal(await fs.promises.readFile(metaPath, 'utf-8'), '{"emojis":[]}');

			const imagePath = path.join(dir, 'ok.png');
			await zip.extractToFile((await findEntry(zip, 'ok.png'))!, imagePath, { maxBytes: image.length });
			assert.deepEqual(new Uint8Array(await fs.promises.readFile(imagePath)), image);
			assert.equal((await fs.promises.lstat(imagePath)).isFile(), true);
		} finally {
			await zip.close();
		}
	});

	it('rejects symbolic link entries', async () => {
		const zipPath = await writeZip([{ name: 'passwd', data: '/etc/passwd', unixMode: S_IFLNK | 0o777 }]);
		const zip = await ZipFile.open(zipPath);
		try {
			const entry = (await findEntry(zip, 'passwd'))!;
			assert.equal(entry.symlink, true);
			const dest = path.join(dir, 'passwd');
			await assert.rejects(zip.extractToFile(entry, dest, { maxBytes: 1024 }), ZipExtractError);
			assert.equal(fs.existsSync(dest), false);
		} finally {
			await zip.close();
		}
	});

	it('rejects archives containing path traversal or absolute path entries', async () => {
		for (const name of ['../../evil.txt', '/etc/evil.txt']) {
			const zipPath = await writeZip([{ name, data: 'evil' }]);
			const zip = await ZipFile.open(zipPath);
			try {
				await assert.rejects(listNames(zip), /Unsafe filename/);
			} finally {
				await zip.close();
			}
		}
	});

	it('rejects archives containing duplicate entry names', async () => {
		const zip = await buildZip([
			{ name: 'a.png', data: 'first' },
			{ name: 'b.png', data: 'second' },
		]);
		const text = new TextDecoder('latin1').decode(zip);
		assert.equal(text.split('b.png').length - 1, 2);
		const forged = new Uint8Array(zip);
		for (let i = text.indexOf('b.png'); i !== -1; i = text.indexOf('b.png', i + 1)) forged[i] = 'a'.charCodeAt(0);
		const zipPath = await writeZip(forged);

		const file = await ZipFile.open(zipPath);
		try {
			await assert.rejects(listNames(file), /duplicate entry/);
		} finally {
			await file.close();
		}
	});

	it('rejects non-zip files', async () => {
		const zipPath = path.join(dir, 'not-a-zip.zip');
		await fs.promises.writeFile(zipPath, 'this is not a zip file');

		const zip = await ZipFile.open(zipPath);
		try {
			await assert.rejects(listNames(zip));
		} finally {
			await zip.close();
		}
	});

	it('rejects entries whose declared size exceeds maxBytes', async () => {
		const zipPath = await writeZip([{ name: 'big.bin', data: new Uint8Array(1024 * 1024) }]);
		const zip = await ZipFile.open(zipPath);
		try {
			const dest = path.join(dir, 'big.bin');
			await assert.rejects(zip.extractToFile((await findEntry(zip, 'big.bin'))!, dest, { maxBytes: 64 * 1024 }), ZipExtractError);
			assert.equal(fs.existsSync(dest), false);
		} finally {
			await zip.close();
		}
	});

	it('rejects an actual size above maxBytes even when the header lies', async () => {
		const forged = forgeUncompressedSize(await buildZip([{ name: 'bomb.bin', data: new Uint8Array(1024 * 1024) }]), 10);
		const zipPath = await writeZip(forged);
		const zip = await ZipFile.open(zipPath);
		try {
			const entry = (await findEntry(zip, 'bomb.bin'))!;
			assert.equal(entry.uncompressedSize, 10);
			const dest = path.join(dir, 'bomb.bin');
			await assert.rejects(zip.extractToFile(entry, dest, { maxBytes: 64 * 1024 }));
			assert.equal(fs.existsSync(dest), false);
		} finally {
			await zip.close();
		}
	});

	it('never writes through an existing symbolic link at the destination', async () => {
		const zipPath = await writeZip([{ name: 'ok.txt', data: 'overwritten?' }]);
		const target = path.join(dir, 'target.txt');
		await fs.promises.writeFile(target, 'original');
		const dest = path.join(dir, 'ok.txt');
		await fs.promises.symlink(target, dest);

		const zip = await ZipFile.open(zipPath);
		try {
			await assert.rejects(zip.extractToFile((await findEntry(zip, 'ok.txt'))!, dest, { maxBytes: 1024 }), /EEXIST/);
			assert.equal(await fs.promises.readFile(target, 'utf-8'), 'original');
			assert.equal((await fs.promises.lstat(dest)).isSymbolicLink(), true);
		} finally {
			await zip.close();
		}
	});
});
