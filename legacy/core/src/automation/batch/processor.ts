/**
 * Core Batch Processor
 *
 * Implements parallel processing with CPU core utilization, memory management,
 * and progress reporting for processing multiple artifacts efficiently.
 */

import type {
  BatchItemResult,
  BatchResult,
  BatchValidationConfig,
  ProgressCallback,
} from './index';
import { chunkArray, DEFAULT_BATCH_CONFIG } from './index';

/**
 * Core batch processor for parallel artifact operations
 */
export class BatchProcessor {
  /**
   * Process multiple items in parallel with error isolation
   *
   * @param items - Array of items to process
   * @param processor - Function to apply to each item
   * @param config - Processing configuration
   * @returns Batch processing result
   */
  async processArtifacts<TInput, TOutput>(
    items: TInput[],
    processor: (item: TInput) => Promise<TOutput>,
    config: BatchValidationConfig = {},
  ): Promise<BatchResult<TOutput>> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    // Merge with defaults
    const { maxConcurrency, chunkSize, progressCallback, memoryLimit } = {
      ...DEFAULT_BATCH_CONFIG,
      ...config,
    };

    // Validate memory requirements
    const estimatedMemoryMB = this.estimateProcessingMemory(items.length);
    if (estimatedMemoryMB > memoryLimit) {
      throw new Error(
        `Estimated memory usage (${estimatedMemoryMB}MB) exceeds limit (${memoryLimit}MB). ` +
          `Consider reducing chunkSize or increasing memoryLimit.`,
      );
    }

    const results: BatchItemResult<TOutput>[] = [];
    let succeeded = 0;
    let failed = 0;
    let processed = 0;

    // Process in chunks for memory efficiency
    const chunks = chunkArray(items, chunkSize);

    for (const chunk of chunks) {
      const chunkResults = await this.processChunk<TInput, TOutput>(
        chunk,
        processor,
        maxConcurrency,
        (localCurrent, _localTotal) => {
          const globalCurrent = processed + localCurrent;
          progressCallback?.(
            globalCurrent,
            items.length,
            'Processing artifacts',
          );
        },
      );

      results.push(...chunkResults);

      // Update totals
      succeeded += chunkResults.filter((r) => r.success).length;
      failed += chunkResults.filter((r) => !r.success).length;
      processed += chunk.length;

      // Report progress
      progressCallback?.(processed, items.length, 'Processing artifacts');
    }

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();

    return {
      totalItems: items.length,
      succeeded,
      failed,
      results,
      processingTimeMs: endTime - startTime,
      memoryUsageMB: endMemory - startMemory,
      coresUtilized: maxConcurrency,
    };
  }

  /**
   * Process a single chunk with controlled concurrency
   */
  private async processChunk<TInput, TOutput>(
    items: TInput[],
    processor: (item: TInput) => Promise<TOutput>,
    maxConcurrency: number,
    progressCallback: ProgressCallback,
  ): Promise<BatchItemResult<TOutput>[]> {
    const results: BatchItemResult<TOutput>[] = [];
    const semaphore = new Semaphore(maxConcurrency);

    const promises = items.map(async (item, index) => {
      const itemStartTime = performance.now();

      try {
        await semaphore.acquire();

        try {
          const result = await processor(item);
          const itemEndTime = performance.now();

          const itemResult: BatchItemResult<TOutput> = {
            id: this.getArtifactId(item),
            success: true,
            result,
            processingTimeMs: itemEndTime - itemStartTime,
          };

          results[index] = itemResult;
          progressCallback(index + 1, items.length, 'Processing item');
        } finally {
          semaphore.release();
        }
      } catch (error) {
        const itemEndTime = performance.now();

        const itemResult: BatchItemResult<TOutput> = {
          id: this.getArtifactId(item),
          success: false,
          error: error instanceof Error ? error.message : String(error),
          processingTimeMs: itemEndTime - itemStartTime,
        };

        results[index] = itemResult;
        progressCallback(index + 1, items.length, 'Processing item');
      }
    });

    await Promise.all(promises);

    // Results array may have gaps due to parallel processing, filter them out
    return results.filter(Boolean);
  }

  /**
   * Get unique identifier for an item (used for progress tracking)
   *
   * @param item - Item to get identifier for
   * @returns Unique identifier string
   */
  // biome-ignore lint/suspicious/noExplicitAny: Generic utility function needs to work with arbitrary object types from different input sources
  private getArtifactId(item: any): string {
    // Try common ID patterns
    if (item?.metadata?.title) {
      return item.metadata.title;
    }
    if (item?.id) {
      return item.id;
    }
    if (item?.name) {
      return item.name;
    }

    // Fallback to object hash
    return `item_${JSON.stringify(item).slice(0, 20)}`;
  }

  /**
   * Simple hash function for generating IDs
   */
  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Estimate memory usage for processing
   */
  private estimateProcessingMemory(itemCount: number): number {
    // Base estimation: 5KB per artifact + concurrency overhead
    const baseKB = itemCount * 5;
    const concurrencyOverheadKB = DEFAULT_BATCH_CONFIG.maxConcurrency * 1024; // 1MB per core
    return (baseKB + concurrencyOverheadKB) / 1024; // Convert to MB
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024;
    }
    return 0; // Fallback for non-Node environments
  }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waitingQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waitingQueue.push(resolve);
    });
  }

  release(): void {
    const next = this.waitingQueue.shift();
    if (next) {
      next();
    } else {
      this.permits++;
    }
  }
}
