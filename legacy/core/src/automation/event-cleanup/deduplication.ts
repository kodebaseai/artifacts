/**
 * Event Deduplication Utilities
 *
 * Detects and removes duplicate events based on timestamp, event type, and actor.
 * Preserves chronological order and handles edge cases like simultaneous events.
 */

import type { EventMetadata } from '../../data/types';
import {
  type DuplicateEvent,
  type DuplicationCriteria,
  type EdgeCaseConfig,
  type EventDeduplicationResult,
  ManualCorrections,
  SimultaneousEvents,
} from './types';

/**
 * Default criteria for identifying duplicate events
 */
const DEFAULT_DUPLICATION_CRITERIA: DuplicationCriteria = {
  checkTimestamp: true,
  checkEventType: true,
  checkActor: true,
  timestampTolerance: 60000, // 1 minute tolerance
};

/**
 * Default edge case configuration
 */
const DEFAULT_EDGE_CASE_CONFIG: EdgeCaseConfig = {
  simultaneousEvents: SimultaneousEvents.KEEP_FIRST,
  manualCorrections: ManualCorrections.PRESERVE,
  manualCorrectionPattern: /manual|correction|fix/i,
  systemActorPattern: /system|automation|cascade/i,
};

/**
 * Detects duplicate events in an array
 *
 * @param events - Array of events to check for duplicates
 * @param criteria - Criteria for identifying duplicates
 * @param edgeConfig - Configuration for handling edge cases
 * @returns Array of duplicate event information
 */
export function detectDuplicateEvents(
  events: EventMetadata[],
  criteria: Partial<DuplicationCriteria> = {},
  edgeConfig: Partial<EdgeCaseConfig> = {},
): DuplicateEvent[] {
  const fullCriteria = { ...DEFAULT_DUPLICATION_CRITERIA, ...criteria };
  const fullEdgeConfig = { ...DEFAULT_EDGE_CASE_CONFIG, ...edgeConfig };
  const duplicates: DuplicateEvent[] = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const event1 = events[i];
      const event2 = events[j];

      if (
        event1 &&
        event2 &&
        areEventsDuplicate(event1, event2, fullCriteria)
      ) {
        // Determine which to keep based on edge case rules
        const { keepFirst, reason } = determineKeepStrategy(
          event1,
          event2,
          fullEdgeConfig,
        );

        const originalIndex = keepFirst ? i : j;
        const duplicateIndex = keepFirst ? j : i;
        const duplicateEvent = keepFirst ? event2 : event1;

        duplicates.push({
          originalIndex,
          duplicateIndex,
          event: duplicateEvent,
          reason,
        });
      }
    }
  }

  return duplicates;
}

/**
 * Removes duplicate events from an array while preserving order
 *
 * @param events - Array of events to deduplicate
 * @param criteria - Criteria for identifying duplicates
 * @param edgeConfig - Configuration for handling edge cases
 * @returns Deduplication result with cleaned events
 */
export function deduplicateEvents(
  events: EventMetadata[],
  criteria: Partial<DuplicationCriteria> = {},
  edgeConfig: Partial<EdgeCaseConfig> = {},
): EventDeduplicationResult {
  const duplicates = detectDuplicateEvents(events, criteria, edgeConfig);

  if (duplicates.length === 0) {
    return {
      hadDuplicates: false,
      duplicatesRemoved: 0,
      duplicates: [],
      cleanedEvents: [...events],
      summary: 'No duplicate events found',
    };
  }

  // Get unique indices to remove (sorted in descending order to remove from end first)
  const indicesToRemove = [
    ...new Set(duplicates.map((d) => d.duplicateIndex)),
  ].sort((a, b) => b - a);

  // Remove duplicates
  const cleanedEvents = [...events];
  for (const index of indicesToRemove) {
    cleanedEvents.splice(index, 1);
  }

  const actualRemoved = indicesToRemove.length;
  const summary = `Removed ${actualRemoved} duplicate event${actualRemoved === 1 ? '' : 's'}`;

  return {
    hadDuplicates: true,
    duplicatesRemoved: actualRemoved,
    duplicates,
    cleanedEvents,
    summary,
  };
}

