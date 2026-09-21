import { EventEmitter } from 'node:events';
import { Job, JobsOptions, Queue as BullMqQueue, QueueEvents, Worker } from 'bullmq';
import config from '@/config/index.js';

export type Processor<T> = (job: Job<T>, done?: () => void) => Promise<unknown> | unknown;

type LegacyRepeatOptions = {
	cron?: string;
	pattern?: string;
	[key: string]: unknown;
};

type LegacyJobOptions = JobsOptions & {
	timeout?: number;
	repeat?: LegacyRepeatOptions;
};

const queuePrefix = config.redis.prefix ? `${config.redis.prefix}:queue` : 'queue';

function connectionOptions() {
	return {
		port: config.redis.port,
		host: config.redis.host,
		family: config.redis.family == null ? 0 : config.redis.family,
		password: config.redis.pass,
		db: config.redis.db || 0,
		maxRetriesPerRequest: null,
	};
}

/**
 * The old queue API was deliberately kept local while the storage engine was
 * moved to BullMQ. This lets processors migrate independently without keeping
 * the abandoned bull package in the runtime graph.
 */
export class Queue<T> extends EventEmitter {
	private readonly queue: BullMqQueue<T, any, string>;
	private readonly events: QueueEvents;
	private readonly processors = new Map<string, Processor<T>>();
	private worker: Worker<T> | null = null;
	private defaultProcessor: Processor<T> | null = null;

	public constructor(name: string, limitPerSec = -1) {
		super();
		const connection = connectionOptions();
		const limiter = limitPerSec > 0 ? { max: limitPerSec, duration: 1000 } : undefined;

		this.queue = new BullMqQueue<T, any, string>(name, {
			connection,
			prefix: queuePrefix,
		});
		this.events = new QueueEvents(name, {
			connection,
			prefix: queuePrefix,
		});

		this.events.on('waiting', ({ jobId }) => this.emit('waiting', jobId));
		this.events.on('active', ({ jobId }) => this.emit('global:active', jobId));
		this.events.on('cleaned', ({ count }) => this.emit('cleaned', [], count));
		this.events.on('error', error => this.emit('error', null, error));

		this.workerLimiter = limiter;
	}

	private workerLimiter: { max: number; duration: number } | undefined;

	public add(data: T, opts?: LegacyJobOptions): Promise<Job<T>>;
	public add(name: string, data: T, opts?: LegacyJobOptions): Promise<Job<T>>;
	public add(nameOrData: string | T, dataOrOptions?: T | LegacyJobOptions, maybeOptions?: LegacyJobOptions): Promise<Job<T>> {
		const named = typeof nameOrData === 'string';
		const name = named ? nameOrData as string : '__default__';
		const data = (named ? dataOrOptions : nameOrData) as T;
		const options = (named ? maybeOptions : dataOrOptions) as LegacyJobOptions | undefined;

		if (options?.repeat?.cron && !options.repeat.pattern) {
			options.repeat.pattern = options.repeat.cron;
			delete options.repeat.cron;
		}

		return this.queue.add(name as never, data as never, options) as unknown as Promise<Job<T>>;
	}

	public process(processor: Processor<T>): void;
	public process(concurrency: number, processor: Processor<T>): void;
	public process(name: string, processor: Processor<T>): void;
	public process(name: string, concurrency: number, processor: Processor<T>): void;
	public process(nameOrConcurrencyOrProcessor: string | number | Processor<T>, concurrencyOrProcessor?: number | Processor<T>, maybeProcessor?: Processor<T>): void {
		let processor: Processor<T>;

		if (typeof nameOrConcurrencyOrProcessor === 'function') {
			processor = nameOrConcurrencyOrProcessor;
			this.defaultProcessor = processor;
		} else if (typeof nameOrConcurrencyOrProcessor === 'number') {
			processor = concurrencyOrProcessor as Processor<T>;
			this.defaultProcessor = processor;
		} else {
			processor = (typeof concurrencyOrProcessor === 'function' ? concurrencyOrProcessor : maybeProcessor) as Processor<T>;
			this.processors.set(nameOrConcurrencyOrProcessor, processor);
		}

		if (this.worker != null) return;

		const worker = new Worker<T, any, string>(this.queue.name, async job => {
			const selected = this.processors.get(job.name) ?? this.defaultProcessor;
			if (selected == null) throw new Error(`No processor registered for ${job.name}`);
			if (selected.length < 2) return selected(job);

			return new Promise<void>((resolve, reject) => {
				let completed = false;
				const done = () => {
					completed = true;
					resolve();
				};
				try {
					const result = selected(job, done);
					Promise.resolve(result).catch(reject);
				} catch (error) {
					reject(error);
				}
			});
		}, {
			connection: connectionOptions(),
			prefix: queuePrefix,
			concurrency: typeof nameOrConcurrencyOrProcessor === 'number' ? nameOrConcurrencyOrProcessor : 1,
			limiter: this.workerLimiter,
			settings: {
				backoffStrategy: apBackoff,
			},
		});

		worker.on('active', job => {
			this.emit('active', job);
		});
		worker.on('completed', (job, result) => this.emit('completed', job, result));
		worker.on('failed', (job, error) => this.emit('failed', job, error));
		worker.on('stalled', jobId => this.emit('stalled', jobId));
		worker.on('error', error => this.emit('error', null, error));
		this.worker = worker;
	}

	public getJobCounts(): Promise<Record<string, number>> {
		return this.queue.getJobCounts();
	}

	public clean(grace: number, status: 'completed' | 'wait' | 'waiting' | 'active' | 'paused' | 'prioritized' | 'delayed' | 'failed'): Promise<string[]> {
		return this.queue.clean(grace, 10000, status);
	}

	public async close(): Promise<void> {
		await this.worker?.close();
		await this.events.close();
		await this.queue.close();
	}
}

export function initialize<T>(name: string, limitPerSec = -1): Queue<T> {
	return new Queue<T>(name, limitPerSec);
}

// ref. https://github.com/misskey-dev/misskey/pull/7635#issue-971097019
function apBackoff(attemptsMade: number, type?: string) {
	if (type !== undefined && type !== 'apBackoff') return 0;
	const baseDelay = 60 * 1000; // 1min
	const maxBackoff = 8 * 60 * 60 * 1000; // 8hours
	let backoff = (Math.pow(2, attemptsMade) - 1) * baseDelay;
	backoff = Math.min(backoff, maxBackoff);
	backoff += Math.round(backoff * Math.random() * 0.2);
	return backoff;
}
