/**
 * Query system for filtering and searching Kodebase artifacts
 *
 * @module @kodebase/core/query
 * @description Provides a simple, chainable API for querying artifacts.
 * Supports filtering by status, milestone, and artifact type.
 *
 * @example
 * ```typescript
 * const query = new ArtifactQuery(artifacts);
 * const results = query
 *   .byStatus('ready')
 *   .inMilestone('A.3')
 *   .ofType('issue')
 *   .execute();
 * ```
 */

import type {
  Artifact,
  ArtifactType,
  Initiative,
  Issue,
  Milestone,
  TArtifactEvent,
} from '../data/types';
import { CArtifact } from '../data/types/constants';

/**
 * Query builder for filtering artifacts
 * @param artifacts - Array of artifacts to query
 * @returns New ArtifactQuery instance
 */
export class ArtifactQuery {
  private artifacts: Artifact[];
  private filters: Array<(artifact: Artifact) => boolean> = [];

  constructor(artifacts: Artifact[]) {
    this.artifacts = artifacts;
  }

  /**
   * Filter artifacts by their current status (latest event)
   * @param status - The status to filter by
   * @returns The query instance for chaining
   */
  byStatus(status: TArtifactEvent): this {
    this.filters.push((artifact) => {
      const events = artifact.metadata.events;
      if (events.length === 0) return false;
      const latestEvent = events[events.length - 1];
      return latestEvent?.event === status;
    });
    return this;
  }

  /**
   * Filter artifacts by milestone ID
   * @param milestoneId - The milestone ID to filter by (e.g., 'A.3')
   * @returns The query instance for chaining
   */
  inMilestone(milestoneId: string): this {
    this.filters.push((artifact) => {
      // Extract artifact ID from the artifact
      const artifactId = this.getArtifactId(artifact);
      if (!artifactId) return false;

      // Check if artifact belongs to the milestone
      return artifactId.startsWith(`${milestoneId}.`);
    });
    return this;
  }

  /**
   * Filter artifacts by type
   * @param type - The artifact type to filter by
   * @returns The query instance for chaining
   */
  ofType(type: ArtifactType): this {
    this.filters.push((artifact) => {
      return this.getArtifactType(artifact) === type;
    });
    return this;
  }

  /**
   * Execute the query and return matching artifacts
   * @returns Array of artifacts matching all filters
   */
  execute(): Artifact[] {
    return this.artifacts.filter((artifact) =>
      this.filters.every((filter) => filter(artifact)),
    );
  }

  /**
   * Helper to determine artifact type
   * @param artifact - The artifact to determine the type of
   * @returns The artifact type
   */
  private getArtifactType(artifact: Artifact): ArtifactType {
    if ('vision' in artifact.content) return CArtifact.INITIATIVE;
    if ('deliverables' in artifact.content) return CArtifact.MILESTONE;
    if ('acceptance_criteria' in artifact.content) return CArtifact.ISSUE;
    throw new Error('Unknown artifact type');
  }

  /**
   * Helper to extract artifact ID
   * Note: In a real implementation, this would be a property on the artifact
   * For now, we'll need to pass it separately or enhance the artifact structure
   * @param artifact - The artifact to extract the ID from
   * @returns The artifact ID or null if not found
   */
  private getArtifactId(artifact: Artifact): string | null {
    // This is a limitation - artifacts don't currently have their ID stored within them
    // In practice, the caller would need to maintain a mapping or enhance the structure
    // For now, we'll check if the artifact has an ID attached via a non-standard property
    const artifactWithId = artifact as Artifact & { id?: string };
    return artifactWithId.id || null;
  }
}

/**
 * Factory function to create a new query
 * @param artifacts - Array of artifacts to query
 * @returns New ArtifactQuery instance
 */
export function query(artifacts: Artifact[]): ArtifactQuery {
  return new ArtifactQuery(artifacts);
}

/**
 * Type guard for Initiative
 * @param artifact - The artifact to check if it is an initiative
 * @returns True if the artifact is an initiative, false otherwise
 */
export function isInitiative(artifact: Artifact): artifact is Initiative {
  return 'vision' in artifact.content;
}

/**
 * Type guard for Milestone
 * @param artifact - The artifact to check if it is a milestone
 * @returns True if the artifact is a milestone, false otherwise
 */
export function isMilestone(artifact: Artifact): artifact is Milestone {
  return 'deliverables' in artifact.content;
}

/**
 * Type guard for Issue
 * @param artifact - The artifact to check if it is an issue
 * @returns True if the artifact is an issue, false otherwise
 */
export function isIssue(artifact: Artifact): artifact is Issue {
  return 'acceptance_criteria' in artifact.content;
}
