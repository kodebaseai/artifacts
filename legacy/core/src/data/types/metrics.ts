/**
 * Metrics-related type definitions
 */

import type { CMetricType, CMtricTrend } from './constants';

// ============================================================================
// Type Aliases
// ============================================================================

/**
 * Type aliases for constants
 *
 * These types are inferred from the constant objects to ensure type safety.
 * The T prefix indicates a type alias derived from a constant.
 * @property TMetricTrend - The type for a metric trend
 * @property TMetricType - The type for a metric type
 */
export type TMetricTrend = (typeof CMtricTrend)[keyof typeof CMtricTrend];
export type TMetricType = (typeof CMetricType)[keyof typeof CMetricType];

// ============================================================================
// Duration and Time Metrics
// ============================================================================

/**
 * Duration metrics in various units
 * @property minutes - The number of minutes
 * @property hours - The number of hours
 * @property days - The number of days
 * @property businessDays - The number of business days
 */
export interface DurationMetrics {
  minutes: number;
  hours: number;
  days: number;
  businessDays?: number;
}

// ============================================================================
// Progress and Completion Metrics
// ============================================================================

/**
 * Progress metrics for artifacts
 * @property totalIssues - The total number of issues
 * @property completedIssues - The number of completed issues
 * @property inProgressIssues - The number of issues in progress
 * @property blockedIssues - The number of blocked issues
 * @property completionPercentage - The completion percentage
 */
export interface ProgressMetrics {
  totalIssues: number;
  completedIssues: number;
  inProgressIssues: number;
  blockedIssues: number;
  completionPercentage: number;
}

/**
 * Scope variance metrics
 * @property plannedIssues - The number of planned issues
 * @property actualIssues - The number of actual issues
 * @property variance - The variance between planned and actual issues
 * @property variancePercentage - The percentage variance between planned and actual issues
 */
export interface ScopeMetrics {
  plannedIssues: number;
  actualIssues: number;
  variance: number;
  variancePercentage: number;
}

/**
 * Average metrics result
 * @property average - The average value
 * @property min - The minimum value
 * @property max - The maximum value
 * @property count - The number of values
 */
export interface AverageMetrics {
  average: number;
  min: number;
  max: number;
  count: number;
}

// ============================================================================
// Velocity Metrics
// ============================================================================

/**
 * Velocity metrics result
 * @property issuesPerDay - The number of issues per day
 * @property issuesPerWeek - The number of issues per week
 * @property averageCycleTime - The average cycle time
 * @property trend - The trend of the metric
 */
export interface VelocityMetrics {
  issuesPerDay: number;
  issuesPerWeek: number;
  averageCycleTime: number;
  trend: TMetricTrend;
}

/**
 * Trend metrics for velocity analysis
 * @property current - The current value
 * @property previous - The previous value
 * @property percentageChange - The percentage change between current and previous
 * @property trend - The trend of the metric
 */
export interface TrendMetrics {
  current: number;
  previous: number;
  percentageChange: number;
  trend: TMetricTrend;
}
