export function getObjectStorageRegion(region: string | null): string {
	return region || 'us-east-1';
}
