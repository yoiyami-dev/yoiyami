import * as assert from 'assert';
import { getObjectStorageRegion } from '../src/services/drive/object-storage-region.js';

describe('object storage region', () => {
	it('uses the configured region', () => {
		assert.strictEqual(getObjectStorageRegion('eu-west-1'), 'eu-west-1');
	});

	it('uses us-east-1 when the provider has no region', () => {
		assert.strictEqual(getObjectStorageRegion(null), 'us-east-1');
	});
});
