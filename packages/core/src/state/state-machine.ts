/**
 * State machine for artifact lifecycle transitions.
 *
 * Defines valid state transitions for each artifact type and provides
 * validation functions to ensure artifacts follow allowed progression paths.
 *
 * @module state-machine
 */

import type { TArtifactEvent, TArtifactType } from "../constants.js";
import { CArtifact, CArtifactEvent } from "../constants.js";

/**
 * Valid state transitions for each artifact type.
 *
 * Arrays are ordered to represent recommended progression order.
 * All artifact types share the same state machine:
 * - draft → ready → in_progress → in_review → completed
 * - Can transition to cancelled from most states
 * - completed and archived are terminal states
 *
 * @internal
 */
const STATE_TRANSITIONS: Record<
  TArtifactType,
  Record<TArtifactEvent, readonly TArtifactEvent[]>
> = {
  [CArtifact.ISSUE]: {
    [CArtifactEvent.DRAFT]: [
      CArtifactEvent.READY,
      CArtifactEvent.BLOCKED,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.BLOCKED]: [CArtifactEvent.READY, CArtifactEvent.CANCELLED],
    [CArtifactEvent.READY]: [
      CArtifactEvent.IN_PROGRESS,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.IN_PROGRESS]: [
      CArtifactEvent.IN_REVIEW,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.IN_REVIEW]: [
      CArtifactEvent.COMPLETED,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.COMPLETED]: [],
    [CArtifactEvent.CANCELLED]: [CArtifactEvent.DRAFT, CArtifactEvent.ARCHIVED],
    [CArtifactEvent.ARCHIVED]: [],
  },
  [CArtifact.MILESTONE]: {
    [CArtifactEvent.DRAFT]: [CArtifactEvent.READY, CArtifactEvent.CANCELLED],
    [CArtifactEvent.BLOCKED]: [CArtifactEvent.READY, CArtifactEvent.CANCELLED],
    [CArtifactEvent.READY]: [
      CArtifactEvent.IN_PROGRESS,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.IN_PROGRESS]: [
      CArtifactEvent.IN_REVIEW,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.IN_REVIEW]: [
      CArtifactEvent.COMPLETED,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.COMPLETED]: [],
    [CArtifactEvent.CANCELLED]: [CArtifactEvent.DRAFT, CArtifactEvent.ARCHIVED],
    [CArtifactEvent.ARCHIVED]: [],
  },
  [CArtifact.INITIATIVE]: {
    [CArtifactEvent.DRAFT]: [CArtifactEvent.READY, CArtifactEvent.CANCELLED],
    [CArtifactEvent.BLOCKED]: [CArtifactEvent.READY, CArtifactEvent.CANCELLED],
    [CArtifactEvent.READY]: [
      CArtifactEvent.IN_PROGRESS,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.IN_PROGRESS]: [
      CArtifactEvent.IN_REVIEW,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.IN_REVIEW]: [
      CArtifactEvent.COMPLETED,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.COMPLETED]: [],
    [CArtifactEvent.CANCELLED]: [CArtifactEvent.DRAFT, CArtifactEvent.ARCHIVED],
    [CArtifactEvent.ARCHIVED]: [],
  },
};

/**
 * Error thrown when an invalid state transition is attempted.
 *
 * Contains details about the attempted transition and lists valid alternatives.
 */
export class StateTransitionError extends Error {
  /** The artifact type attempting the transition */
  readonly artifactType: TArtifactType;
  /** The current state before transition */
  readonly fromState: TArtifactEvent;
  /** The attempted target state */
  readonly toState: TArtifactEvent;
  /** Array of valid states that can be transitioned to from fromState */
  readonly validTransitions: readonly TArtifactEvent[];

  constructor(
    message: string,
    details: {
      artifactType: TArtifactType;
      fromState: TArtifactEvent;
      toState: TArtifactEvent;
      validTransitions: readonly TArtifactEvent[];
    },
  ) {
    super(message);
    this.name = "StateTransitionError";
    this.artifactType = details.artifactType;
    this.fromState = details.fromState;
    this.toState = details.toState;
    this.validTransitions = details.validTransitions;
  }
}

