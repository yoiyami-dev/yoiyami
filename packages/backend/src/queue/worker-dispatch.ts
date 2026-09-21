export const legacyBullDefaultJobName = '__default__';

export function resolveProcessor<T>(
	queueName: string,
	jobName: string,
	processors: Readonly<Record<string, T>>,
): T | undefined {
	const processor = processors[jobName];
	if (processor != null) return processor;

	// Bull 4 stored jobs added without an explicit name as __default__. The
	// four dedicated queues used that API before the BullMQ migration, while
	// their new processor names match the queue name.
	return jobName === legacyBullDefaultJobName ? processors[queueName] : undefined;
}
