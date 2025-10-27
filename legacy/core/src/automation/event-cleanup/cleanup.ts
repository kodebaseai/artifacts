/**
 * Event Cleanup Utilities
 *
 * Handles cleanup of orphaned events after cascade operations and ensures
 * only one event exists for each state at any time.
 */

import type {
  ArtifactType,
  EventMetadata,
  TArtifactEvent,
} from '../../data/types';
import { validateEventOrder } from '../validation/state-machine';
import { deduplicateEvents } from './deduplication';
import type {
  EventCleanupOptions,
  EventCleanupResult,
  OrphanedEvent,
  OrphanedEventCleanupResult,
  StateConsistencyResult,
  StateConsistencyViolation,
} from './types';

/**
 * Default cleanup options
 */
const DEFAULT_CLEANUP_OPTIONS: Required<EventCleanupOptions> = {
  removeDuplicates: true,
  cleanupOrphans: true,
  enforceStateConsistency: true,
  simultaneousTimeTolerance: 60000, // 1 minute
  preserveManualCorrections: true,
  preserveActorPatterns: ['manual', 'correction', 'fix'],
};

/**
 * Detects orphaned events that should be removed after cascade operations
 *
 * @param events - Array of events to check
 * @returns Array of orphaned event information
 */
export function detectOrphanedEvents(events: EventMetadata[]): OrphanedEvent[] {
  const orphans: OrphanedEvent[] = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Check for cascade events without proper trigger artifact reference
    if (event?.metadata?.trigger_artifact && event.trigger !== 'manual') {
      const triggerExists = events.some(
        (e, idx) =>
          idx < i &&
          e.metadata?.artifact_id === event.metadata?.trigger_artifact,
      );

      if (!triggerExists) {
        orphans.push({
          index: i,
          event,
          reason: `Cascade event references missing trigger artifact: ${event.metadata.trigger_artifact}`,
        });
      }
    }

    // Check for cascade chains that are broken
    if (event?.metadata?.cascade_root && event.trigger !== 'manual') {
      const rootExists = events.some(
        (e, idx) =>
          idx < i && e.metadata?.cascade_root === event.metadata?.cascade_root,
      );

      if (!rootExists) {
        orphans.push({
          index: i,
          event,
          reason: `Event references missing cascade root: ${event.metadata.cascade_root}`,
        });
      }
    }

    // Check for events that violate state machine rules
    if (i > 0) {
      const _prevEvent = events[i - 1];
      // Thi_prevEventequire importing state validation - for now, keep it simple
      // TODO: Add state machine validation for orphaned events
    }
  }

  return orphans;
}

/**
 * Removes orphaned events from an array
 *
 * @param events - Array of events to clean
 * @returns Cleanup result with removed orphans
 */
export function cleanupOrphanedEvents(
  events: EventMetadata[],
): OrphanedEventCleanupResult {
  const orphans = detectOrphanedEvents(events);

  if (orphans.length === 0) {
    return {
      hadOrphans: false,
      orphansRemoved: 0,
      orphans: [],
      cleanedEvents: [...events],
      summary: 'No orphaned events found',
    };
  }

  // Get unique indices to remove (sorted in descending order)
  const indicesToRemove = [...new Set(orphans.map((o) => o.index))].sort(
    (a, b) => b - a,
  );

  // Remove orphans
  const cleanedEvents = [...events];
  for (const index of indicesToRemove) {
    cleanedEvents.splice(index, 1);
  }

  const actualRemoved = indicesToRemove.length;
  const summary = `Removed ${actualRemoved} orphaned event${actualRemoved === 1 ? '' : 's'}`;

  return {
    hadOrphans: true,
    orphansRemoved: actualRemoved,
    orphans,
    cleanedEvents,
    summary,
  };
}

/**
 * Detects state consistency violations (multiple events for same state)
 *
 * @param events - Array of events to check
 * @returns Array of state consistency violations
 */
export function detectStateConsistencyViolations(
  events: EventMetadata[],
): StateConsistencyViolation[] {
  const violations: StateConsistencyViolation[] = [];
  const stateEventMap = new Map<TArtifactEvent, number[]>();

  // Group events by state
  events.forEach((event, index) => {
    const state = event.event;
    if (!stateEventMap.has(state)) {
      stateEventMap.set(state, []);
    }
    stateEventMap.get(state)?.push(index);
  });

  // Find states with multiple events
  for (const [state, eventIndices] of stateEventMap) {
    if (eventIndices.length > 1) {
      const stateEvents: EventMetadata[] = [];
      for (const index of eventIndices) {
        const event = events[index];
        if (event) {
          stateEvents.push(event);
        }
      }

      // Determine which event to keep (usually the first chronologically)
      const sortedByTime = stateEvents
        .map((event, relativeIndex) => ({
          event,
          originalIndex: eventIndices[relativeIndex],
        }))
        .filter(
          (item): item is { event: EventMetadata; originalIndex: number } =>
            item.originalIndex !== undefined,
        )
        .sort((a, b) => {
          const timeA = new Date(a.event.timestamp).getTime();
          const timeB = new Date(b.event.timestamp).getTime();
          return timeA - timeB;
        });

      if (sortedByTime.length > 0) {
        const keptIndex = sortedByTime[0]?.originalIndex ?? 0;
        const removedIndices = sortedByTime
          .slice(1)
          .map((item) => item.originalIndex);

        violations.push({
          state,
          eventIndices,
          events: stateEvents,
          keptIndex,
          removedIndices,
        });
      }
    }
  }

  return violations;
}

