/**
 * Type definitions for batch operations
 */

import type { ArtifactSchema } from '../../data/schemas';
import type { Artifact, TArtifactEvent } from '../../data/types';

/**
 * Progress reporting callback
 */
export type ProgressCallback = (
  current: number,
  total: number,
  operation: string,
) => void;

/**
 * Batch processing result with detailed statistics
 */
export interface BatchResult<T = unknown> {
  totalItems: number;
  succeeded: number;
  failed: number;
  results: BatchItemResult<T>[];
  processingTimeMs: number;
  memoryUsageMB: number;
  coresUtilized: number;
}

/**
 * Individual item result within a batch
 */
export interface BatchItemResult<T = unknown> {
  id: string;
  success: boolean;
  result?: T;
  error?: string;
  processingTimeMs: number;
}

/**
 * Batch validation configuration
 */
export interface BatchValidationConfig {
  maxConcurrency?: number;
  chunkSize?: number;
  progressCallback?: ProgressCallback;
  memoryLimit?: number; // MB
}

/**
 * Bulk status update configuration
 */
export interface BulkStatusUpdateConfig {
  maxConcurrency?: number;
  actor: string;
  metadata?: Record<string, unknown>;
  progressCallback?: ProgressCallback;
  validateTransitions?: boolean;
}

/**
 * Batch processor interface
 */
export interface BatchProcessor {
  processArtifacts<TInput, TOutput>(
    items: TInput[],
    processor: (item: TInput) => Promise<TOutput>,
    config?: BatchValidationConfig,
  ): Promise<BatchResult<TOutput>>;
}

/**
 * Batch validator interface
 */
export interface BatchValidator {
  validateArtifacts(
    artifactData: unknown[],
    config?: BatchValidationConfig,
  ): Promise<BatchResult<ArtifactSchema>>;

  validateArtifactPaths(
    paths: string[],
    config?: BatchValidationConfig,
  ): Promise<BatchResult<ArtifactSchema>>;
}

/**
 * Bulk status updater interface
 */
export interface BulkStatusUpdater {
  updateStatuses(
    artifacts: Artifact[],
    targetState: TArtifactEvent,
    config: BulkStatusUpdateConfig,
  ): Promise<BatchResult<void>>;

  updateStatusesByIds(
    artifactIds: string[],
    targetState: TArtifactEvent,
    artifactLoader: (id: string) => Promise<Artifact>,
    config: BulkStatusUpdateConfig,
  ): Promise<BatchResult<void>>;
}

/**
 * Main batch operations interface
 */
export interface BatchOperations {
  processor: BatchProcessor;
  validator: BatchValidator;
  statusUpdater: BulkStatusUpdater;
}

/**
 * Batch operation statistics for monitoring
 */
export interface BatchStatistics {
  totalProcessed: number;
  averageProcessingTime: number;
  throughputPerSecond: number;
  memoryEfficiency: number; // MB per item
  coreUtilization: number; // Percentage of available cores used
}

/**
 * Memory usage tracking for batch operations
 */
export interface MemoryUsage {
  startMB: number;
  endMB: number;
  peakMB: number;
  averageMB: number;
}

/**
 * Performance metrics for batch operations
 */
export interface PerformanceMetrics {
  processingTimeMs: number;
  itemsPerSecond: number;
  memoryUsage: MemoryUsage;
  errorRate: number;
  coresUtilized: number;
}

/**
 * Progress tracking information
 */
export interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  operation: string;
  estimatedTimeRemainingMs?: number;
  itemsPerSecond?: number;
}