/**
 * Checks if two events are duplicates based on criteria
 *
 * @param event1 - First event
 * @param event2 - Second event
 * @param criteria - Criteria for comparison
 * @returns True if events are considered duplicates
 */
function areEventsDuplicate(
  event1: EventMetadata,
  event2: EventMetadata,
  criteria: DuplicationCriteria,
): boolean {
  // Check event type
  if (criteria.checkEventType && event1.event !== event2.event) {
    return false;
  }

  // Check actor
  if (criteria.checkActor && event1.actor !== event2.actor) {
    return false;
  }

  // Check timestamp
  if (criteria.checkTimestamp) {
    const time1 = new Date(event1.timestamp).getTime();
    const time2 = new Date(event2.timestamp).getTime();
    const timeDiff = Math.abs(time1 - time2);

    if (criteria.timestampTolerance !== undefined) {
      return timeDiff <= criteria.timestampTolerance;
    }

    // Default: must be exactly the same
    return timeDiff === 0;
  }

  return true;
}

/**
 * Determines which event to keep when duplicates are found
 *
 * @param event1 - First event
 * @param event2 - Second event
 * @param edgeConfig - Edge case configuration
 * @returns Strategy for which event to keep and reason
 */
function determineKeepStrategy(
  event1: EventMetadata,
  event2: EventMetadata,
  edgeConfig: EdgeCaseConfig,
): { keepFirst: boolean; reason: string } {
  // Check for manual corrections
  if (edgeConfig.manualCorrections === ManualCorrections.PRESERVE) {
    const event1IsManual = edgeConfig.manualCorrectionPattern?.test(
      JSON.stringify(event1.metadata || {}),
    );
    const event2IsManual = edgeConfig.manualCorrectionPattern?.test(
      JSON.stringify(event2.metadata || {}),
    );

    if (event1IsManual && !event2IsManual) {
      return { keepFirst: true, reason: 'Preserving manual correction' };
    }
    if (!event1IsManual && event2IsManual) {
      return { keepFirst: false, reason: 'Preserving manual correction' };
    }
  }

  // Check for system vs human actors
  const event1IsSystem = edgeConfig.systemActorPattern?.test(event1.actor);
  const event2IsSystem = edgeConfig.systemActorPattern?.test(event2.actor);

  if (event1IsSystem && !event2IsSystem) {
    return { keepFirst: false, reason: 'Preferring human over system actor' };
  }
  if (!event1IsSystem && event2IsSystem) {
    return { keepFirst: true, reason: 'Preferring human over system actor' };
  }

  // Handle simultaneous events
  const time1 = new Date(event1.timestamp).getTime();
  const time2 = new Date(event2.timestamp).getTime();

  if (Math.abs(time1 - time2) <= 1000) {
    // Within 1 second
    switch (edgeConfig.simultaneousEvents) {
      case SimultaneousEvents.KEEP_FIRST:
        return {
          keepFirst: true,
          reason: 'Keeping first of simultaneous events',
        };
      case SimultaneousEvents.KEEP_LAST:
        return {
          keepFirst: false,
          reason: 'Keeping last of simultaneous events',
        };
      case SimultaneousEvents.KEEP_ALL:
        // This shouldn't happen as we're already in duplicate detection
        return { keepFirst: true, reason: 'Keeping all simultaneous events' };
    }
  }

  // Default: keep the earlier event
  return {
    keepFirst: time1 <= time2,
    reason: 'Keeping chronologically earlier event',
  };
}

/**
 * Validates that events are in proper chronological order after deduplication
 *
 * @param events - Array of events to validate
 * @returns True if events are in chronological order
 */
export function validateChronologicalOrder(events: EventMetadata[]): boolean {
  for (let i = 1; i < events.length; i++) {
    const prevEvent = events[i - 1];
    const currEvent = events[i];

    if (!prevEvent || !currEvent) {
      continue;
    }

    const prevTime = new Date(prevEvent.timestamp).getTime();
    const currTime = new Date(currEvent.timestamp).getTime();

    if (currTime < prevTime) {
      return false;
    }
  }
  return true;
}

/**
 * Sorts events by timestamp to ensure chronological order
 *
 * @param events - Array of events to sort
 * @returns Sorted array of events
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
