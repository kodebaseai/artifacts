/**
 * Completion Cascade Analyzer for Kodebase
 *
 * Analyzes completion cascades to determine what artifacts can be unblocked
 * when specific artifacts complete. This is the core of issue B.3.1.
 */

import type { Artifact, TArtifactEvent } from '../../data/types';
import { CArtifactEvent } from '../../data/types/constants';
import { ArtifactQuery } from '../../query';
import { hasCircularDependency } from '../validation/dependencies';
import { CascadeEngine } from './engine';

/**
 * Result of completion cascade analysis
 */
export interface CompletionCascadeResult {
  /** Whether this completion would trigger cascades */
  hasCascades: boolean;
  /** Artifacts that would be unblocked by this completion */
  unblocked: UnblockedArtifact[];
  /** Artifacts that would auto-complete due to cascades */
  autoCompleted: CompletedArtifact[];
  /** Time taken for analysis (performance tracking) */
  analysisTimeMs: number;
  /** Any errors encountered during analysis */
  errors: string[];
}

/**
 * Artifact that gets unblocked by completion
 */
export interface UnblockedArtifact {
  /** Artifact ID */
  id: string;
  /** Current state */
  currentState: TArtifactEvent;
  /** New state after unblocking */
  newState: TArtifactEvent;
  /** Reason for unblocking */
  reason: string;
}

/**
 * Artifact that auto-completes due to cascade
 */
export interface CompletedArtifact {
  /** Artifact ID */
  id: string;
  /** Current state */
  currentState: TArtifactEvent;
  /** Completion reason */
  reason: string;
  /** Child artifacts that triggered completion */
  triggeredBy: string[];
}

/**
 * Actionable recommendations for what to work on next
 */
export interface CompletionRecommendations {
  /** Artifacts ready to start */
  readyToStart: string[];
  /** Artifacts that could be completed */
  canComplete: string[];
  /** Blocked artifacts and what they're waiting for */
  blocked: BlockedArtifact[];
  /** Performance metrics */
  analysisTimeMs: number;
}

/**
 * Information about blocked artifacts
 */
export interface BlockedArtifact {
  /** Artifact ID */
  id: string;
  /** What it's blocked by */
  blockedBy: string[];
  /** States of blocking artifacts */
  blockerStates: Record<string, TArtifactEvent>;
}

/**
 * Complete cascade analysis result
 */
export interface FullCascadeAnalysis {
  /** Total artifacts analyzed */
  totalArtifacts: number;
  /** Completion recommendations */
  recommendations: CompletionRecommendations;
  /** Potential completion cascades for each artifact */
  completionCascades: Record<string, CompletionCascadeResult>;
  /** Circular dependencies detected */
  circularDependencies: string[];
  /** Performance metrics */
  performanceMs: number;
}

/**
 * Enhanced cascade analyzer for completion checking
 */
export class CompletionCascadeAnalyzer extends CascadeEngine {
  /**
   * Analyzes what would happen if an artifact completes
   *
   * @param artifactId - ID of artifact to analyze completion for
   * @param artifacts - Map of artifact ID to artifact
   * @returns Completion cascade analysis
   */
  analyzeCompletionCascade(
    artifactId: string,
    artifacts: Map<string, Artifact>,
  ): CompletionCascadeResult {
    const startTime = performance.now();
    const result: CompletionCascadeResult = {
      hasCascades: false,
      unblocked: [],
      autoCompleted: [],
      analysisTimeMs: 0,
      errors: [],
    };

    try {
      const artifact = artifacts.get(artifactId);
      if (!artifact) {
        result.errors.push(`Artifact ${artifactId} not found`);
        return result;
      }

      // Find directly unblocked artifacts
      const directlyUnblocked = this.findDirectlyUnblocked(
        artifactId,
        artifacts,
      );
      result.unblocked.push(...directlyUnblocked);

      // Find parent cascades (milestone/initiative completion)
      const parentCascades = this.findParentCascades(artifactId, artifacts);
      result.autoCompleted.push(...parentCascades);

      // Check if any parent completions would unblock more artifacts
      for (const completed of parentCascades) {
        const secondaryUnblocked = this.findDirectlyUnblocked(
          completed.id,
          artifacts,
        );
        result.unblocked.push(...secondaryUnblocked);
      }

      result.hasCascades =
        result.unblocked.length > 0 || result.autoCompleted.length > 0;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : String(error),
      );
    }

