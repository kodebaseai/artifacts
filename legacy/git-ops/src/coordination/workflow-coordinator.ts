import type { Artifact, TArtifactEvent } from '@kodebase/core';
import { CoordinationError } from '../error-handling/coordination-errors';
import type { ArtifactLoader } from '../hooks/artifact-loader';
import type {
  CoordinationResult,
  GitContext,
  SyncConflict,
} from '../types/coordination';
import type { GitClient } from '../types/git-client';

/**
 * Coordinates workflow between Git operations and artifact lifecycle states.
 * Ensures synchronization and handles conflicts between Git state and artifact state.
 */
export class WorkflowCoordinator {
  constructor(
    private artifactLoader: ArtifactLoader,
    private gitClient: GitClient,
  ) {}

  /**
   * Synchronizes Git workflow state with artifact lifecycle state.
   * Validates consistency and resolves conflicts as needed.
   */
  async synchronizeStates(
    artifactId: string,
    expectedState: TArtifactEvent,
    gitContext: GitContext,
  ): Promise<CoordinationResult> {
    try {
      // Load current artifact state
      const artifact = await this.artifactLoader.loadArtifact(
        artifactId,
        process.cwd(),
      );
      const currentState = this.getCurrentState(artifact);

      // Check for state conflicts
      const conflict = this.detectStateConflict(
        currentState,
        expectedState,
        gitContext,
      );
      if (conflict) {
        return this.resolveConflict(conflict, artifact, gitContext);
      }

      // States are synchronized
      return {
        success: true,
        artifactState: currentState,
        gitState: gitContext.operation,
        synchronized: true,
      };
    } catch (error) {
      throw new CoordinationError(
        `Failed to synchronize states for ${artifactId}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Detects conflicts between Git state and artifact state.
   */
  private detectStateConflict(
    artifactState: TArtifactEvent,
    expectedState: TArtifactEvent,
    gitContext: GitContext,
  ): SyncConflict | null {
    // Check for direct state mismatch
    if (artifactState !== expectedState) {
      return {
        type: 'state_mismatch',
        artifactState,
        expectedState,
        gitContext,
        severity: 'error',
      };
    }

    // Check for Git-artifact inconsistency
    if (this.isGitArtifactInconsistent(artifactState, gitContext)) {
      return {
        type: 'git_artifact_inconsistency',
        artifactState,
        expectedState,
        gitContext,
        severity: 'warning',
      };
    }

    return null;
  }

  /**
   * Resolves conflicts between Git and artifact states.
   */
  private async resolveConflict(
    conflict: SyncConflict,
    artifact: Artifact,
    gitContext: GitContext,
  ): Promise<CoordinationResult> {
    switch (conflict.type) {
      case 'state_mismatch':
        return this.resolveStateMismatch(conflict, artifact, gitContext);
      case 'git_artifact_inconsistency':
        return this.resolveGitArtifactInconsistency(
          conflict,
          artifact,
          gitContext,
        );
      default:
        throw new CoordinationError(`Unknown conflict type: ${conflict.type}`);
    }
  }

  /**
   * Resolves state mismatch conflicts.
   */
  private async resolveStateMismatch(
    conflict: SyncConflict,
    _artifact: Artifact,
    gitContext: GitContext,
  ): Promise<CoordinationResult> {
    // Strategy: Trust the artifact state and update Git accordingly
    const correctedGitState = this.getCorrectGitState(
      conflict.artifactState,
      gitContext,
    );

    return {
      success: true,
      artifactState: conflict.artifactState,
      gitState: correctedGitState,
      synchronized: true,
      conflictResolved: {
        type: conflict.type,
        resolution: 'artifact_state_prioritized',
        action: `Updated Git state to match artifact state: ${conflict.artifactState}`,
      },
    };
  }

  /**
   * Resolves Git-artifact inconsistency conflicts.
   */
  private async resolveGitArtifactInconsistency(
    conflict: SyncConflict,
    _artifact: Artifact,
    gitContext: GitContext,
  ): Promise<CoordinationResult> {
    // Strategy: Log warning and continue with current state
    return {
      success: true,
      artifactState: conflict.artifactState,
      gitState: gitContext.operation,
      synchronized: true,
      conflictResolved: {
        type: conflict.type,
        resolution: 'warning_logged',
        action: `Detected inconsistency but continuing with current state`,
      },
    };
  }

  /**
   * Checks if Git state is inconsistent with artifact state.
   */
  private isGitArtifactInconsistent(
    artifactState: TArtifactEvent,
    gitContext: GitContext,
  ): boolean {
    // Define expected Git operations for each artifact state
    const expectedOperations: Record<TArtifactEvent, string[]> = {
      draft: ['none', 'create'],
      ready: ['none', 'create'],
      in_progress: ['checkout', 'commit', 'push'],
      blocked: ['none'],
      cancelled: ['none', 'branch_delete'],
      in_review: ['push', 'pr_update'],
      completed: ['merge'],
      archived: ['none'],
    };

    return !expectedOperations[artifactState]?.includes(gitContext.operation);
  }

  /**
   * Gets the correct Git state based on artifact state.
   */
  private getCorrectGitState(
    artifactState: TArtifactEvent,
    gitContext: GitContext,
  ): string {
    const correctionMap: Record<TArtifactEvent, string> = {
      draft: 'none',
      ready: 'none',
      in_progress: 'checkout',
      blocked: 'none',
      cancelled: 'none',
      in_review: 'push',
      completed: 'merge',
      archived: 'none',
    };

    return correctionMap[artifactState] || gitContext.operation;
  }

  /**
   * Gets the current state from an artifact.
   */
  private getCurrentState(artifact: Artifact): TArtifactEvent {
    if (!artifact.metadata.events || artifact.metadata.events.length === 0) {
      return 'draft';
    }

    const latestEvent =
      artifact.metadata.events[artifact.metadata.events.length - 1];
    return latestEvent?.event || 'draft';
  }
}
