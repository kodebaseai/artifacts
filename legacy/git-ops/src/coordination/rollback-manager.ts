import type { TArtifactEvent } from '@kodebase/core';
import { RollbackError } from '../error-handling/coordination-errors';
import type { ArtifactLoader } from '../hooks/artifact-loader';
import type {
  GitContext,
  RollbackConfig,
  RollbackResult,
} from '../types/coordination';
import type { GitClient } from '../types/git-client';

/**
 * Manages rollback operations for failed workflow coordination
 */
export class RollbackManager {
  private defaultConfig: RollbackConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    preserveGitState: false,
    preserveArtifactState: true,
  };

  constructor(
    private artifactLoader: ArtifactLoader,
    private gitClient: GitClient,
  ) {}

  /**
   * Performs rollback of failed operations
   */
  async rollback(
    artifactId: string,
    targetState: TArtifactEvent,
    gitContext: GitContext,
    config: Partial<RollbackConfig> = {},
  ): Promise<RollbackResult> {
    const rollbackConfig = { ...this.defaultConfig, ...config };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= rollbackConfig.maxRetries; attempt++) {
      try {
        return await this.performRollback(
          artifactId,
          targetState,
          gitContext,
          rollbackConfig,
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < rollbackConfig.maxRetries) {
          await this.delay(rollbackConfig.retryDelay * attempt);
        }
      }
    }

    throw new RollbackError(
      `Rollback failed after ${rollbackConfig.maxRetries} attempts`,
      'retry_exhausted',
      lastError || undefined,
    );
  }

  /**
   * Performs a single rollback attempt
   */
  private async performRollback(
    artifactId: string,
    targetState: TArtifactEvent,
    gitContext: GitContext,
    config: RollbackConfig,
  ): Promise<RollbackResult> {
    const result: RollbackResult = {
      success: false,
      restoredState: targetState,
      gitStateRestored: false,
      artifactStateRestored: false,
    };

    try {
      // Phase 1: Restore artifact state if not preserving
      if (!config.preserveArtifactState) {
        await this.restoreArtifactState(artifactId, targetState);
        result.artifactStateRestored = true;
      }

      // Phase 2: Restore Git state if not preserving
      if (!config.preserveGitState) {
        await this.restoreGitState(gitContext);
        result.gitStateRestored = true;
      }

      result.success = true;
      return result;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      throw new RollbackError(
        `Rollback failed: ${result.error}`,
        'execution_failed',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Restores artifact to target state
   */
  private async restoreArtifactState(
    artifactId: string,
    targetState: TArtifactEvent,
  ): Promise<void> {
    try {
      const artifact = await this.artifactLoader.loadArtifact(
        artifactId,
        process.cwd(),
      );

      // Remove the last event if it doesn't match target state
      if (artifact.metadata.events && artifact.metadata.events.length > 0) {
        const lastEvent =
          artifact.metadata.events[artifact.metadata.events.length - 1];
        if (lastEvent?.event !== targetState) {
          artifact.metadata.events.pop();
        }
      }

      await this.artifactLoader.saveArtifact(
        artifact,
        artifactId,
        process.cwd(),
      );
    } catch (error) {
      throw new RollbackError(
        `Failed to restore artifact state for ${artifactId}`,
        'artifact_restore',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Restores Git state (placeholder implementation)
   */
  private async restoreGitState(_gitContext: GitContext): Promise<void> {
    // This would implement actual Git state restoration
    // For now, we'll just validate the restoration is possible
    const repositoryStatus = await this.gitClient.getRepositoryStatus();

    if (!repositoryStatus.isClean) {
      throw new RollbackError(
        'Cannot restore Git state: repository has uncommitted changes',
        'git_restore',
      );
    }
  }

  /**
   * Utility method to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Checks if rollback is possible for given context
   */
  async canRollback(
    artifactId: string,
    _targetState: TArtifactEvent,
    _gitContext: GitContext,
  ): Promise<boolean> {
    try {
      // Check if artifact exists and has events
      const artifact = await this.artifactLoader.loadArtifact(
        artifactId,
        process.cwd(),
      );
      if (!artifact.metadata.events || artifact.metadata.events.length === 0) {
        return false;
      }

      // Check if Git state allows rollback
      const repositoryStatus = await this.gitClient.getRepositoryStatus();
      if (!repositoryStatus.isClean) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}
