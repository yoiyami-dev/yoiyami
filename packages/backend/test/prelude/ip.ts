import * as assert from 'node:assert';
import { getIpHash, isBlockedOutboundAddress, isIpInCidr, parseCidr, parseIp } from '../../src/misc/ip.js';

describe('IP helpers', () => {
	it('blocks private and special-use IPv4 addresses', () => {
		for (const ip of [
			'0.0.0.0', '10.0.0.1', '100.64.0.1', '127.0.0.1', '169.254.169.254',
			'172.16.0.1', '192.168.0.1', '192.0.2.1', '198.18.0.1',
			'198.51.100.1', '203.0.113.1', '224.0.0.1', '239.255.255.255',
			'240.0.0.1', '255.255.255.255',
		]) assert.strictEqual(isBlockedOutboundAddress(ip), true, ip);
	});

	it('blocks private and special-use IPv6 addresses', () => {
		for (const ip of ['::', '::1', 'fc00::1', 'fd00::1', 'fe80::1', 'ff02::1', '2001:db8::1', '3fff::1']) {
			assert.strictEqual(isBlockedOutboundAddress(ip), true, ip);
		}
	});

	it('classifies IPv4-mapped IPv6 by its embedded IPv4', () => {
		for (const ip of ['::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:169.254.169.254', '::ffff:224.0.0.1']) {
			assert.strictEqual(isBlockedOutboundAddress(ip), true, ip);
		}
		assert.strictEqual(parseIp('::ffff:8.8.8.8').toString(), '8.8.8.8');
		assert.strictEqual(isBlockedOutboundAddress('::ffff:8.8.8.8'), false);
	});

	it('permits ordinary public addresses and fails closed on malformed input', () => {
		for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) {
			assert.strictEqual(isBlockedOutboundAddress(ip), false, ip);
		}
		for (const ip of ['999.1.1.1', '127.1', 'fe80::1%eth0', '']) {
			assert.strictEqual(isBlockedOutboundAddress(ip), true, ip);
		}
	});

	it('matches CIDRs only within the normalized address family', () => {
		assert.strictEqual(isIpInCidr('10.0.0.4', '10.0.0.0/24'), true);
		assert.strictEqual(isIpInCidr('10.0.1.4', '10.0.0.0/24'), false);
		assert.strictEqual(isIpInCidr('::ffff:10.0.0.4', '10.0.0.0/24'), true);
		assert.strictEqual(isIpInCidr('10.0.0.4', '::ffff:10.0.0.0/120'), true);
		assert.strictEqual(isIpInCidr('fd00::4', 'fd00::/64'), true);
		assert.strictEqual(isIpInCidr('fd01::4', 'fd00::/64'), false);
		assert.strictEqual(isIpInCidr('10.0.0.4', 'fd00::/64'), false);
		assert.strictEqual(isIpInCidr('fd00::4', '10.0.0.0/24'), false);
		for (const cidr of ['10.0.0.0/33', 'fd00::/129', '::ffff:10.0.0.0/95', '127.1/8', '10.0.0.0', 'garbage/8']) {
			assert.throws(() => parseCidr(cidr), /Invalid/);
		}
	});

	it('retains fixed IP hash values and unifies mapped IPv4', () => {
		assert.strictEqual(getIpHash('127.0.0.1'), 'ip-z8kflt');
		assert.strictEqual(getIpHash('::ffff:127.0.0.1'), 'ip-z8kflt');
		assert.strictEqual(getIpHash('2001:db8::1'), 'ip-hir6901su77k');
		assert.strictEqual(getIpHash('2001:db8::2'), 'ip-hir6901su77k');
		assert.notStrictEqual(getIpHash('192.0.2.1'), getIpHash('192.0.2.2'));
	});
});