/**
 * Enforces state consistency by removing duplicate state events
 *
 * @param events - Array of events to clean
 * @returns State consistency result
 */
export function enforceStateConsistency(
  events: EventMetadata[],
): StateConsistencyResult {
  const violations = detectStateConsistencyViolations(events);

  if (violations.length === 0) {
    return {
      hadViolations: false,
      violationsFixed: 0,
      violations: [],
      cleanedEvents: [...events],
      summary: 'No state consistency violations found',
    };
  }

  // Collect all indices to remove
  const indicesToRemove = violations
    .flatMap((v) => v.removedIndices)
    .sort((a, b) => b - a); // Sort descending

  // Remove violations
  const cleanedEvents = [...events];
  for (const index of indicesToRemove) {
    cleanedEvents.splice(index, 1);
  }

  const totalRemoved = indicesToRemove.length;
  const summary = `Fixed ${violations.length} state consistency violation${violations.length === 1 ? '' : 's'}, removed ${totalRemoved} duplicate state event${totalRemoved === 1 ? '' : 's'}`;

  return {
    hadViolations: true,
    violationsFixed: violations.length,
    violations,
    cleanedEvents,
    summary,
  };
}

/**
 * Performs comprehensive event cleanup including deduplication, orphan removal,
 * and state consistency enforcement
 *
 * @param events - Array of events to clean
 * @param options - Cleanup options
 * @returns Complete cleanup result
 */
export function cleanupEvents(
  events: EventMetadata[],
  options: Partial<EventCleanupOptions> = {},
): EventCleanupResult {
  const startTime = performance.now();
  const opts = { ...DEFAULT_CLEANUP_OPTIONS, ...options };

  let currentEvents = [...events];
  let hadIssues = false;

  // Step 1: Deduplication
  const deduplicationResult = opts.removeDuplicates
    ? deduplicateEvents(currentEvents)
    : {
        hadDuplicates: false,
        duplicatesRemoved: 0,
        duplicates: [],
        cleanedEvents: currentEvents,
        summary: 'Deduplication skipped',
      };

  if (deduplicationResult.hadDuplicates) {
    hadIssues = true;
    currentEvents = deduplicationResult.cleanedEvents;
  }

  // Step 2: Orphaned event cleanup
  const orphanedCleanupResult = opts.cleanupOrphans
    ? cleanupOrphanedEvents(currentEvents)
    : {
        hadOrphans: false,
        orphansRemoved: 0,
        orphans: [],
        cleanedEvents: currentEvents,
        summary: 'Orphaned cleanup skipped',
      };

  if (orphanedCleanupResult.hadOrphans) {
    hadIssues = true;
    currentEvents = orphanedCleanupResult.cleanedEvents;
  }

  // Step 3: State consistency enforcement
  const stateConsistencyResult = opts.enforceStateConsistency
    ? enforceStateConsistency(currentEvents)
    : {
        hadViolations: false,
        violationsFixed: 0,
        violations: [],
        cleanedEvents: currentEvents,
        summary: 'State consistency enforcement skipped',
      };

  if (stateConsistencyResult.hadViolations) {
    hadIssues = true;
    currentEvents = stateConsistencyResult.cleanedEvents;
  }

  const processingTimeMs = performance.now() - startTime;

  // Generate overall summary
  const summaryParts: string[] = [];
  if (deduplicationResult.hadDuplicates) {
    summaryParts.push(deduplicationResult.summary);
  }
  if (orphanedCleanupResult.hadOrphans) {
    summaryParts.push(orphanedCleanupResult.summary);
  }
  if (stateConsistencyResult.hadViolations) {
    summaryParts.push(stateConsistencyResult.summary);
  }

  const overallSummary = hadIssues
    ? summaryParts.join('; ')
    : 'No issues found - events are clean';

  return {
    hadIssues,
    deduplication: deduplicationResult,
    orphanedCleanup: orphanedCleanupResult,
    stateConsistency: stateConsistencyResult,
    finalEvents: currentEvents,
    overallSummary,
    processingTimeMs,
  };
}

/**
 * Validates event sequence follows proper state transitions
 *
 * @param events - Array of events to validate
 * @param artifactType - Type of artifact for state machine validation
 * @returns True if sequence is valid, false otherwise
 */
export function validateEventSequence(
  events: EventMetadata[],
  artifactType: ArtifactType,
): boolean {
  try {
    validateEventOrder(events, artifactType);
    return true;
  } catch (_error) {
    return false;
  }
}
