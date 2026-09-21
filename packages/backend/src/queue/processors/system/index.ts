import type { Job } from 'bullmq';
import { tickCharts } from './tick-charts.js';
import { resyncCharts } from './resync-charts.js';
import { cleanCharts } from './clean-charts.js';
import { checkExpiredMutings } from './check-expired-mutings.js';
import { clean } from './clean.js';

export const systemProcessors = {
	tickCharts,
	resyncCharts,
	cleanCharts,
	checkExpiredMutings,
	clean,
} as Record<string, (job: Job<Record<string, unknown>>) => Promise<unknown> | unknown>;