    result.analysisTimeMs = performance.now() - startTime;
    return result;
  }

  /**
   * Provides actionable recommendations for what to work on next
   *
   * @param artifacts - Map of artifact ID to artifact
   * @returns Completion recommendations
   */
  getCompletionRecommendations(
    artifacts: Map<string, Artifact>,
  ): CompletionRecommendations {
    const startTime = performance.now();

    // Create artifacts with IDs attached for the query system
    const artifactArray = Array.from(artifacts.entries()).map(
      ([id, artifact]) => ({
        ...artifact,
        id,
      }),
    );

    const query = new ArtifactQuery(artifactArray);

    // Find ready artifacts (can start work)
    const readyArtifacts = query.byStatus(CArtifactEvent.READY).execute();
    const readyToStart = readyArtifacts.map(
      (a) => (a as unknown as Artifact & { id: string }).id,
    );

    // Find artifacts that could be completed (all children done)
    const canComplete: string[] = [];
    const inProgressArtifacts = query
      .byStatus(CArtifactEvent.IN_PROGRESS)
      .execute();

    for (const artifact of inProgressArtifacts) {
      const children = this.findChildren(artifact, artifacts);
      const cascade = this.shouldCascadeToParent(children);
      if (
        cascade.shouldCascade &&
        cascade.newState === CArtifactEvent.IN_REVIEW
      ) {
        canComplete.push((artifact as unknown as Artifact & { id: string }).id);
      }
    }

    // Find blocked artifacts directly from the artifacts map (simpler approach)
    const blocked: BlockedArtifact[] = [];
    for (const [id, artifact] of artifacts) {
      const currentState = this.getCurrentState(artifact);
      if (currentState === CArtifactEvent.BLOCKED) {
        const blockedBy = artifact.metadata.relationships.blocked_by;
        const blockerStates: Record<string, TArtifactEvent> = {};

        for (const blockerId of blockedBy) {
          const blocker = artifacts.get(blockerId);
          if (blocker) {
            blockerStates[blockerId] = this.getCurrentState(blocker);
          }
        }

        blocked.push({
          id,
          blockedBy,
          blockerStates,
        });
      }
    }

    return {
      readyToStart,
      canComplete,
      blocked,
      analysisTimeMs: performance.now() - startTime,
    };
  }

  /**
   * Performs complete cascade analysis for all artifacts
   *
   * @param artifacts - Map of artifact ID to artifact
   * @returns Full cascade analysis
   */
  analyzeFullCascade(artifacts: Map<string, Artifact>): FullCascadeAnalysis {
    const startTime = performance.now();

    // Check for circular dependencies
    const relationships = new Map(
      Array.from(artifacts.entries()).map(([id, artifact]) => [
        id,
        artifact.metadata.relationships,
      ]),
    );

    const circularDependencies: string[] = [];
    for (const artifactId of artifacts.keys()) {
      if (hasCircularDependency(artifactId, relationships)) {
        circularDependencies.push(artifactId);
      }
    }

    // Get recommendations
    const recommendations = this.getCompletionRecommendations(artifacts);

    // Analyze completion cascades for each artifact
    const completionCascades: Record<string, CompletionCascadeResult> = {};
    for (const artifactId of artifacts.keys()) {
      completionCascades[artifactId] = this.analyzeCompletionCascade(
        artifactId,
        artifacts,
      );
    }

    return {
      totalArtifacts: artifacts.size,
      recommendations,
      completionCascades,
      circularDependencies,
      performanceMs: performance.now() - startTime,
    };
  }

  /**
   * Finds artifacts directly unblocked by completion of given artifact
   *
   * @param completedArtifactId - ID of completed artifact
   * @param artifacts - Map of all artifacts
   * @returns Array of unblocked artifacts
   */
  private findDirectlyUnblocked(
    completedArtifactId: string,
    artifacts: Map<string, Artifact>,
  ): UnblockedArtifact[] {
    const unblocked: UnblockedArtifact[] = [];

    for (const [id, artifact] of artifacts) {
      if (
        artifact.metadata.relationships.blocked_by.includes(completedArtifactId)
      ) {
        const currentState = this.getCurrentState(artifact);

        // Only blocked or draft artifacts can be unblocked
        if (
          currentState === CArtifactEvent.BLOCKED ||
          currentState === CArtifactEvent.DRAFT
        ) {
          // Check if this is the only blocker
          const remainingBlockers =
            artifact.metadata.relationships.blocked_by.filter((blockerId) => {
              const blocker = artifacts.get(blockerId);
              return (
                blocker &&
                this.getCurrentState(blocker) !== CArtifactEvent.COMPLETED
              );
            });

          const newState =
            remainingBlockers.length === 1 // Only this completion removes the block
              ? CArtifactEvent.READY
              : currentState; // Still blocked by others

          if (newState !== currentState) {
            unblocked.push({
              id,
              currentState,
              newState,
              reason: `Unblocked by completion of ${completedArtifactId}`,
            });
          }
        }
      }
    }

    return unblocked;
  }

  /**
   * Finds parent artifacts that would auto-complete due to this completion
   *
   * @param completedArtifactId - ID of completed artifact
   * @param artifacts - Map of all artifacts
   * @returns Array of auto-completed parent artifacts
   */
  private findParentCascades(
    completedArtifactId: string,
    artifacts: Map<string, Artifact>,
  ): CompletedArtifact[] {
    const autoCompleted: CompletedArtifact[] = [];

    // Find parent artifacts (artifacts that contain this one as a child)
    const parents = this.findParents(completedArtifactId, artifacts);

    for (const parent of parents) {
      const children = this.findChildren(parent, artifacts);
      const cascade = this.shouldCascadeToParent(children);

      if (
        cascade.shouldCascade &&
        cascade.newState === CArtifactEvent.IN_REVIEW
      ) {
        // Find the parent ID in the artifacts map
        let parentId: string | undefined;
        for (const [id, artifact] of artifacts) {
          if (artifact === parent) {
            parentId = id;
            break;
          }
        }

        if (parentId) {
          // Find child IDs in the artifacts map
          const childIds = children.map((child) => {
            for (const [id, artifact] of artifacts) {
              if (artifact === child) {
                return id;
              }
            }
            return 'unknown';
          });

          autoCompleted.push({
            id: parentId,
            currentState: this.getCurrentState(parent),
            reason: cascade.reason,
            triggeredBy: childIds,
          });
        }
      }
    }

    return autoCompleted;
  }

  /**
   * Finds parent artifacts that contain the given artifact ID
   *
   * @param artifactId - Child artifact ID
   * @param artifacts - Map of all artifacts
   * @returns Array of parent artifacts
   */
  private findParents(
    artifactId: string,
    artifacts: Map<string, Artifact>,
  ): Artifact[] {
    const parents: Artifact[] = [];

    // Extract the hierarchy from ID (e.g., A.1.5 -> parents are A.1 and A)
    const idParts = artifactId.split('.');

    for (let i = 1; i < idParts.length; i++) {
      const parentId = idParts.slice(0, i).join('.');
      const parent = artifacts.get(parentId);
      if (parent) {
        parents.push(parent);
      }
    }

    return parents;
  }

  /**
   * Finds child artifacts of the given parent
   *
   * @param parent - Parent artifact
   * @param artifacts - Map of all artifacts
   * @returns Array of child artifacts
   */
  private findChildren(
    parent: Artifact,
    artifacts: Map<string, Artifact>,
  ): Artifact[] {
    // Find the parent ID by searching the artifacts map
    let parentId: string | undefined;
    for (const [id, artifact] of artifacts) {
      if (artifact === parent) {
        parentId = id;
        break;
      }
    }

    if (!parentId) {
      return [];
    }

    const children: Artifact[] = [];
    for (const [id, artifact] of artifacts) {
      // Check if this artifact is a direct child (e.g., A.1.1 is child of A.1)
      if (
        id.startsWith(`${parentId}.`) &&
        id.split('.').length === parentId.split('.').length + 1
      ) {
        children.push(artifact);
      }
    }

    return children;
  }

  /**
   * Extracts artifact ID from artifact object
   * TODO: This is a temporary solution until artifacts have ID fields
   *
   * @param artifact - The artifact
   * @returns Artifact ID
   */
  private getArtifactIdFromArtifact(artifact: Artifact): string {
    // This is a workaround - in practice we'd need the ID passed with the artifact
    // For now, use title as a placeholder
    return artifact.metadata.title.replace(/\s+/g, '-').toLowerCase();
  }
}
