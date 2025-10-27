/**
 * Tests for Batch Operations
 *
 * Validates all acceptance criteria:
 * - Batch validation processes multiple artifacts in parallel
 * - Bulk status updates handle collections efficiently
 * - Parallel processing utilizes available CPU cores
 * - Progress reporting for long-running batch operations
 * - Error isolation prevents single failure from stopping entire batch
 * - Memory-efficient processing for large artifact collections
 * - Target performance: process 100+ artifacts in seconds
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { Artifact, TArtifactEvent } from '../../data/types';
import {
  CArtifactEvent,
  CEstimationSize,
  CEventTrigger,
  CPriority,
} from '../../data/types/constants';
import {
  BatchProcessor,
  chunkArray,
  createBatchOperations,
  createBatchValidator,
  createBulkStatusUpdater,
  DEFAULT_BATCH_CONFIG,
  estimateMemoryUsage,
} from './index';

// Helper function to create test data with all required fields
function createTestIssue(id: string): Artifact {
  return {
    metadata: {
      events: [
        {
          timestamp: '2025-07-16T11:32:49Z',
          event: CArtifactEvent.DRAFT,
          actor: 'Miguel Carvalho (m@kodebase.ai)',
          trigger: CEventTrigger.ARTIFACT_CREATED,
        },
      ],
      title: `Test Issue ${id}`,
      priority: CPriority.MEDIUM,
      estimation: CEstimationSize.M,
      created_by: 'Miguel Carvalho (m@kodebase.ai)',
      assignee: 'Miguel Carvalho (m@kodebase.ai)',
      schema_version: '0.2.0',
      relationships: {
        blocks: [],
        blocked_by: [],
      },
    },
    content: {
      summary: `Test issue ${id} summary`,
      acceptance_criteria: [`Criterion 1 for ${id}`, `Criterion 2 for ${id}`],
    },
  };
}

describe('Batch Operations', () => {
  let artifacts: Artifact[];
  let progressCalls: Array<{
    current: number;
    total: number;
    operation: string;
  }>;

  beforeEach(() => {
    // Create test artifacts
    artifacts = Array.from({ length: 10 }, (_, i) =>
      createTestIssue(`A.1.${i + 1}`),
    );

    progressCalls = [];
  });

  describe('BatchProcessor', () => {
    it('should process artifacts in parallel with error isolation', async () => {
      const processor = new BatchProcessor();
      let processedCount = 0;

      const result = await processor.processArtifacts(
        artifacts,
        async (artifact) => {
          // Simulate some processing time
          await new Promise((resolve) => setTimeout(resolve, 10));

          // Simulate failure for every 3rd artifact
          if (
            artifact.metadata.title.includes('3') ||
            artifact.metadata.title.includes('6')
          ) {
            throw new Error(`Simulated failure for ${artifact.metadata.title}`);
          }

          processedCount++;
          return `Processed ${artifact.metadata.title}`;
        },
        {
          maxConcurrency: 4,
          chunkSize: 5,
          progressCallback: (current, total, operation) => {
            progressCalls.push({ current, total, operation });
          },
        },
      );

      // Verify error isolation - processing continues despite failures
      expect(result.totalItems).toBe(10);
      expect(result.succeeded).toBe(8); // 2 failures expected
      expect(result.failed).toBe(2);
      expect(result.coresUtilized).toBe(4);
      expect(result.processingTimeMs).toBeGreaterThan(0);

      // Verify all items were attempted
      expect(processedCount).toBe(8); // Only successful ones increment counter

      // Verify progress reporting
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(
        progressCalls.some((call) => call.operation === 'Processing artifacts'),
      ).toBe(true);

      // Verify successful results
      const successfulResults = result.results.filter((r) => r.success);
      const failedResults = result.results.filter((r) => !r.success);

      expect(successfulResults).toHaveLength(8);
      expect(failedResults).toHaveLength(2);

      // Check specific results with null safety
      expect(successfulResults[0]?.result).toContain('Processed');
      expect(successfulResults[1]?.result).toContain('Processed');
      expect(failedResults[0]?.error).toContain('Simulated failure');
    });

    it('should utilize CPU cores efficiently', async () => {
      const processor = new BatchProcessor();
      const maxConcurrency = Math.min(require('node:os').cpus().length, 8);

      const result = await processor.processArtifacts(
        artifacts,
        async (_artifact) => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return 'processed';
        },
        { maxConcurrency },
      );

      expect(result.coresUtilized).toBe(maxConcurrency);
    });

    it('should respect memory limits', async () => {
      const processor = new BatchProcessor();

      // Test with very low memory limit
      await expect(
        processor.processArtifacts(
          Array.from({ length: 1000 }, (_, i) => createTestIssue(`B.${i}`)),
          async (_artifact) => 'processed',
          { memoryLimit: 1 }, // 1MB limit should be exceeded
        ),
      ).rejects.toThrow('Estimated memory usage');
    });

    it('should chunk large collections for memory efficiency', async () => {
      const processor = new BatchProcessor();

      const result = await processor.processArtifacts(
        Array.from({ length: 100 }, (_, i) => createTestIssue(`C.${i}`)),
        async (_artifact) => 'processed',
        {
          chunkSize: 25,
          maxConcurrency: 4,
        },
      );

      expect(result.totalItems).toBe(100);
      expect(result.succeeded).toBe(100);
      expect(result.failed).toBe(0);
    });
  });

  describe('BatchValidator', () => {
    it('should validate multiple artifacts in parallel', async () => {
      const validator = createBatchValidator();

      // Create test data (mix of valid and invalid)
      // Use a valid artifact from our helper, then create an invalid one
      const validArtifact = createTestIssue('TEST.1');
      const invalidArtifact = {
        metadata: {
          title: 'Invalid Issue',
          priority: 'invalid_priority', // This should cause validation failure
          estimation: 'M',
          created_by: 'Test User (test@example.com)',
          assignee: 'Test User (test@example.com)',
          schema_version: '0.2.0',
          relationships: { blocks: [], blocked_by: [] },
          events: [], // Empty events array - invalid
        },
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Criterion 1'],
        },
      };

      const testData = [validArtifact, invalidArtifact];

      const result = await validator.validateArtifacts(testData, {
        maxConcurrency: 2,
        progressCallback: (current, total, operation) => {
          progressCalls.push({ current, total, operation });
        },
      });

      expect(result.totalItems).toBe(2);
      expect(result.succeeded).toBe(1); // Valid artifact should succeed
      expect(result.failed).toBe(1); // Invalid artifact should fail

      // Verify progress reporting
      expect(
        progressCalls.some((call) => call.operation === 'Validating artifacts'),
      ).toBe(true);

      // Verify error isolation
      const successfulResult = result.results.find((r) => r.success);
      expect(successfulResult).toBeDefined();
      expect(successfulResult?.result).toBeDefined();

      const failedResult = result.results.find((r) => !r.success);
      expect(failedResult).toBeDefined();
      expect(failedResult?.error).toContain('validation failed');
    });
  });

  describe('BulkStatusUpdater', () => {
    it('should update statuses in parallel with error isolation', async () => {
      const updater = createBulkStatusUpdater();

      // Create artifacts in draft state
      const testArtifacts = artifacts.map((artifact) => ({
        ...artifact,
        metadata: {
          ...artifact.metadata,
          events: [
            {
              timestamp: '2025-01-01T00:00:00Z',
              event: CArtifactEvent.DRAFT as TArtifactEvent,
              actor: 'Test User (test@example.com)',
              trigger: CEventTrigger.ARTIFACT_CREATED,
            },
          ],
        },
      }));

      const result = await updater.updateStatuses(
        testArtifacts,
        CArtifactEvent.READY,
        {
          actor: 'Test User (test@example.com)',
          maxConcurrency: 3,
          validateTransitions: true,
          progressCallback: (current, total, operation) => {
            progressCalls.push({ current, total, operation });
          },
        },
      );

      expect(result.totalItems).toBe(10);
      expect(result.succeeded).toBe(10);
      expect(result.failed).toBe(0);
      expect(result.coresUtilized).toBe(3);

      // Verify progress reporting
      expect(
        progressCalls.some((call) => call.operation.includes('ready')),
      ).toBe(true);

      // Verify artifacts were actually updated
      testArtifacts.forEach((artifact) => {
        const latestEvent =
          artifact.metadata.events[artifact.metadata.events.length - 1];
        expect(latestEvent?.event).toBe(CArtifactEvent.READY);
      });
    });

    it('should handle invalid transitions with error isolation', async () => {
      const updater = createBulkStatusUpdater();

      // Create artifacts in completed state (can't transition to in_progress)
      const testArtifacts = artifacts.map((artifact) => ({
        ...artifact,
        metadata: {
          ...artifact.metadata,
          events: [
            {
              timestamp: '2025-01-01T00:00:00Z',
              event: CArtifactEvent.COMPLETED as TArtifactEvent,
              actor: 'Test User (test@example.com)',
              trigger: CEventTrigger.ARTIFACT_CREATED,
            },
          ],
        },
      }));

      const result = await updater.updateStatuses(
        testArtifacts,
        CArtifactEvent.IN_PROGRESS, // Invalid transition from completed
        {
          actor: 'Test User (test@example.com)',
          validateTransitions: true,
          maxConcurrency: 2, // Reduce concurrency to avoid overwhelming the system
          progressCallback: (_current, _totall_operationon) => {
            // Progress tracking for test
          },
        },
      );

      expect(result.totalItems).toBe(10);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(10);

      // All should have failed with invalid transition errors
      result.results.forEach((result) => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid transition');
      });
    });
  });

  describe('Performance Tests', () => {
    it('should process 100+ artifacts in seconds', async () => {
      const processor = new BatchProcessor();
      const largeArtifactSet = Array.from({ length: 150 }, (_, i) =>
        createTestIssue(`PERF.${i}`),
      );

      const startTime = Date.now();

      const result = await processor.processArtifacts(
        largeArtifactSet,
        async (artifact) => `Processed ${artifact.metadata.title}`,
        {
          maxConcurrency: Math.min(require('node:os').cpus().length, 8),
          memoryLimit: 512, // 512MB limit
          progressCallback: (current, total, operation) => {
            progressCalls.push({ current, total, operation });
          },
        },
      );

      const endTime = Date.now();
      const processingTimeSeconds = (endTime - startTime) / 1000;

      // Should process 150 artifacts in under 10 seconds (generous target)
      expect(processingTimeSeconds).toBeLessThan(10);
      expect(result.totalItems).toBe(150);
      expect(result.succeeded).toBe(150);

      // Verify throughput
      const artifactsPerSecond =
        result.totalItems / (result.processingTimeMs / 1000);
      expect(artifactsPerSecond).toBeGreaterThan(15); // At least 15 artifacts/second
    });
  });

  describe('Utility Functions', () => {
    it('should estimate memory usage correctly', () => {
      const memory100 = estimateMemoryUsage(100);
      const memory1000 = estimateMemoryUsage(1000);

      expect(memory100).toBeGreaterThan(0);
      expect(memory1000).toBeGreaterThan(memory100);
      expect(memory1000).toBeLessThan(100); // Should be reasonable estimate
    });

    it('should chunk arrays correctly', () => {
      const array = Array.from({ length: 23 }, (_, i) => i);
      const chunks = chunkArray(array, 5);

      expect(chunks).toHaveLength(5); // 23 items in chunks of 5 = 5 chunks
      expect(chunks[0]).toHaveLength(5);
      expect(chunks[4]).toHaveLength(3); // Last chunk has remainder

      // Verify all items are preserved
      const flattened = chunks.flat();
      expect(flattened).toHaveLength(23);
      expect(flattened).toEqual(array);
    });
  });

  describe('Configuration and Defaults', () => {
    it('should use sensible default configuration', () => {
      expect(DEFAULT_BATCH_CONFIG.maxConcurrency).toBeGreaterThan(0);
      expect(DEFAULT_BATCH_CONFIG.maxConcurrency).toBeLessThanOrEqual(8);
      expect(DEFAULT_BATCH_CONFIG.chunkSize).toBe(50);
      expect(DEFAULT_BATCH_CONFIG.memoryLimit).toBe(512);
      expect(typeof DEFAULT_BATCH_CONFIG.progressCallback).toBe('function');
    });

    it('should create complete batch operations suite', () => {
      const operations = createBatchOperations();

      expect(operations.processor).toBeDefined();
      expect(operations.validator).toBeDefined();
      expect(operations.statusUpdater).toBeDefined();

      expect(typeof operations.processor.processArtifacts).toBe('function');
      expect(typeof operations.validator.validateArtifacts).toBe('function');
      expect(typeof operations.statusUpdater.updateStatuses).toBe('function');
    });
  });
});
