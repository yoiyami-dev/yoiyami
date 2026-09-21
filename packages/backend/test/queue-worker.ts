import * as assert from 'assert';
import { legacyBullDefaultJobName, resolveProcessor } from '../src/queue/worker-dispatch.js';

describe('queue worker dispatch', () => {
	it('maps legacy Bull default jobs to the queue processor', () => {
		const deliver = () => 'deliver';

		assert.strictEqual(
			resolveProcessor('deliver', legacyBullDefaultJobName, { deliver }),
			deliver,
		);
	});

	it('prefers the explicit BullMQ job name', () => {
		const legacy = () => 'legacy';
		const named = () => 'named';

		assert.strictEqual(
			resolveProcessor('deliver', 'deliver', { deliver: named }),
			named,
		);
		assert.strictEqual(
			resolveProcessor('deliver', legacyBullDefaultJobName, { deliver: legacy }),
			legacy,
		);
	});

	it('does not guess a processor for unknown jobs', () => {
		assert.strictEqual(resolveProcessor('deliver', 'unknown', { deliver: () => undefined }), undefined);
	});
});
