import type { Queue, Processor } from '../../initialize.js';
import { tickCharts } from './tick-charts.js';
import { resyncCharts } from './resync-charts.js';
import { cleanCharts } from './clean-charts.js';
import { checkExpiredMutings } from './check-expired-mutings.js';
import { clean } from './clean.js';

const jobs = {
	tickCharts,
	resyncCharts,
	cleanCharts,
	checkExpiredMutings,
	clean,
} as Record<string, Processor<Record<string, unknown>>>;

export default function(dbQueue: Queue<Record<string, unknown>>) {
	for (const [k, v] of Object.entries(jobs)) {
		dbQueue.process(k, v);
	}
}
