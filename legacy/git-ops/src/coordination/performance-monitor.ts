import type { PerformanceMetrics } from '../types/coordination';

/**
 * Monitors performance impact of workflow coordination on normal Git operations
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private operationStartTimes: Map<string, number> = new Map();

  /**
   * Starts performance monitoring for an operation
   */
  startOperation(operationId: string): void {
    this.operationStartTimes.set(operationId, Date.now());
  }

  /**
   * Ends performance monitoring and records metrics
   */
  endOperation(
    operationId: string,
    gitOperationTime: number,
    artifactOperationTime: number,
    conflictResolutionTime: number = 0,
  ): PerformanceMetrics {
    const startTime = this.operationStartTimes.get(operationId);
    if (!startTime) {
      throw new Error(`No start time recorded for operation: ${operationId}`);
    }

    const totalTime = Date.now() - startTime;
    const coordinationOverhead =
      totalTime - gitOperationTime - artifactOperationTime;

    const metrics: PerformanceMetrics = {
      operationTime: totalTime,
      gitOperationTime,
      artifactOperationTime,
      conflictResolutionTime,
      impactOnNormalOperations: coordinationOverhead,
    };

    this.metrics.set(operationId, metrics);
    this.operationStartTimes.delete(operationId);

    return metrics;
  }

  /**
   * Gets performance metrics for a specific operation
   */
  getMetrics(operationId: string): PerformanceMetrics | undefined {
    return this.metrics.get(operationId);
  }

  /**
   * Gets aggregated performance statistics
   */
  getAggregatedStats(): {
    averageOperationTime: number;
    averageGitOperationTime: number;
    averageArtifactOperationTime: number;
    averageConflictResolutionTime: number;
    averageImpactOnNormalOperations: number;
    totalOperations: number;
  } {
    const allMetrics = Array.from(this.metrics.values());

    if (allMetrics.length === 0) {
      return {
        averageOperationTime: 0,
        averageGitOperationTime: 0,
        averageArtifactOperationTime: 0,
        averageConflictResolutionTime: 0,
        averageImpactOnNormalOperations: 0,
        totalOperations: 0,
      };
    }

    const totals = allMetrics.reduce(
      (acc, metrics) => ({
        operationTime: acc.operationTime + metrics.operationTime,
        gitOperationTime: acc.gitOperationTime + metrics.gitOperationTime,
        artifactOperationTime:
          acc.artifactOperationTime + metrics.artifactOperationTime,
        conflictResolutionTime:
          acc.conflictResolutionTime + metrics.conflictResolutionTime,
        impactOnNormalOperations:
          acc.impactOnNormalOperations + metrics.impactOnNormalOperations,
      }),
      {
        operationTime: 0,
        gitOperationTime: 0,
        artifactOperationTime: 0,
        conflictResolutionTime: 0,
        impactOnNormalOperations: 0,
      },
    );

    const count = allMetrics.length;

    return {
      averageOperationTime: totals.operationTime / count,
      averageGitOperationTime: totals.gitOperationTime / count,
      averageArtifactOperationTime: totals.artifactOperationTime / count,
      averageConflictResolutionTime: totals.conflictResolutionTime / count,
      averageImpactOnNormalOperations: totals.impactOnNormalOperations / count,
      totalOperations: count,
    };
  }

  /**
   * Checks if performance impact is within acceptable limits
   */
  isPerformanceAcceptable(
    operationId: string,
    maxImpactMs: number = 100,
  ): boolean {
    const metrics = this.metrics.get(operationId);
    if (!metrics) {
      return false;
    }

    return metrics.impactOnNormalOperations <= maxImpactMs;
  }

  /**
   * Generates performance report
   */
  generateReport(): string {
    const stats = this.getAggregatedStats();

    return `
Performance Report:
==================
Total Operations: ${stats.totalOperations}
Average Operation Time: ${stats.averageOperationTime.toFixed(2)}ms
Average Git Operation Time: ${stats.averageGitOperationTime.toFixed(2)}ms
Average Artifact Operation Time: ${stats.averageArtifactOperationTime.toFixed(2)}ms
Average Conflict Resolution Time: ${stats.averageConflictResolutionTime.toFixed(2)}ms
Average Impact on Normal Operations: ${stats.averageImpactOnNormalOperations.toFixed(2)}ms

Performance Status: ${stats.averageImpactOnNormalOperations <= 100 ? 'ACCEPTABLE' : 'NEEDS OPTIMIZATION'}
    `.trim();
  }

  /**
   * Clears all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.operationStartTimes.clear();
  }

  /**
   * Utility method for timing operations
   */
  async timeOperation<T>(
    _operationId: string,
    operation: () => Promise<T>,
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;

    return { result, duration };
  }
}
