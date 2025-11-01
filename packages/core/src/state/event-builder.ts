/**
 * Event builder utilities for creating artifact lifecycle events.
 *
 * Provides factory functions to create properly formatted event records
 * with automatic trigger validation and timestamp generation.
 *
 * @module event-builder
 */

import {
  CArtifactEvent,
  CEventTrigger,
  ISO_UTC_REGEX,
  type TArtifactEvent,
  type TEventTrigger,
} from "../constants.js";
import type { TEventRecord } from "./event-order.js";

/**
 * Arguments for creating an event record.
 */
export type CreateEventArgs = {
  /** The lifecycle state after this event */
  event: TArtifactEvent;
  /** Human actor or agent identifier triggering the event */
  actor: string;
  /** The reason/cause of this state transition (required) */
  trigger?: TEventTrigger;
  /** ISO-8601 UTC timestamp (defaults to current time) */
  timestamp?: string;
  /** Optional additional metadata for the event */
  metadata?: Record<string, unknown>;
};

/**
 * Map of allowed triggers for each event type.
 *
 * Defines which triggers are valid for transitioning to each state.
 * Used by {@link assertEventTrigger} to validate event-trigger combinations.
 */
export const EVENT_TRIGGER_BY_EVENT: Record<
  TArtifactEvent,
  ReadonlyArray<TEventTrigger>
> = {
  [CArtifactEvent.DRAFT]: [CEventTrigger.ARTIFACT_CREATED],
  [CArtifactEvent.READY]: [
    CEventTrigger.DEPENDENCIES_MET,
    CEventTrigger.DEPENDENCY_COMPLETED,
  ],
  [CArtifactEvent.BLOCKED]: [CEventTrigger.HAS_DEPENDENCIES],
  [CArtifactEvent.IN_PROGRESS]: [
    CEventTrigger.BRANCH_CREATED,
    CEventTrigger.CHILDREN_STARTED,
  ],
  [CArtifactEvent.IN_REVIEW]: [
    CEventTrigger.PR_READY,
    CEventTrigger.CHILDREN_COMPLETED,
  ],
  [CArtifactEvent.COMPLETED]: [CEventTrigger.PR_MERGED],
  [CArtifactEvent.CANCELLED]: [CEventTrigger.MANUAL_CANCEL],
  [CArtifactEvent.ARCHIVED]: [
    CEventTrigger.PARENT_COMPLETED,
    CEventTrigger.PARENT_ARCHIVED,
  ],
};

/**
 * Validate that a trigger is allowed for the given event type.
 *
 * @param event - The event type being created
 * @param trigger - The trigger causing the event
 * @throws {Error} If the trigger is not allowed for this event
 *
 * @example
 * ```ts
 * import { assertEventTrigger, CArtifactEvent, CEventTrigger } from "@kodebase/core";
 *
 * // Valid combination
 * assertEventTrigger(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET); // OK
 *
 * // Invalid combination
 * assertEventTrigger(CArtifactEvent.READY, CEventTrigger.PR_MERGED); // throws
 * ```
 */
export function assertEventTrigger(
  event: TArtifactEvent,
  trigger: TEventTrigger,
): void {
  const allowed = EVENT_TRIGGER_BY_EVENT[event];
  if (!allowed || allowed.length === 0) return; // nothing to assert
  if (!allowed.includes(trigger)) {
    const allowedList = allowed.join(", ");
    throw new Error(
      `Invalid trigger '${trigger}' for event '${event}'. Allowed: ${allowedList}`,
    );
  }
}

/**
 * Generate ISO-8601 UTC timestamp with seconds precision (no milliseconds).
 * @internal
 */
