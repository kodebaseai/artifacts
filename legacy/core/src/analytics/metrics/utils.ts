/**
 * Utility functions for metrics calculations
 */

/**
 * Calculate duration between two ISO 8601 timestamps
 * @param startTime - Start timestamp in ISO 8601 format
 * @param endTime - End timestamp in ISO 8601 format
 * @returns Duration in minutes, or null if invalid timestamps
 */
export function getDurationInMinutes(
  startTime: string,
  endTime: string,
): number | null {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }

    const durationMs = end.getTime() - start.getTime();
    return Math.floor(durationMs / (1000 * 60));
  } catch {
    return null;
  }
}

/**
 * Calculate duration between two timestamps in various units
 * @param startTime - Start timestamp in ISO 8601 format
 * @param endTime - End timestamp in ISO 8601 format
 * @returns Duration in multiple units
 */
export interface DurationMetrics {
  minutes: number;
  hours: number;
  days: number;
  businessDays?: number;
}

/**
 * Calculate duration between two timestamps in various units
 * @param startTime - Start timestamp in ISO 8601 format
 * @param endTime - End timestamp in ISO 8601 format
 * @param excludeWeekends - Whether to exclude weekends
 * @returns Duration in multiple units
 */
export function getDurationMetrics(
  startTime: string,
  endTime: string,
  excludeWeekends = false,
): DurationMetrics | null {
  const minutes = getDurationInMinutes(startTime, endTime);
  if (minutes === null) return null;

  const metrics: DurationMetrics = {
    minutes,
    hours: Number((minutes / 60).toFixed(2)),
    days: Number((minutes / (60 * 24)).toFixed(2)),
  };

  if (excludeWeekends) {
    metrics.businessDays = calculateBusinessDays(startTime, endTime);
  }

  return metrics;
}

/**
 * Calculate business days between two dates (excluding weekends)
 * @param startTime - Start timestamp
 * @param endTime - End timestamp
 * @returns Number of business days
 */
export function calculateBusinessDays(
  startTime: string,
  endTime: string,
): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  let count = 0;

  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Not Sunday (0) or Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Check if a date is within a time window
 * @param date - Date to check
 * @param windowDays - Number of days in the window
 * @param endDate - End date of the window (defaults to now)
 * @returns True if date is within window
 */
export function isWithinWindow(
  date: string,
  windowDays: number,
  endDate: Date = new Date(),
): boolean {
  const dateObj = new Date(date);
  const windowStart = new Date(endDate);
  windowStart.setDate(windowStart.getDate() - windowDays);

  return dateObj >= windowStart && dateObj <= endDate;
}

/**
 * Format duration for human-readable display
 * @param minutes - Duration in minutes
 * @returns Formatted string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours} hours`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (remainingHours > 0) {
    return `${days}d ${remainingHours}h`;
  }
  return `${days} days`;
}
