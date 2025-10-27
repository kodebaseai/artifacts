/**
 * Migration helper for updating test fixtures to use v2.0 event schema
 * @module @kodebase/core/test/migration-helper
 * @description Migration helper for updating test fixtures to use v2.0 event schema with triggers
 * @exports migrateTestEvent
 * @exports migrateTestEvents
 */

import { createEvent } from '../automation/events/builder';
import type { EventMetadata } from '../data/types';
import { CEventTrigger } from '../data/types/constants';

/**
 * Migrates a legacy event to the v2.0 schema format
 *
 * @param legacyEvent - Event without trigger field
 * @param trigger - Optional trigger to use (defaults to manual for unknown legacy contexts)
 * @returns Event with v2.0 schema structure
 */
export function migrateTestEvent(
  legacyEvent: {
    timestamp: string;
    event: string;
    actor: string;
    metadata?: Record<string, unknown>;
  },
  trigger: string = CEventTrigger.MANUAL,
): EventMetadata {
  return createEvent({
    event: legacyEvent.event,
    actor: legacyEvent.actor,
    timestamp: legacyEvent.timestamp,
    trigger,
    metadata: legacyEvent.metadata,
  });
}

/**
 * Migrates an array of legacy events to v2.0 schema
 *
 * @param legacyEvents - Array of events without trigger fields
 * @param triggers - Optional array of triggers (defaults to appropriate triggers per event type)
 * @returns Array of events with v2.0 schema structure
 */
export function migrateTestEvents(
  legacyEvents: Array<{
    timestamp: string;
    event: string;
    actor: string;
    metadata?: Record<string, unknown>;
  }>,
  triggers?: string[],
): EventMetadata[] {
  return legacyEvents.map((event, index) => {
    // Use provided trigger or determine appropriate trigger based on event type and position
    let trigger = triggers?.[index];
    if (!trigger) {
      if (index === 0) {
        trigger = CEventTrigger.ARTIFACT_CREATED; // First event is usually creation
      } else {
        // Use manual as fallback for legacy test events where trigger context is unknown
        trigger = CEventTrigger.MANUAL;
      }
    }

    return migrateTestEvent(event, trigger);
  });
}
