/**
 * State Machine Validation for Kodebase
 *
 * Implements state transition rules and validation for the artifact lifecycle.
 * Ensures artifacts follow valid state transitions and maintains consistency.
 *
 * @example
 * ```typescript
 * import { canTransition, getCurrentState, getValidTransitions } from '@kodebase/core';
 *
 * // Check if transition is valid
 * if (canTransition('issue', 'draft', 'ready')) {
 *   // Proceed with transition
 * }
 *
 * // Get current state
 * const state = getCurrentState(artifact);
 *
 * // Get valid next states
 * const validStates = getValidTransitions('issue', state);
 * console.log(`Can transition to: ${validStates.join(', ')}`);
 * ```
 */

import type {
  ArtifactType,
  EventMetadata,
  TArtifactEvent,
} from '../../data/types';
import { CArtifactEvent } from '../../data/types/constants';

/**
 * Custom error class for state transition violations
 * @class StateTransitionError
 * @description Custom error class for state transition violations
 * @param message - The error message
 * @returns StateTransitionError
 */
export class StateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateTransitionError';
  }
}

/**
 * Defines valid state transitions for each artifact type
 * @property artifactType - The type of artifact
 * @property fromState - The current state
 * @property toState - The desired state
 * @returns Record<ArtifactType, Record<TArtifactEvent, TArtifactEvent[]>>
 */
const STATE_TRANSITIONS: Record<
  ArtifactType,
  Record<TArtifactEvent, TArtifactEvent[]>
> = {
  issue: {
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
    [CArtifactEvent.COMPLETED]: [], // Terminal state
    [CArtifactEvent.CANCELLED]: [CArtifactEvent.DRAFT, CArtifactEvent.ARCHIVED],
    [CArtifactEvent.ARCHIVED]: [], // Terminal state
  },
  milestone: {
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
    [CArtifactEvent.COMPLETED]: [], // Terminal state
    [CArtifactEvent.CANCELLED]: [CArtifactEvent.DRAFT, CArtifactEvent.ARCHIVED],
    [CArtifactEvent.ARCHIVED]: [], // Terminal state
  },
  initiative: {
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
    [CArtifactEvent.COMPLETED]: [], // Terminal state
    [CArtifactEvent.CANCELLED]: [CArtifactEvent.DRAFT, CArtifactEvent.ARCHIVED],
    [CArtifactEvent.ARCHIVED]: [], // Terminal state
  },
};

/**
 * Checks if a state transition is valid
 *
 * @param artifactType - The type of artifact
 * @param fromState - The current state
 * @param toState - The desired state
 * @returns True if the transition is valid, false otherwise
 */
export function canTransition(
  artifactType: ArtifactType,
  fromState: TArtifactEvent,
  toState: TArtifactEvent,
): boolean {
  const transitions = STATE_TRANSITIONS[artifactType];
  if (!transitions) {
    return false;
  }

  const validTransitions = transitions[fromState];
  if (!validTransitions) {
    return false;
  }

  return validTransitions.includes(toState);
}

/**
 * Gets all valid transitions from a given state
 *
 * @param artifactType - The type of artifact
 * @param currentState - The current state
 * @returns Array of valid next states
 * @throws StateTransitionError if validation fails
 */
export function getValidTransitions(
  artifactType: ArtifactType,
  currentState: TArtifactEvent,
): TArtifactEvent[] {
  const transitions = STATE_TRANSITIONS[artifactType];
  if (!transitions) {
    return [];
  }

  return transitions[currentState] || [];
}

/**
 * Validates the chronological order and state transitions of events
 *
 * @param events - Array of events to validate
 * @param artifactType - The type of artifact
 * @returns void
 * @throws StateTransitionError if validation fails
 */
export function validateEventOrder(
  events: EventMetadata[],
  artifactType: ArtifactType,
): void {
  if (events.length === 0) {
    throw new StateTransitionError('Events array cannot be empty');
  }

  // First event must be draft
  const firstEvent = events[0];
  if (!firstEvent || firstEvent.event !== CArtifactEvent.DRAFT) {
    throw new StateTransitionError('First event must be draft');
  }

  // Validate chronological order
  for (let i = 1; i < events.length; i++) {
    const prevEvent = events[i - 1];
    const currEvent = events[i];

    if (!prevEvent || !currEvent) continue;

    const prevTime = new Date(prevEvent.timestamp).getTime();
    const currTime = new Date(currEvent.timestamp).getTime();

    if (currTime < prevTime) {
      throw new StateTransitionError(
        `Events are not in chronological order: ${prevEvent.timestamp} > ${currEvent.timestamp}`,
      );
    }
  }

  // Validate state transitions
  for (let i = 1; i < events.length; i++) {
    const prevEvent = events[i - 1];
    const currEvent = events[i];

    if (!prevEvent || !currEvent) continue;

    const fromState = prevEvent.event;
    const toState = currEvent.event;

    if (!canTransition(artifactType, fromState, toState)) {
      throw new StateTransitionError(
        `Invalid state transition: ${fromState} → ${toState} for ${artifactType}`,
      );
    }
  }
}

/**
 * Gets the current state from an events array
 *
 * @param events - Array of events
 * @returns The current state (last event)
 * @throws StateTransitionError if validation fails
 */
export function getCurrentState(events: EventMetadata[]): TArtifactEvent {
  if (events.length === 0) {
    throw new Error('Cannot determine current state from empty events array');
  }

  const lastEvent = events[events.length - 1];
  if (!lastEvent) {
    throw new Error('Cannot determine current state from empty events array');
  }
  return lastEvent.event;
}

/**
 * Checks if an artifact is in a terminal state
 *
 * @param state - The state to check
 * @returns true if the state is terminal (completed or archived)
 */
export function isTerminalState(state: TArtifactEvent): boolean {
  return (
    state === CArtifactEvent.COMPLETED || state === CArtifactEvent.ARCHIVED
  );
}
