import { ObjectStorageFileJobData } from '@/queue/types.js';
import type { Job } from 'bullmq';
import { deleteObjectStorageFile } from '@/services/drive/delete-file.js';

export default async (job: Job<ObjectStorageFileJobData>) => {
	const key: string = job.data.key;

	await deleteObjectStorageFile(key);

	return 'Success';
};
