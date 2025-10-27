/**
 * Velocity metrics calculations
 */

import type {
  Artifact,
  EventMetadata,
  TMetricTrend,
  TrendMetrics,
} from '../../data/types';
import { CArtifactEvent, CMtricTrend } from '../../data/types/constants';
import { isWithinWindow } from './utils';

/**
 * Get the completed event from an event array
 * @param events - Array of events
 * @returns The completed event or null
 */
function getCompletedEvent(events: EventMetadata[]): EventMetadata | null {
  return events.find((e) => e.event === CArtifactEvent.COMPLETED) || null;
}

/**
 * Calculate the number of completed artifacts per day
 * @param completedArtifacts - Artifacts with completed status
 * @param windowDays - Time window for calculation (default: 30)
 * @returns Daily velocity
 */
export function calculateDailyVelocity(
  completedArtifacts: Artifact[],
  windowDays = 30,
): number {
  const recentCompletions = completedArtifacts.filter((artifact) => {
    const completedEvent = getCompletedEvent(artifact.metadata.events);
    return (
      completedEvent && isWithinWindow(completedEvent.timestamp, windowDays)
    );
  });

  return recentCompletions.length / windowDays;
}

/**
 * Calculate the number of completed artifacts per week
 * @param completedArtifacts - Artifacts with completed status
 * @param windowWeeks - Time window in weeks (default: 4)
 * @returns Weekly velocity
 */
export function calculateWeeklyVelocity(
  completedArtifacts: Artifact[],
  windowWeeks = 4,
): number {
  const windowDays = windowWeeks * 7;
  const recentCompletions = completedArtifacts.filter((artifact) => {
    const completedEvent = getCompletedEvent(artifact.metadata.events);
    return (
      completedEvent && isWithinWindow(completedEvent.timestamp, windowDays)
    );
  });

  return recentCompletions.length / windowWeeks;
}

/**
 * Calculate rolling average velocity
 * @param artifacts - All artifacts to analyze
 * @param windowDays - Rolling window size
 * @param stepDays - Days between each calculation (default: 1)
 * @returns Array of daily velocities
 */
export function getRollingAverage(
  artifacts: Artifact[],
  windowDays: number,
  stepDays = 1,
): number[] {
  const velocities: number[] = [];
  const now = new Date();
  const totalDays = windowDays * 2; // Look back twice the window

  for (let i = 0; i < totalDays; i += stepDays) {
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() - i);

    const completionsInWindow = artifacts.filter((artifact) => {
      const completedEvent = getCompletedEvent(artifact.metadata.events);
      return (
        completedEvent &&
        isWithinWindow(completedEvent.timestamp, windowDays, endDate)
      );
    }).length;

    velocities.push(completionsInWindow / windowDays);
  }

  return velocities.reverse(); // Oldest to newest
}

/**
 * Calculate velocity trend by comparing periods
 * @param artifacts - All artifacts to analyze
 * @param periodDays - Size of each period to compare
 * @returns Trend metrics
 */
export function getVelocityTrend(
  artifacts: Artifact[],
  periodDays = 14,
): TrendMetrics {
  const now = new Date();
  const previousStart = new Date(now);
  previousStart.setDate(previousStart.getDate() - periodDays * 2);

  // Current period
  const currentPeriodCompletions = artifacts.filter((artifact) => {
    const completedEvent = getCompletedEvent(artifact.metadata.events);
    return (
      completedEvent && isWithinWindow(completedEvent.timestamp, periodDays)
    );
  }).length;

  // Previous period
  const previousPeriodCompletions = artifacts.filter((artifact) => {
    const completedEvent = getCompletedEvent(artifact.metadata.events);
    if (!completedEvent) return false;

    const eventDate = new Date(completedEvent.timestamp);
    return (
      eventDate >= previousStart &&
      eventDate < new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
    );
  }).length;

  const current = currentPeriodCompletions / periodDays;
  const previous = previousPeriodCompletions / periodDays;
  const percentageChange =
    previous === 0 ? 100 : ((current - previous) / previous) * 100;

  let trend: TMetricTrend;
  if (percentageChange > 10) {
    trend = CMtricTrend.INCREASING;
  } else if (percentageChange < -10) {
    trend = CMtricTrend.DECREASING;
  } else {
    trend = CMtricTrend.STABLE;
  }

  return {
    current,
    previous,
    percentageChange: Number(percentageChange.toFixed(2)),
    trend,
  };
}
