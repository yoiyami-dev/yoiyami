/**
 * Reject a worker handler after the configured deadline.
 * The underlying operation cannot be forcefully cancelled by JavaScript, but
 * this preserves Bull's timeout/retry behavior for the queue worker.
 */
export function withTimeout<T>(operation: Promise<T>, timeoutMs: number, description: string): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		let settled = false;
		const timer = setTimeout(() => {
			settled = true;
			reject(new Error(`${description} timed out after ${timeoutMs}ms`));
		}, timeoutMs);
		timer.unref?.();

		operation.then(
			value => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				resolve(value);
			},
			error => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				reject(error);
			},
		);
	});
}
