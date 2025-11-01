/**
 * Event chronological order validation.
 *
 * Validates that artifact event logs follow required rules:
 * - First event must be "draft"
 * - Timestamps must be in non-decreasing chronological order
 *
 * @module event-order
 */

import type { TArtifactEvent, TEventTrigger } from "../constants.js";
import { CArtifactEvent } from "../constants.js";

/**
 * Event record structure representing a single artifact lifecycle event.
 */
export type TEventRecord = {
  /** The lifecycle state after this event */
  event: TArtifactEvent;
  /** ISO-8601 UTC timestamp when the event occurred */
  timestamp: string;
  /** Human actor or agent identifier who triggered the event */
  actor: string;
  /** The reason or cause of this state transition */
  trigger: TEventTrigger;
  /** Optional additional metadata for the event */
  metadata?: Record<string, unknown>;
};

/**
 * Error codes for event order validation failures.
 */
export type EventOrderErrorCode =
  | "EMPTY_EVENTS"
  | "FIRST_EVENT_MUST_BE_DRAFT"
  | "EVENTS_OUT_OF_ORDER";

/**
 * Error thrown when event log validation fails.
 *
 * Contains the error code and contextual information about which
 * event(s) violated the chronological ordering rules.
 */
export class EventOrderError extends Error {
  /** Error code identifying the type of validation failure */
  readonly code: EventOrderErrorCode;
  /** Index of the problematic event (if applicable) */
  readonly index?: number;
  /** Timestamp of the previous event (for ordering errors) */
  readonly prevTimestamp?: string;
  /** Timestamp of the current event causing the error */
  readonly currTimestamp?: string;

  constructor(
    message: string,
    details: {
      code: EventOrderErrorCode;
      index?: number;
      prevTimestamp?: string;
      currTimestamp?: string;
    },
  ) {
    super(message);
    this.name = "EventOrderError";
    this.code = details.code;
    this.index = details.index;
    this.prevTimestamp = details.prevTimestamp;
    this.currTimestamp = details.currTimestamp;
  }
}

/**
 * Validate that events follow chronological ordering rules.
 *
 * Enforces two critical invariants:
 * 1. The first event must always be "draft" (artifact creation)
 * 2. Event timestamps must be in non-decreasing order (equal times allowed)
 *
 * @param events - Array of event records to validate
 * @throws {EventOrderError} If validation fails
 *
 * @example
 * ```ts
 * import { validateEventOrder } from "@kodebase/core";
 *
 * const events = [
 *   {
 *     event: "draft",
 *     timestamp: "2025-10-28T10:00:00Z",
 *     actor: "Alice (alice@example.com)",
 *     trigger: "artifact_created"
 *   },
 *   {
 *     event: "ready",
 *     timestamp: "2025-10-28T10:05:00Z",
 *     actor: "agent.cascade",
 *     trigger: "dependencies_met"
 *   }
 * ];
 *
 * validateEventOrder(events); // OK
 *
 * // This would throw: first event is not draft
 * const invalid = [{ event: "ready", timestamp: "...", ... }];
 * validateEventOrder(invalid); // throws EventOrderError
 * ```
 */
export function validateEventOrder(events: ReadonlyArray<TEventRecord>): void {
  if (events.length === 0) {
    throw new EventOrderError("Events array cannot be empty", {
      code: "EMPTY_EVENTS",
    });
  }

  const first = events[0];
  if (!first || first.event !== CArtifactEvent.DRAFT) {
    throw new EventOrderError("First event must be draft", {
      code: "FIRST_EVENT_MUST_BE_DRAFT",
      index: 0,
      currTimestamp: first?.timestamp,
    });
  }

  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const curr = events[i];
    if (!prev || !curr) {
      // Sparse arrays or unexpected holes; schema validation should catch
      // structural issues elsewhere.
      continue;
    }
    // Non-decreasing order allowed (equal timestamps ok)
    const prevTime = new Date(prev.timestamp).getTime();
    const currTime = new Date(curr.timestamp).getTime();
    if (Number.isNaN(prevTime) || Number.isNaN(currTime)) {
      // If timestamps are invalid, leave to schema validation upstream; skip order check
      continue;
    }
    if (currTime < prevTime) {
      throw new EventOrderError(
        `Events are not in chronological order: ${prev.timestamp} > ${curr.timestamp}`,
        {
          code: "EVENTS_OUT_OF_ORDER",
          index: i,
          prevTimestamp: prev.timestamp,
          currTimestamp: curr.timestamp,
        },
      );
    }
  }
}
