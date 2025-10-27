/**
 * Event Ordering Utilities for Kodebase
 *
 * Provides utilities for sorting and validating event chronology
 * in the cascade system. Ensures events maintain proper temporal order.
 */

import type { EventMetadata, TArtifactEvent } from '../../data/types';

/**
 * Custom error class for event ordering violations
 * @class EventOrderingError
 * @description Custom error class for event ordering violations
 * @param message - The error message
 * @returns EventOrderingError
 */
export class EventOrderingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventOrderingError';
  }
}

/**
 * Sorts events by timestamp in chronological order
 *
 * @param events - Array of events to sort
 * @returns New array sorted by timestamp (oldest first)
 * @throws EventOrderingError if events are out of order
 * @example
 * const sorted = sortEventsByTimestamp(events);
 * // Events are now in chronological order
 */
export function sortEventsByTimestamp(
  events: EventMetadata[],
): EventMetadata[] {
  return [...events].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeA - timeB;
  });
}

/**
 * Validates that events are in chronological order
 *
 * @param events - Array of events to validate
 * @throws EventOrderingError if events are out of order
 * @returns void
 * @example
 * validateEventChronology(events);
 * // Throws if events are not chronologically ordered
 */
export function validateEventChronology(events: EventMetadata[]): void {
  if (events.length === 0) {
    throw new EventOrderingError(
      'Cannot validate chronology of empty events array',
    );
  }

  for (let i = 1; i < events.length; i++) {
    const prevEvent = events[i - 1];
    const currEvent = events[i];

    if (!prevEvent || !currEvent) continue;

    const prevTime = new Date(prevEvent.timestamp).getTime();
    const currTime = new Date(currEvent.timestamp).getTime();

    if (currTime < prevTime) {
      throw new EventOrderingError(
        `Events are not in chronological order: ${prevEvent.timestamp} > ${currEvent.timestamp}`,
      );
    }
  }
}

/**
 * Filters events by type
 *
 * @param events - Array of events to filter
 * @param eventType - The event type to filter for
 * @returns Array of events matching the specified type
 * @throws EventOrderingError if events are out of order
 * @example
 * const readyEvents = getEventsByType(events, CArtifactEvent.READY);
 */
export function getEventsByType(
  events: EventMetadata[],
  eventType: TArtifactEvent,
): EventMetadata[] {
  return events.filter((event) => event.event === eventType);
}

/**
 * Gets the most recent event of a specific type
 *
 * @param events - Array of events to search
 * @param eventType - The event type to find
 * @returns The most recent event of the type, or null if none found
 * @throws EventOrderingError if events are out of order
 * @example
 * const latestReady = getLatestEventByType(events, CArtifactEvent.READY);
 */
export function getLatestEventByType(
  events: EventMetadata[],
  eventType: TArtifactEvent,
): EventMetadata | null {
  const eventsOfType = getEventsByType(events, eventType);

  if (eventsOfType.length === 0) {
    return null;
  }

  // Sort by timestamp descending and return the first (most recent)
  const sorted = eventsOfType.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA; // Descending order
  });

  return sorted[0] || null;
}
