import type { Queue, Processor } from '../../initialize.js';
import { ObjectStorageJobData } from '@/queue/types.js';
import deleteFile from './delete-file.js';
import cleanRemoteFiles from './clean-remote-files.js';

const jobs = {
	deleteFile,
	cleanRemoteFiles,
} as Record<string, Processor<ObjectStorageJobData>>;

export default function(q: Queue<ObjectStorageJobData>) {
	for (const [k, v] of Object.entries(jobs)) {
		q.process(k, 16, v);
	}
}
