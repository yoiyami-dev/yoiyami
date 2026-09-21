import { URL } from 'node:url';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import type { Meta } from '@/models/entities/meta.js';
import { getAgentByUrl } from '@/misc/fetch.js';
import { getObjectStorageRegion } from './object-storage-region.js';

export function getObjectStorageEndpoint(meta: Meta): URL | undefined {
	if (meta.objectStorageEndpoint == null) return undefined;

	return new URL(`${meta.objectStorageUseSSL ? 'https' : 'http'}://${meta.objectStorageEndpoint}`);
}

export function getS3(meta: Meta) {
	const endpoint = getObjectStorageEndpoint(meta);
	const agentUrl = endpoint ?? new URL(`${meta.objectStorageUseSSL ? 'https' : 'http'}://example.net`);

	const httpAgent = getAgentByUrl(new URL(`http://${agentUrl.host}`), !meta.objectStorageUseProxy);
	const httpsAgent = getAgentByUrl(new URL(`https://${agentUrl.host}`), !meta.objectStorageUseProxy);

	return new S3Client({
		endpoint: endpoint?.toString(),
		credentials: {
			accessKeyId: meta.objectStorageAccessKey!,
			secretAccessKey: meta.objectStorageSecretKey!,
		},
		region: getObjectStorageRegion(meta.objectStorageRegion),
		forcePathStyle: !meta.objectStorageEndpoint	// AWS with endpoint omitted
			? false
			: meta.objectStorageS3ForcePathStyle,
		requestHandler: new NodeHttpHandler({
			httpAgent,
			httpsAgent,
		}),
	});
}

export async function deleteS3Object(s3: S3Client, bucket: string, key: string): Promise<void> {
	await s3.send(new DeleteObjectCommand({
		Bucket: bucket,
		Key: key,
	}));
}