function nowIsoUtcSeconds(): string {
  const d = new Date();
  // toISOString includes milliseconds; strip them
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Create an event record with validation.
 *
 * Generic event creator that validates the trigger-event combination and
 * provides timestamp defaults. Prefer using specific helper functions like
 * {@link createDraftEvent} when possible.
 *
 * @param args - Event creation arguments
 * @returns Validated event record
 * @throws {Error} If trigger is missing or invalid for the event type
 *
 * @example
 * ```ts
 * import { createEvent, CArtifactEvent, CEventTrigger } from "@kodebase/core";
 *
 * const event = createEvent({
 *   event: CArtifactEvent.IN_PROGRESS,
 *   actor: "Alice (alice@example.com)",
 *   trigger: CEventTrigger.BRANCH_CREATED,
 *   metadata: { branch: "feature/auth" }
 * });
 * ```
 */
export function createEvent(args: CreateEventArgs): TEventRecord {
  const { event, actor, trigger, timestamp, metadata } = args;

  if (!trigger) {
    throw new Error("EventBuilder: 'trigger' is required and must be explicit");
  }

  // Validate trigger is compatible with event
  assertEventTrigger(event, trigger);

  return {
    event,
    actor,
    trigger,
    timestamp: timestamp ?? nowIsoUtcSeconds(),
    ...(metadata ? { metadata } : {}),
  };
}

/**
 * Create a "draft" event (initial artifact creation).
 *
 * @param actor - Human or agent creating the artifact
 * @param timestamp - Optional ISO-8601 UTC timestamp (defaults to now)
 * @param metadata - Optional additional metadata
 * @returns Draft event record with trigger=artifact_created
 */
export function createDraftEvent(
  actor: string,
  timestamp?: string,
  metadata?: Record<string, unknown>,
): TEventRecord {
  return createEvent({
    event: CArtifactEvent.DRAFT,
    actor,
    trigger: CEventTrigger.ARTIFACT_CREATED,
    timestamp,
    metadata,
  });
}

/**
 * Create a "ready" event (all dependencies met).
 *
 * @param actor - Human or agent triggering the ready state
 */
export function createReadyEvent(
  actor: string,
  timestamp?: string,
  metadata?: Record<string, unknown>,
): TEventRecord {
  return createEvent({
    event: CArtifactEvent.READY,
    actor,
    trigger: CEventTrigger.DEPENDENCIES_MET,
    timestamp,
    metadata,
  });
}

/**
 * Blocking dependency information for blocked events.
 */
export type BlockingDependency = {
  /** ID of the artifact blocking this one */
  artifact_id: string;
  /** Whether this dependency has been resolved */
  resolved?: boolean;
  /** ISO-8601 UTC timestamp when resolved */
  resolved_at?: string;
};

/**
 * Create a "blocked" event (has unfulfilled dependencies).
 *
 * @param actor - Human or agent recording the blocked state
 * @param blockingDependencies - Array of dependencies blocking progress
 * @param timestamp - Optional ISO-8601 UTC timestamp (defaults to now)
 * @returns Blocked event with dependency metadata
 * @throws {Error} If no dependencies provided or resolved_at is invalid
 */
export function createBlockedEvent(
  actor: string,
  blockingDependencies: ReadonlyArray<BlockingDependency>,
  timestamp?: string,
): TEventRecord {
  if (
    !Array.isArray(blockingDependencies) ||
    blockingDependencies.length === 0
  ) {
    throw new Error(
      "createBlockedEvent: provide at least one blocking dependency entry",
    );
  }

  // Normalize and lightly validate entries; do not enforce ID shape here.
  const normalized = blockingDependencies.map((d) => {
    const resolved = Boolean(d.resolved);
    if (resolved && d.resolved_at && !ISO_UTC_REGEX.test(d.resolved_at)) {
      throw new Error(
        "createBlockedEvent: 'resolved_at' must be ISO-8601 UTC (YYYY-MM-DDTHH:MM:SSZ)",
      );
    }
    return {
      artifact_id: String(d.artifact_id),
      ...(resolved ? { resolved: true } : { resolved: false }),
      ...(d.resolved_at ? { resolved_at: d.resolved_at } : {}),
    };
  });

  return createEvent({
    event: CArtifactEvent.BLOCKED,
    actor,
    trigger: CEventTrigger.HAS_DEPENDENCIES,
    timestamp,
    metadata: { blocking_dependencies: normalized },
  });
}

/** Create an "in_progress" event (work started, typically branch created). */
export function createInProgressEvent(
  actor: string,
  timestamp?: string,
  metadata?: Record<string, unknown>,
): TEventRecord {
  return createEvent({
    event: CArtifactEvent.IN_PROGRESS,
    actor,
    trigger: CEventTrigger.BRANCH_CREATED,
    timestamp,
    metadata,
  });
}

/** Create an "in_review" event (pull request ready for review). */
export function createInReviewEvent(
  actor: string,
  timestamp?: string,
  metadata?: Record<string, unknown>,
): TEventRecord {
  return createEvent({
    event: CArtifactEvent.IN_REVIEW,
    actor,
    trigger: CEventTrigger.PR_READY,
    timestamp,
    metadata,
  });
}

/** Create a "completed" event (pull request merged, work finished). */
export function createCompletedEvent(
  actor: string,
  timestamp?: string,
  metadata?: Record<string, unknown>,
): TEventRecord {
  return createEvent({
    event: CArtifactEvent.COMPLETED,
    actor,
    trigger: CEventTrigger.PR_MERGED,
    timestamp,
    metadata,
  });
}

/** Create a "cancelled" event (work abandoned or deprioritized). */
export function createCancelledEvent(
  actor: string,
  timestamp?: string,
  metadata?: Record<string, unknown>,
): TEventRecord {
  return createEvent({
    event: CArtifactEvent.CANCELLED,
    actor,
    trigger: CEventTrigger.MANUAL_CANCEL,
    timestamp,
    metadata,
  });
}

/**
 * Valid causes for archiving an artifact.
 */
type ArchivedCause =
  | typeof CEventTrigger.PARENT_COMPLETED
  | typeof CEventTrigger.PARENT_ARCHIVED;

/**
 * Create an "archived" event (artifact archived due to parent state).
 *
 * @param actor - Human or agent (typically cascade engine) archiving the artifact
 * @param cause - Why the artifact is being archived (parent_completed or parent_archived)
 * @param timestamp - Optional ISO-8601 UTC timestamp (defaults to now)
 * @param metadata - Optional additional metadata
 * @returns Archived event with appropriate trigger
 * @throws {Error} If cause is not a valid archive trigger
 */
export function createArchivedEvent(
  actor: string,
  cause: ArchivedCause,
  timestamp?: string,
  metadata?: Record<string, unknown>,
): TEventRecord {
  if (
    cause !== CEventTrigger.PARENT_COMPLETED &&
    cause !== CEventTrigger.PARENT_ARCHIVED
  ) {
    throw new Error(
      "createArchivedEvent: cause must be 'parent_completed' or 'parent_archived'",
    );
  }
  return createEvent({
    event: CArtifactEvent.ARCHIVED,
    actor,
    trigger: cause,
    timestamp,
    metadata,
  });
}
