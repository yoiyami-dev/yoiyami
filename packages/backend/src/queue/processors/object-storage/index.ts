import type { Job } from 'bullmq';
import { ObjectStorageJobData } from '@/queue/types.js';
import deleteFile from './delete-file.js';
import cleanRemoteFiles from './clean-remote-files.js';

export const objectStorageProcessors = {
	deleteFile,
	cleanRemoteFiles,
} as Record<string, (job: Job<ObjectStorageJobData>) => Promise<unknown> | unknown>;
