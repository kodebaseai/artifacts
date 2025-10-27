/**
 * Event Builder for Kodebase v2.0
 *
 * Provides a fluent API for building events with the new simplified schema.
 * v2.0 Changes:
 * - Removed event_id, correlation_id, parent_event_id for simplicity
 * - Added required trigger field to track what caused the event
 * - Reordered fields to have event first for better readability
 */

import type {
  EventMetadata,
  TArtifactEvent,
  TEventTrigger,
} from '../../data/types';
import { CArtifactEvent, CEventTrigger } from '../../data/types/constants';

/**
 * Event builder options v2.0
 * @property event - The event type (draft, ready, in_progress, etc.)
 * @property timestamp - ISO 8601 timestamp when the event occurred
 * @property actor - Who triggered the event (human or AI agent)
 * @property trigger - What caused the event to trigger
 * @property metadata - Optional metadata for additional context
 */
export interface EventBuilderOptions {
  /** The event type (draft, ready, in_progress, etc.) */
  event: keyof typeof CArtifactEvent | string;
  /** ISO 8601 timestamp when the event occurred (defaults to current UTC time) */
  timestamp?: string;
  /** Who triggered the event (human or AI agent) */
  actor: string;
  /** What caused the event to trigger */
  trigger?: keyof typeof CEventTrigger | string;
  /** Optional metadata for additional context */
  metadata?: Record<string, unknown>;
}

/**
 * Event builder class for creating properly structured events v2.0
 * @class EventBuilder
 * @description Event builder class for creating properly structured events
 */
export class EventBuilder {
  private eventData: Partial<EventMetadata> = {};

  constructor(options?: Partial<EventBuilderOptions>) {
    if (options) {
      this.event(options.event as TArtifactEvent);
      if (options.timestamp) this.timestamp(options.timestamp);
      if (options.actor) this.actor(options.actor);
      if (options.trigger) this.trigger(options.trigger);
      if (options.metadata) this.metadata(options.metadata);
    }
  }

  /**
   * Sets the event type
   * @param eventType - The event type
   * @returns this
   */
  event(eventType: TArtifactEvent | string): this {
    this.eventData.event = eventType as TArtifactEvent;
    return this;
  }

  /**
   * Sets the timestamp
   * @param timestamp - Optional timestamp (defaults to current UTC time)
   * @returns this
   */
  timestamp(timestamp: string): this {
    this.eventData.timestamp = timestamp;
    return this;
  }

  /**
   * Sets the actor
   * @param actor - The actor performing the event
   * @returns this
   */
  actor(actor: string): this {
    this.eventData.actor = actor;
    return this;
  }

  /**
   * Sets the trigger
   * @param trigger - What caused the event to trigger
   * @returns this
   */
  trigger(trigger: TEventTrigger | string): this {
    this.eventData.trigger = trigger;
    return this;
  }

  /**
   * Sets optional metadata
   * @param metadata - Optional metadata for additional context
   * @returns this
   */
  metadata(metadata: Record<string, unknown>): this {
    this.eventData.metadata = { ...this.eventData.metadata, ...metadata };
    return this;
  }

  /**
   * Builds the event with all required fields
   *
   * @throws Error if required fields are missing
   * @returns EventMetadata
   */
  build(): EventMetadata {
    // Ensure required fields
    if (!this.eventData.event) {
      throw new Error('Event type is required');
    }
    if (!this.eventData.actor) {
      throw new Error('Actor is required');
    }
    if (!this.eventData.trigger) {
      throw new Error('Trigger is required');
    }

    // Set defaults
    if (!this.eventData.timestamp) {
      this.eventData.timestamp = new Date().toISOString();
    }

    return this.eventData as EventMetadata;
  }
}

/**
 * Factory function to create an event with the builder pattern
 * @param options - Event builder options
 * @returns EventMetadata
 */
export function createEvent(options: EventBuilderOptions): EventMetadata {
  let trigger = options.trigger;
  if (!trigger) {
    // TODO: Remove this fallback - all event creation should specify explicit triggers
    console.warn(
      `⚠️  Event created without explicit trigger. Event: ${options.event}, Actor: ${options.actor}`,
    );
    trigger = CEventTrigger.MANUAL; // Temporary fallback
  }

  return new EventBuilder()
    .event(options.event as TArtifactEvent)
    .timestamp(options.timestamp || new Date().toISOString())
    .actor(options.actor)
    .trigger(trigger)
    .metadata(options.metadata || {})
    .build();
}

/**
 * Convenience function to create a draft event
 * @param actor - The actor creating the draft
 * @param timestamp - Optional timestamp
 * @returns EventMetadata
 */
export function createDraftEvent(
  actor: string,
  timestamp?: string,
): EventMetadata {
  return createEvent({
    event: CArtifactEvent.DRAFT,
    actor,
    timestamp,
    trigger: CEventTrigger.ARTIFACT_CREATED,
  });
}

/**
 * Convenience function to create a ready event
 * @param actor - The actor marking as ready
 * @param timestamp - Optional timestamp
 * @returns EventMetadata
 */
export function createReadyEvent(
  actor: string,
  timestamp?: string,
): EventMetadata {
  return createEvent({
    event: CArtifactEvent.READY,
    actor,
    timestamp,
    trigger: CEventTrigger.DEPENDENCIES_MET,
  });
}
