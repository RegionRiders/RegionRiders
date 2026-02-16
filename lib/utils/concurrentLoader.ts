/**
 * Utility to limit concurrent async operations
 * Prevents overloading browser with too many parallel requests
 */

export class ConcurrentLoader<T> {
  private queue: Array<() => Promise<T>> = [];
  private activeCount = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Add task to queue and process
   */
  async add(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process queue up to concurrency limit
   */
  private async processQueue(): Promise<void> {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.activeCount++;
    const task = this.queue.shift();

    if (task) {
      try {
        await task();
      } finally {
        this.activeCount--;
        this.processQueue(); // Process next
      }
    }
  }

  /**
   * Get current queue stats
   */
  getStats() {
    return {
      queued: this.queue.length,
      active: this.activeCount,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

/**
 * Load items in batches with concurrency control
 */
export async function loadInBatches<T, R>(
  items: T[],
  loader: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    maxConcurrent?: number;
    onProgress?: (loaded: number, total: number) => void;
  } = {}
): Promise<R[]> {
  const { batchSize = 25, maxConcurrent = 5, onProgress } = options;

  const results: R[] = [];
  const total = items.length;
  let loaded = 0;

  // Process in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const concurrentLoader = new ConcurrentLoader<R>(maxConcurrent);

    const batchResults = await Promise.all(
      batch.map((item) => concurrentLoader.add(() => loader(item)))
    );

    results.push(...batchResults);
    loaded += batch.length;

    if (onProgress) {
      onProgress(loaded, total);
    }
  }

  return results;
}

/**
 * Load all items with concurrency limit and error handling
 */
export async function loadAllWithLimit<T, R>(
  items: T[],
  loader: (item: T) => Promise<R>,
  maxConcurrent: number = 5
): Promise<Array<{ success: true; result: R; item: T } | { success: false; error: Error; item: T }>> {
  const concurrentLoader = new ConcurrentLoader<
    { success: true; result: R; item: T } | { success: false; error: Error; item: T }
  >(maxConcurrent);

  const promises = items.map((item) =>
    concurrentLoader.add(async () => {
      try {
        const result = await loader(item);
        return { success: true as const, result, item };
      } catch (error) {
        return { success: false as const, error: error as Error, item };
      }
    })
  );

  return Promise.all(promises);
}
