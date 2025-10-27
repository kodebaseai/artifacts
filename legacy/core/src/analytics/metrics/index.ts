/**
 * Artifact metrics calculations
 */

import type {
  Artifact,
  AverageMetrics,
  DurationMetrics,
  EventMetadata,
  Initiative,
  Issue,
  Milestone,
  ProgressMetrics,
  ScopeMetrics,
  TMetricType,
  VelocityMetrics,
} from '../../data/types';
import { CArtifactEvent, CMetricType } from '../../data/types/constants';
import { getDurationInMinutes, getDurationMetrics } from './utils';
import {
  calculateDailyVelocity,
  calculateWeeklyVelocity,
  getVelocityTrend,
} from './velocity';

export {
  calculateBusinessDays,
  formatDuration,
  getDurationInMinutes,
  getDurationMetrics,
  isWithinWindow,
} from './utils';
// Re-export utility functions and types
export {
  calculateDailyVelocity,
  calculateWeeklyVelocity,
  getRollingAverage,
  getVelocityTrend,
} from './velocity';

// ============================================================================
// Issue-level Metrics
// ============================================================================

/**
 * Calculate cycle time (in_progress → completed)
 * @param events - Event history for an artifact
 * @returns Duration in minutes, or null if not calculable
 */
export function calculateCycleTime(events: EventMetadata[]): number | null {
  const inProgressEvent = events.find(
    (e) => e.event === CArtifactEvent.IN_PROGRESS,
  );
  const completedEvent = events.find(
    (e) => e.event === CArtifactEvent.COMPLETED,
  );

  if (!inProgressEvent || !completedEvent) {
    return null;
  }

  return getDurationInMinutes(
    inProgressEvent.timestamp,
    completedEvent.timestamp,
  );
}

/**
 * Calculate lead time (draft → completed)
 * @param events - Event history for an artifact
 * @returns Duration in minutes, or null if not calculable
 */
export function calculateLeadTime(events: EventMetadata[]): number | null {
  // First event is typically draft (creation)
  const draftEvent = events[0];
  const completedEvent = events.find(
    (e) => e.event === CArtifactEvent.COMPLETED,
  );

  if (!draftEvent || !completedEvent) {
    return null;
  }

  return getDurationInMinutes(draftEvent.timestamp, completedEvent.timestamp);
}

/**
 * Calculate total time spent in blocked state
 * @param events - Event history for an artifact
 * @returns Total blocked time in minutes
 */
export function calculateBlockedTime(events: EventMetadata[]): number {
  let totalBlockedTime = 0;
  let blockStartTime: string | null = null;

  for (const event of events) {
    if (event.event === CArtifactEvent.BLOCKED) {
      blockStartTime = event.timestamp;
    } else if (blockStartTime) {
      // Artifact moved out of blocked state
      const blockedDuration = getDurationInMinutes(
        blockStartTime,
        event.timestamp,
      );
      if (blockedDuration !== null) {
        totalBlockedTime += blockedDuration;
      }
      blockStartTime = null;
    }
  }

  // If still blocked, calculate time until now
  if (blockStartTime) {
    const currentBlockedTime = getDurationInMinutes(
      blockStartTime,
      new Date().toISOString(),
    );
    if (currentBlockedTime !== null) {
      totalBlockedTime += currentBlockedTime;
    }
  }

  return totalBlockedTime;
}

/**
 * Get count of artifacts currently in progress
 * @param artifacts - Array of artifacts to analyze
 * @returns Number of artifacts in progress
 */
export function getWorkInProgressCount(artifacts: Artifact[]): number {
  return artifacts.filter((artifact) => {
    const lastEvent =
      artifact.metadata.events[artifact.metadata.events.length - 1];
    return lastEvent?.event === CArtifactEvent.IN_PROGRESS;
  }).length;
}

// ============================================================================
// Milestone-level Metrics
// ============================================================================

/**
 * Calculate milestone cycle time (first issue start → milestone completion)
 * @param milestone - The milestone artifact
 * @param issues - All issues in the milestone
 * @returns Duration metrics or null if not calculable
 */
export function calculateMilestoneCycleTime(
  milestone: Milestone,
  issues: Issue[],
): DurationMetrics | null {
  // Find the earliest in_progress event among all issues
  let earliestStart: string | null = null;

  for (const issue of issues) {
    const inProgressEvent = issue.metadata.events.find(
      (e) => e.event === CArtifactEvent.IN_PROGRESS,
    );
    if (inProgressEvent) {
      if (!earliestStart || inProgressEvent.timestamp < earliestStart) {
        earliestStart = inProgressEvent.timestamp;
      }
    }
  }

  // Find milestone completion
  const milestoneCompleted = milestone.metadata.events.find(
    (e) => e.event === CArtifactEvent.COMPLETED,
  );

  if (!earliestStart || !milestoneCompleted) {
    return null;
  }

  return getDurationMetrics(earliestStart, milestoneCompleted.timestamp);
}

