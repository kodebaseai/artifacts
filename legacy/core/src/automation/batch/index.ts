/**
 * Batch Operations for Kodebase Artifacts
 *
 * Provides efficient parallel processing of multiple artifacts with:
 * - Parallel validation using available CPU cores
 * - Bulk status updates with error isolation
 * - Progress reporting for long-running operations
 * - Memory-efficient streaming for large collections
 * - Target performance: 100+ artifacts in seconds
 */

import { cpus } from 'node:os';

// Re-export implementations
export { BatchProcessor } from './processor';
export { createBulkStatusUpdater } from './status-updater';
// Re-export all types
export * from './types';
export { createBatchValidator } from './validator';

import { BatchProcessor } from './processor';
import { createBulkStatusUpdater } from './status-updater';
// Import types for local use
import type { BatchOperations, BatchValidationConfig } from './types';
import { createBatchValidator } from './validator';

/**
 * Default configuration values
 */
export const DEFAULT_BATCH_CONFIG: Required<BatchValidationConfig> = {
  maxConcurrency: Math.min(cpus().length, 8), // Utilize available cores but cap at 8
  chunkSize: 50, // Process 50 items per chunk for memory efficiency
  progressCallback: () => {}, // No-op default
  memoryLimit: 512, // 512MB memory limit
};

/**
 * Creates a complete batch operations suite
 */
export function createBatchOperations(): BatchOperations {
  const processor = new BatchProcessor();
  const validator = createBatchValidator();
  const statusUpdater = createBulkStatusUpdater();

  return {
    processor,
    validator,
    statusUpdater,
  };
}

/**
 * Utility to estimate memory usage for batch operations
 */
export function estimateMemoryUsage(
  itemCount: number,
  avgItemSizeKB: number = 5,
): number {
  // Estimate based on average artifact size and concurrency overhead
  const baseMB = (itemCount * avgItemSizeKB) / 1024;
  const concurrencyOverhead = DEFAULT_BATCH_CONFIG.maxConcurrency * 2; // 2MB per core
  return baseMB + concurrencyOverhead;
}

/**
 * Chunks an array into smaller arrays of specified size
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
