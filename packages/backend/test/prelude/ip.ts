import * as assert from 'assert';
import { getIpHash, isIpInCidr, isPrivateIp } from '../../src/misc/ip.js';

describe('IP helpers', () => {
	it('blocks private and special-use addresses', () => {
		assert.strictEqual(isPrivateIp('127.0.0.1'), true);
		assert.strictEqual(isPrivateIp('169.254.169.254'), true);
		assert.strictEqual(isPrivateIp('::ffff:10.0.0.1'), true);
		assert.strictEqual(isPrivateIp('8.8.8.8'), false);
	});

	it('matches configured CIDR ranges', () => {
		assert.strictEqual(isIpInCidr('192.0.2.42', '192.0.2.0/24'), true);
		assert.strictEqual(isIpInCidr('192.0.3.42', '192.0.2.0/24'), false);
	});

	it('uses the full IPv4 address and an IPv6 /64 for hashes', () => {
		assert.notStrictEqual(getIpHash('192.0.2.1'), getIpHash('192.0.2.2'));
		assert.strictEqual(getIpHash('2001:db8::1'), getIpHash('2001:db8::2'));
	});
});