/**
 * Check if a state transition is valid for the given artifact type.
 *
 * @param artifactType - The type of artifact (initiative, milestone, or issue)
 * @param fromState - Current state of the artifact
 * @param toState - Target state to transition to
 * @returns True if the transition is allowed, false otherwise
 *
 * @example
 * ```ts
 * import { canTransition, CArtifact, CArtifactEvent } from "@kodebase/core";
 *
 * const valid = canTransition(
 *   CArtifact.ISSUE,
 *   CArtifactEvent.READY,
 *   CArtifactEvent.IN_PROGRESS
 * ); // true
 *
 * const invalid = canTransition(
 *   CArtifact.ISSUE,
 *   CArtifactEvent.COMPLETED,
 *   CArtifactEvent.DRAFT
 * ); // false - completed is terminal
 * ```
 */
export function canTransition(
  artifactType: TArtifactType,
  fromState: TArtifactEvent,
  toState: TArtifactEvent,
): boolean {
  const transitions = STATE_TRANSITIONS[artifactType];
  if (!transitions) return false;
  const valid = transitions[fromState];
  if (!valid) return false;
  return valid.includes(toState);
}

/**
 * Get all valid next states for an artifact in its current state.
 *
 * Returns an array of states that the artifact can transition to from
 * its current state, in recommended progression order.
 *
 * @param artifactType - The type of artifact
 * @param currentState - The current state of the artifact
 * @returns Array of valid next states (empty if no transitions available)
 *
 * @example
 * ```ts
 * import { getValidTransitions, CArtifact, CArtifactEvent } from "@kodebase/core";
 *
 * const nextStates = getValidTransitions(
 *   CArtifact.MILESTONE,
 *   CArtifactEvent.READY
 * );
 * // ["in_progress", "cancelled"]
 *
 * const terminal = getValidTransitions(
 *   CArtifact.ISSUE,
 *   CArtifactEvent.COMPLETED
 * );
 * // [] - completed is terminal
 * ```
 */
export function getValidTransitions(
  artifactType: TArtifactType,
  currentState: TArtifactEvent,
): TArtifactEvent[] {
  const transitions = STATE_TRANSITIONS[artifactType];
  if (!transitions) return [];
  const next = transitions[currentState] ?? [];
  // Return de-duplicated while preserving original order
  const seen = new Set<string>();
  const result: TArtifactEvent[] = [];
  for (const state of next) {
    if (!seen.has(state)) {
      seen.add(state);
      result.push(state);
    }
  }
  return result;
}

/**
 * Assert that a state transition is valid, throwing an error if not.
 *
 * Use this when you want to validate a transition and get a detailed error
 * message if it's invalid. For non-throwing checks, use {@link canTransition}.
 *
 * @param artifactType - The type of artifact
 * @param fromState - Current state of the artifact
 * @param toState - Target state to transition to
 * @throws {StateTransitionError} If the transition is not allowed
 *
 * @example
 * ```ts
 * import { assertTransition, CArtifact, CArtifactEvent } from "@kodebase/core";
 *
 * try {
 *   assertTransition(
 *     CArtifact.ISSUE,
 *     CArtifactEvent.COMPLETED,
 *     CArtifactEvent.DRAFT
 *   );
 * } catch (error) {
 *   console.error(error.message);
 *   // "Invalid state transition: completed → draft for issue.
 *   //  No valid transitions from current state."
 * }
 * ```
 */
export function assertTransition(
  artifactType: TArtifactType,
  fromState: TArtifactEvent,
  toState: TArtifactEvent,
): void {
  if (canTransition(artifactType, fromState, toState)) return;
  const validTransitions = getValidTransitions(artifactType, fromState);
  const message =
    `Invalid state transition: ${fromState} → ${toState} for ${artifactType}. ` +
    (validTransitions.length > 0
      ? `Valid transitions: ${validTransitions.join(", ")}`
      : "No valid transitions from current state.");
  throw new StateTransitionError(message, {
    artifactType,
    fromState,
    toState,
    validTransitions,
  });
}

/**
 * Get the complete state transitions map for all artifact types.
 *
 * Returns the internal state machine configuration. Useful for debugging,
 * documentation generation, or building UI state transition diagrams.
 *
 * @returns Complete state transitions mapping for all artifact types
 *
 * @example
 * ```ts
 * import { getStateTransitionsMap } from "@kodebase/core";
 *
 * const map = getStateTransitionsMap();
 * const issueTransitions = map.issue;
 * // { draft: ["ready", "blocked", "cancelled"], ... }
 * ```
 */
export function getStateTransitionsMap() {
  return STATE_TRANSITIONS;
}
