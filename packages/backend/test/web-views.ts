import * as assert from 'assert';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pug from 'pug';

const testDir = dirname(fileURLToPath(import.meta.url));

describe('web views', () => {
	it('compiles the base view and its includes', () => {
		assert.doesNotThrow(() => {
			pug.compileFile(resolve(testDir, '../src/server/web/views/base.pug'));
		});
	});
});
