/**
 * Artifact-based State Transition Helpers
 *
 * Provides artifact-based API for state transitions that builds on the existing
 * state machine validation. These helpers extract artifact type and current state
 * automatically from artifact objects.
 *
 * @example
 * ```typescript
 * import { canTransition, getValidTransitions, performTransition } from '@kodebase/core';
 *
 * // Check if transition is valid
 * if (canTransition(artifact, 'ready')) {
 *   // Proceed with transition
 *   performTransition(artifact, 'ready', 'developer@example.com');
 * }
 *
 * // Get valid next states
 * const validStates = getValidTransitions(artifact);
 * console.log(`Can transition to: ${validStates.join(', ')}`);
 * ```
 */

import type { Artifact, ArtifactType, TArtifactEvent } from '../../data/types';
import { CArtifactEvent, CEventTrigger } from '../../data/types/constants';
import { createEvent } from '../events/builder';
import {
  canTransition as canTransitionCore,
  getCurrentState as getCurrentStateCore,
  getValidTransitions as getValidTransitionsCore,
  StateTransitionError,
} from './state-machine';

/**
 * Determines the artifact type from an artifact object
 *
 * @param artifact - The artifact to determine the type of
 * @returns The artifact type
 * @throws Error if artifact type cannot be determined
 */
function getArtifactType(artifact: Artifact): ArtifactType {
  if ('vision' in artifact.content) return 'initiative';
  if ('deliverables' in artifact.content) return 'milestone';
  if ('acceptance_criteria' in artifact.content) return 'issue';
  throw new Error(
    'Unknown artifact type - artifact content does not match any known type',
  );
}

/**
 * Checks if a state transition is valid for an artifact
 *
 * @param artifact - The artifact to check
 * @param newState - The desired state to transition to
 * @returns True if the transition is valid, false otherwise
 * @throws Error if current state cannot be determined or artifact type is unknown
 *
 * @example
 * ```typescript
 * if (canTransition(issue, 'ready')) {
 *   console.log('Can transition to ready state');
 * }
 * ```
 */
export function canTransition(
  artifact: Artifact,
  newState: TArtifactEvent,
): boolean {
  const artifactType = getArtifactType(artifact);
  const currentState = getCurrentStateCore(artifact.metadata.events);

  return canTransitionCore(artifactType, currentState, newState);
}

/**
 * Gets all valid transitions from the current state of an artifact
 *
 * @param artifact - The artifact to get transitions for
 * @returns Array of valid next states
 * @throws Error if current state cannot be determined or artifact type is unknown
 *
 * @example
 * ```typescript
 * const validStates = getValidTransitions(issue);
 * console.log(`Can transition to: ${validStates.join(', ')}`);
 * ```
 */
export function getValidTransitions(artifact: Artifact): TArtifactEvent[] {
  const artifactType = getArtifactType(artifact);
  const currentState = getCurrentStateCore(artifact.metadata.events);

  return getValidTransitionsCore(artifactType, currentState);
}

/**
 * Performs a state transition on an artifact by adding a new event
 *
 * This function validates the transition, creates a new event, and adds it to the
 * artifact's events array. The artifact is modified in place.
 *
 * @param artifact - The artifact to transition (modified in place)
 * @param newState - The state to transition to
 * @param actor - The actor performing the transition
 * @param metadata - Optional metadata for the event (required for blocked state)
 * @param trigger - Optional trigger for the event (defaults to appropriate trigger based on state)
 * @throws StateTransitionError if the transition is invalid
 * @throws Error if blocked state is requested without reason in metadata
 *
 * @example
 * ```typescript
 * // Simple transition
 * performTransition(issue, 'ready', 'developer@example.com');
 *
 * // Transition with metadata (required for blocked state)
 * performTransition(issue, 'blocked', 'developer@example.com', {
 *   reason: 'Waiting for design approval'
 * });
 *
 * // Transition with specific trigger
 * performTransition(issue, 'in_progress', 'developer@example.com', {}, CEventTrigger.BRANCH_CREATED);
 * ```
 */
export function performTransition(
  artifact: Artifact,
  newState: TArtifactEvent,
  actor: string,
  metadata?: Record<string, unknown>,
  trigger?: string,
): void {
  // Validate the transition first
  if (!canTransition(artifact, newState)) {
    const artifactType = getArtifactType(artifact);
    const currentState = getCurrentStateCore(artifact.metadata.events);
    const validTransitions = getValidTransitionsCore(
      artifactType,
      currentState,
    );

    throw new StateTransitionError(
      `Cannot transition from ${currentState} to ${newState} for ${artifactType}. ` +
        `Valid transitions: ${validTransitions.join(', ')}`,
    );
  }

  // Special validation for blocked state
  if (newState === CArtifactEvent.BLOCKED) {
    if (!metadata || !metadata.reason) {
      throw new StateTransitionError(
        'Blocked state requires reason in metadata. Provide metadata with reason field.',
      );
    }
  }

  // Determine appropriate trigger if not provided
  let eventTrigger = trigger;
  if (!eventTrigger) {
    // Map common state transitions to their typical triggers
    switch (newState) {
      case CArtifactEvent.DRAFT:
        eventTrigger = CEventTrigger.ARTIFACT_CREATED;
        break;
      case CArtifactEvent.READY:
        eventTrigger = CEventTrigger.DEPENDENCIES_MET;
        break;
      case CArtifactEvent.IN_PROGRESS:
        eventTrigger = CEventTrigger.BRANCH_CREATED;
        break;
      case CArtifactEvent.IN_REVIEW:
        eventTrigger = CEventTrigger.PR_CREATED;
        break;
      case CArtifactEvent.COMPLETED:
        eventTrigger = CEventTrigger.PR_MERGED;
        break;
      case CArtifactEvent.BLOCKED:
        eventTrigger = CEventTrigger.HAS_DEPENDENCIES; // When dependencies block progress
        break;
      case CArtifactEvent.CANCELLED:
        eventTrigger = CEventTrigger.MANUAL;
        break;
      case CArtifactEvent.ARCHIVED:
        eventTrigger = CEventTrigger.DEPENDENCY_COMPLETED; // Archived when parent completes
        break;
      default:
        eventTrigger = CEventTrigger.MANUAL;
    }
  }

  // Create and add the event
  const event = createEvent({
    event: newState,
    actor,
    trigger: eventTrigger,
    metadata,
  });

  artifact.metadata.events.push(event);
}

// Re-export the StateTransitionError for convenience
export { StateTransitionError } from './state-machine';
