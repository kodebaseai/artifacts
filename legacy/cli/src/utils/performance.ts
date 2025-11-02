/**
 * Performance monitoring utilities for the Kodebase CLI
 *
 * Ensures all operations complete within 100ms and provides
 * performance warnings when operations are slow.
 */

import { PerformanceError } from '../types/errors.js';

const PERFORMANCE_THRESHOLD_MS = 100;

export interface PerformanceMetrics {
  readonly operation: string;
  readonly duration: number;
  readonly startTime: number;
  readonly endTime: number;
  readonly exceedsThreshold: boolean;
}

/**
 * Performance timer for measuring operation duration
 */
export class PerformanceTimer {
  private readonly operation: string;
  private readonly startTime: number;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = performance.now();
  }

  /**
   * Complete timing and return metrics
   */
  complete(): PerformanceMetrics {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    const exceedsThreshold = duration > PERFORMANCE_THRESHOLD_MS;

    return {
      operation: this.operation,
      duration,
      startTime: this.startTime,
      endTime,
      exceedsThreshold,
    };
  }

  /**
   * Complete timing and throw error if exceeds threshold
   */
  completeWithCheck(): PerformanceMetrics {
    const metrics = this.complete();

    if (metrics.exceedsThreshold) {
      throw new PerformanceError(this.operation, Math.round(metrics.duration));
    }

    return metrics;
  }
}

/**
 * Decorator function to measure performance of async operations
 */
export const measurePerformance = <T>(
  operation: string,
  fn: () => Promise<T>,
): Promise<{ result: T; metrics: PerformanceMetrics }> => {
  const timer = new PerformanceTimer(operation);

  return fn().then(
    (result) => ({
      result,
      metrics: timer.complete(),
    }),
    (error) => {
      const metrics = timer.complete();
      // Attach performance info to error
      if (error instanceof Error) {
        error.message += ` (took ${Math.round(metrics.duration)}ms)`;
      }
      throw error;
    },
  );
};

/**
 * Sync version of performance measurement
 */
export const measurePerformanceSync = <T>(
  operation: string,
  fn: () => T,
): { result: T; metrics: PerformanceMetrics } => {
  const timer = new PerformanceTimer(operation);

  try {
    const result = fn();
    return {
      result,
      metrics: timer.complete(),
    };
  } catch (error) {
    const metrics = timer.complete();
    // Attach performance info to error
    if (error instanceof Error) {
      error.message += ` (took ${Math.round(metrics.duration)}ms)`;
    }
    throw error;
  }
};

/**
 * Hook for React components to measure render performance
 * Note: This requires React to be imported in the calling component
 */
export const usePerformanceTracking = (
  componentName: string,
  React: typeof import('react'),
) => {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null);

  React.useEffect(() => {
    const timer = new PerformanceTimer(`render-${componentName}`);

    return () => {
      const renderMetrics = timer.complete();
      setMetrics(renderMetrics);

      // Warn in development if rendering is slow
      if (
        renderMetrics.exceedsThreshold &&
        process.env.NODE_ENV === 'development'
      ) {
        console.warn(
          `Component ${componentName} took ${Math.round(renderMetrics.duration)}ms to render (exceeds 100ms threshold)`,
        );
      }
    };
  }, [componentName]);

  return metrics;
};
