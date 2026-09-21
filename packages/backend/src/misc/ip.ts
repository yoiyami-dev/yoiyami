import { Address4, Address6 } from 'ip-address';

// Addresses that must never be fetched by the server unless explicitly
// allowed by config.allowedPrivateNetworks. This covers private, loopback,
// link-local, documentation, special-use, and multicast ranges.
const privateIpv4Ranges = [
	'0.0.0.0/8',
	'10.0.0.0/8',
	'100.64.0.0/10',
	'127.0.0.0/8',
	'169.254.0.0/16',
	'172.16.0.0/12',
	'192.0.0.0/24',
	'192.0.2.0/24',
	'192.31.196.0/24',
	'192.52.193.0/24',
	'192.88.99.0/24',
	'192.168.0.0/16',
	'192.175.48.0/24',
	'198.18.0.0/15',
	'198.51.100.0/24',
	'203.0.113.0/24',
	'240.0.0.0/4',
	'255.255.255.255/32',
];

const privateIpv6Ranges = [
	'::/128',
	'::1/128',
	'::ffff:0.0.0.0/96',
	'64:ff9b::/96',
	'100::/64',
	'2001::/32',
	'2001:20::/28',
	'2001:db8::/32',
	'2002::/16',
	'fc00::/7',
	'fe80::/10',
	'ff00::/8',
];

export function isPrivateIp(ip: string): boolean {
	if (Address4.isValid(ip)) {
		return privateIpv4Ranges.some(range => new Address4(ip).isInSubnet(new Address4(range)));
	}

	if (Address6.isValid(ip)) {
		return privateIpv6Ranges.some(range => new Address6(ip).isInSubnet(new Address6(range)));
	}

	// Fail closed for malformed resolver output.
	return true;
}

export function isIpInCidr(ip: string, cidr: string): boolean {
	try {
		if (Address4.isValid(ip) && Address4.isValid(cidr)) {
			return new Address4(ip).isInSubnet(new Address4(cidr));
		}
		if (Address6.isValid(ip) && Address6.isValid(cidr)) {
			return new Address6(ip).isInSubnet(new Address6(cidr));
		}
	} catch {
		// Invalid configured networks are ignored by this check.
	}
	return false;
}

export function getIpHash(ip: string): string {
	if (Address4.isValid(ip)) {
		return `ip-${new Address4(ip).bigInt().toString(36)}`;
	}

	if (Address6.isValid(ip)) {
		return `ip-${BigInt(`0b${new Address6(ip).mask(64)}`).toString(36)}`;
	}

	throw new Error('Invalid IP address');
}
