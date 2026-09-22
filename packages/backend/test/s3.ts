import * as assert from 'assert';
import { S3Client } from '@aws-sdk/client-s3';
import { getObjectStorageRegion } from '../src/services/drive/object-storage-region.js';
import { deleteS3Object } from '../src/services/drive/s3.js';

describe('object storage region', () => {
	it('uses the configured region', () => {
		assert.strictEqual(getObjectStorageRegion('eu-west-1'), 'eu-west-1');
	});

	it('uses us-east-1 when the provider has no region', () => {
		assert.strictEqual(getObjectStorageRegion(null), 'us-east-1');
	});

	it('deletes objects through the AWS SDK v3 command API', async () => {
		let commandInput: Record<string, unknown> | undefined;
		const client = {
			send: async (command: { input: Record<string, unknown> }) => {
				commandInput = command.input;
			},
		} as unknown as S3Client;

		await deleteS3Object(client, 'bucket', 'key');

		assert.deepStrictEqual(commandInput, { Bucket: 'bucket', Key: 'key' });
	});
});