/**
 * Calculate scope variance for a milestone
 * @param milestone - The milestone artifact
 * @param issues - All issues in the milestone
 * @returns Scope metrics
 */
export function calculateScopeVariance(
  milestone: Milestone,
  issues: Issue[],
): ScopeMetrics {
  // Planned scope is based on initial deliverables
  const plannedIssues = milestone.content.deliverables.length;
  const actualIssues = issues.length;
  const variance = actualIssues - plannedIssues;
  const variancePercentage =
    plannedIssues === 0 ? 0 : (variance / plannedIssues) * 100;

  return {
    plannedIssues,
    actualIssues,
    variance,
    variancePercentage: Number(variancePercentage.toFixed(2)),
  };
}

/**
 * Get progress metrics for a milestone
 * @param milestone - The milestone artifact
 * @param issues - All issues in the milestone
 * @returns Progress metrics
 */
export function getMilestoneProgress(
  _milestone: Milestone,
  issues: Issue[],
): ProgressMetrics {
  const totalIssues = issues.length;
  let completedIssues = 0;
  let inProgressIssues = 0;
  let blockedIssues = 0;

  for (const issue of issues) {
    const lastEvent = issue.metadata.events[issue.metadata.events.length - 1];
    switch (lastEvent?.event) {
      case CArtifactEvent.COMPLETED:
        completedIssues++;
        break;
      case CArtifactEvent.IN_PROGRESS:
        inProgressIssues++;
        break;
      case CArtifactEvent.BLOCKED:
        blockedIssues++;
        break;
    }
  }

  const completionPercentage =
    totalIssues === 0 ? 0 : (completedIssues / totalIssues) * 100;

  return {
    totalIssues,
    completedIssues,
    inProgressIssues,
    blockedIssues,
    completionPercentage: Number(completionPercentage.toFixed(2)),
  };
}

// ============================================================================
// Initiative-level Metrics
// ============================================================================

/**
 * Calculate initiative velocity metrics
 * @param initiative - The initiative artifact
 * @param milestones - All milestones in the initiative
 * @returns Velocity metrics
 */
export function calculateInitiativeVelocity(
  _initiative: Initiative,
  milestones: Milestone[],
): VelocityMetrics {
  const completedMilestones = milestones.filter((m) => {
    const lastEvent = m.metadata.events[m.metadata.events.length - 1];
    return lastEvent?.event === CArtifactEvent.COMPLETED;
  });

  // Use velocity functions for consistent calculations
  const issuesPerDay = calculateDailyVelocity(
    completedMilestones as Artifact[],
  );
  const issuesPerWeek = calculateWeeklyVelocity(
    completedMilestones as Artifact[],
  );

  // Calculate average cycle time for completed milestones
  const cycleTimes = completedMilestones
    .map((m) => calculateCycleTime(m.metadata.events))
    .filter((t): t is number => t !== null);

  const averageCycleTime =
    cycleTimes.length > 0
      ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
      : 0;

  const trendMetrics = getVelocityTrend(milestones as Artifact[]);

  return {
    issuesPerDay,
    issuesPerWeek,
    averageCycleTime: Number(averageCycleTime.toFixed(2)),
    trend: trendMetrics.trend,
  };
}

// ============================================================================
// Aggregation Helpers
// ============================================================================

/**
 * Calculate throughput (completed items per time period)
 * @param artifacts - All artifacts to analyze
 * @param windowDays - Time window in days
 * @returns Number of completed items per day
 */
export function getThroughput(
  artifacts: Artifact[],
  windowDays: number,
): number {
  const completedInWindow = artifacts.filter((artifact) => {
    const lastEvent =
      artifact.metadata.events[artifact.metadata.events.length - 1];
    if (lastEvent?.event !== CArtifactEvent.COMPLETED) {
      return false;
    }

    const completedDate = new Date(lastEvent.timestamp);
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    return completedDate >= windowStart;
  });

  return completedInWindow.length / windowDays;
}

/**
 * Calculate average metrics for a set of artifacts
 * @param artifacts - Artifacts to analyze
 * @param metricType - Type of metric to average
 * @returns Average metrics
 */
export function getAverageMetrics(
  artifacts: Artifact[],
  metricType: TMetricType,
): AverageMetrics {
  const values: number[] = [];

  for (const artifact of artifacts) {
    let value: number | null = null;

    switch (metricType) {
      case CMetricType.CYCLE_TIME:
        value = calculateCycleTime(artifact.metadata.events);
        break;
      case CMetricType.LEAD_TIME:
        value = calculateLeadTime(artifact.metadata.events);
        break;
      case CMetricType.BLOCKED_TIME:
        value = calculateBlockedTime(artifact.metadata.events);
        break;
    }

    if (value !== null) {
      values.push(value);
    }
  }

  if (values.length === 0) {
    return { average: 0, min: 0, max: 0, count: 0 };
  }

  return {
    average: Number(
      (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
    ),
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
  };
}
