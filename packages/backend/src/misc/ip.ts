import ipaddr from 'ipaddr.js';

export type ParsedAddress = ipaddr.IPv4 | ipaddr.IPv6;
export type ParsedCidr = [ParsedAddress, number];

/** Strictly parse an IP address and collapse IPv4-mapped IPv6 to IPv4. */
export function parseIp(value: string): ParsedAddress {
	if (ipaddr.IPv4.isValidFourPartDecimal(value)) return ipaddr.IPv4.parse(value);
	if (!ipaddr.IPv6.isValid(value) || value.includes('%')) throw new Error(`Invalid IP address: ${value}`);
	const address = ipaddr.IPv6.parse(value);
	return address.isIPv4MappedAddress() ? address.toIPv4Address() : address;
}

export function parseCidr(value: string): ParsedCidr {
	const parts = value.split('/');
	if (parts.length !== 2 || !/^\d+$/.test(parts[1])) throw new Error(`Invalid CIDR: ${value}`);
	const address = parseIp(parts[0]);
	let prefix = Number(parts[1]);
	if (address.kind() === 'ipv4' && parts[0].includes(':')) {
		// A mapped /96 prefix represents IPv4 /0; narrower mapped CIDRs
		// can be compared using the embedded IPv4 prefix.
		if (prefix < 96 || prefix > 128) throw new Error(`Invalid CIDR: ${value}`);
		prefix -= 96;
	}
	const max = address.kind() === 'ipv4' ? 32 : 128;
	if (!Number.isInteger(prefix) || prefix < 0 || prefix > max) throw new Error(`Invalid CIDR: ${value}`);
	return [address, prefix];
}

export function isIpInCidr(ip: string, cidr: string | ParsedCidr): boolean {
	const address = parseIp(ip);
	const [network, prefix] = typeof cidr === 'string' ? parseCidr(cidr) : cidr;
	return address.kind() === network.kind() && address.match(network, prefix);
}

const documentationV6 = parseCidr('3fff::/20');
const globalV6 = parseCidr('2000::/3');

export function isBlockedOutboundAddress(ip: string): boolean {
	let address: ParsedAddress;
	try {
		address = parseIp(ip);
	} catch {
		return true;
	}
	if (address.range() !== 'unicast') return true;
	if (address.kind() === 'ipv6') {
		// ipaddr.js labels some non-global IPv6 and the newer documentation
		// prefix as unicast; only global unicast is suitable for public fetches.
		return !address.match(globalV6[0], globalV6[1]) || address.match(documentationV6[0], documentationV6[1]);
	}
	return false;
}

export function getIpHash(ip: string): string {
	const address = parseIp(ip);
	const bytes = address.toByteArray().slice(0, address.kind() === 'ipv4' ? 4 : 8);
	const value = bytes.reduce((result, byte) => (result << 8n) | BigInt(byte), 0n);
	return `ip-${value.toString(36)}`;
}
