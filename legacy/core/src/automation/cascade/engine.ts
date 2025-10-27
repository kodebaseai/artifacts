/**
 * Cascade Engine for Kodebase
 *
 * Implements the core cascade logic for automatic state propagation
 * between parent and child artifacts in the event-driven system.
 */

import type { Artifact, EventMetadata, TArtifactEvent } from '../../data/types';
import { CArtifactEvent, CEventTrigger } from '../../data/types/constants';
import { createEvent } from '../events/builder';

/**
 * Result of cascade analysis
 * @property shouldCascade - Whether to cascade
 * @property newState - New state to transition to
 * @property reason - Reason for the cascade
 */
export interface CascadeResult {
  shouldCascade: boolean;
  newState?: TArtifactEvent;
  reason: string;
}

/**
 * Archive event with target artifact ID
 * @property artifactId - ID of the artifact to archive
 * @property event - Event to archive
 */
export interface ArchiveEvent {
  artifactId: string;
  event: EventMetadata;
}

/**
 * Cascade Engine for managing event cascades
 *
 * @example
 * ```typescript
 * import { CascadeEngine } from '@kodebase/core';
 *
 * const engine = new CascadeEngine();
 *
 * // Check if parent should cascade based on children
 * const result = engine.shouldCascadeToParent(childIssues, 'ready');
 * if (result.shouldCascade) {
 *   console.log(`Parent should transition to ${result.newState}`);
 * }
 *
 * // Generate cascade event
 * const cascadeEvent = engine.generateCascadeEvent(
 *   'in_review',
 *   triggerEvent,
 *   'all_children_complete'
 * );
 * ```
 */
export class CascadeEngine {
  /**
   * Determines if a parent should cascade based on children states
   *
   * @param children - Array of child artifacts
   * @param parentState - Current state of the parent
   * @returns Cascade analysis result
   */
  shouldCascadeToParent(
    children: Artifact[],
    parentState?: TArtifactEvent,
  ): CascadeResult {
    const activeChildren = children.filter(
      (child) => this.getCurrentState(child) !== CArtifactEvent.CANCELLED,
    );

    if (activeChildren.length === 0) {
      return {
        shouldCascade: false,
        reason: 'No active children to evaluate',
      };
    }

    // Check if all active children are completed
    const allCompleted = activeChildren.every(
      (child) => this.getCurrentState(child) === CArtifactEvent.COMPLETED,
    );

    if (allCompleted) {
      return {
        shouldCascade: true,
        newState: CArtifactEvent.IN_REVIEW,
        reason: 'All children completed',
      };
    }

    // Check if first child has started (for parent in ready state)
    if (parentState === CArtifactEvent.READY) {
      const hasStarted = activeChildren.some((child) => {
        const state = this.getCurrentState(child);
        return (
          state === CArtifactEvent.IN_PROGRESS ||
          state === CArtifactEvent.IN_REVIEW ||
          state === CArtifactEvent.COMPLETED
        );
      });

      if (hasStarted) {
        return {
          shouldCascade: true,
          newState: CArtifactEvent.IN_PROGRESS,
          reason: 'First child started',
        };
      }
    }

    // Count incomplete children
    const incompleteCount = activeChildren.filter(
      (child) => this.getCurrentState(child) !== CArtifactEvent.COMPLETED,
    ).length;

    return {
      shouldCascade: false,
      reason: `${incompleteCount} incomplete children remain`,
    };
  }

  /**
   * Generates a cascade event with proper correlation
   *
   * @param newState - The new state to transition to
   * @param triggerEvent - The event that triggered this cascade
   * @param cascadeType - Type of cascade for metadata
   * @returns Generated cascade event
   */
  generateCascadeEvent(
    newState: TArtifactEvent,
    triggerEvent: EventMetadata,
    cascadeType: string,
  ): EventMetadata {
    return createEvent({
      event: newState,
      actor: 'System (system@kodebase.ai)',
      trigger: CEventTrigger.DEPENDENCY_COMPLETED,
      metadata: {
        cascade_type: cascadeType,
        trigger_event: triggerEvent.event,
        trigger_actor: triggerEvent.actor,
        trigger_timestamp: triggerEvent.timestamp,
      },
    });
  }

  /**
   * Generates archive events for cancelled children
   *
   * @param children - Array of child artifacts
   * @param parentCompletionEvent - Parent's completion event
   * @returns Array of archive events to apply
   */
  archiveCancelledChildren(
    children: Artifact[],
    parentCompletionEvent: EventMetadata,
  ): ArchiveEvent[] {
    const archiveEvents: ArchiveEvent[] = [];

    for (const child of children) {
      if (this.getCurrentState(child) === CArtifactEvent.CANCELLED) {
        // Extract artifact ID from metadata or use a placeholder
        const artifactId = this.getArtifactId(child);

        archiveEvents.push({
          artifactId,
          event: this.generateCascadeEvent(
            CArtifactEvent.ARCHIVED,
            parentCompletionEvent,
            'parent_completion_archive',
          ),
        });
      }
    }

    return archiveEvents;
  }

  /**
   * Gets blocked dependents when an artifact is cancelled
   *
   * @param cancelledArtifactId - ID of the cancelled artifact
   * @param artifacts - Map of all artifacts
   * @returns Array of blocked dependent artifact IDs
   */
  getBlockedDependents(
    cancelledArtifactId: string,
    artifacts: Map<string, Artifact>,
  ): string[] {
    const blockedDependents: string[] = [];

    for (const [id, artifact] of artifacts) {
      const relationships = artifact.metadata.relationships;

      if (relationships.blocked_by.includes(cancelledArtifactId)) {
        const currentState = this.getCurrentState(artifact);

        if (
          currentState === CArtifactEvent.BLOCKED ||
          currentState === CArtifactEvent.DRAFT
        ) {
          blockedDependents.push(id);
        }
      }
    }

    return blockedDependents;
  }

  /**
   * Gets the current state of an artifact
   *
   * @param artifact - The artifact to check
   * @returns Current state
   */
  getCurrentState(artifact: Artifact): TArtifactEvent {
    const events = artifact.metadata.events;
    if (events.length === 0) {
      throw new Error('Artifact has no events');
    }

    const lastEvent = events[events.length - 1];
    if (!lastEvent) {
      throw new Error('Artifact has no events');
    }
    return lastEvent.event;
  }

  /**
   * Extracts artifact ID from the artifact
   * In a real implementation, this would be a field on the artifact
   *
   * @param artifact - The artifact
   * @returns Artifact ID
   */
  private getArtifactId(artifact: Artifact): string {
    // In the real implementation, artifacts would have an ID field
    // For now, we'll use the title as a fallback
    return artifact.metadata?.title?.replace(/\s+/g, '-') || 'unknown';
  }
}
