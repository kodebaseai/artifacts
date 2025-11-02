/**
 * PR Status Sync - Bidirectional sync between PR and artifact states
 */

import { execSync } from 'node:child_process';
import type { Artifact } from '@kodebase/core';
import { getCurrentState } from '@kodebase/core';
import { BranchValidator } from '../branch';
import { errorFormatter } from '../error-handling';
import { ArtifactLoader } from '../hooks/artifact-loader';
import { PRManager } from './pr-manager';

export interface PRSyncOptions {
  repoPath: string;
  artifactId: string;
  prNumber?: number;
  skipLabels?: boolean;
  skipComments?: boolean;
}

export interface PRSyncResult {
  success: boolean;
  prNumber?: number;
  prUrl?: string;
  actions: string[];
  error?: string;
}

/**
 * Handles bidirectional synchronization between PR status and artifact states
 */
export class PRSync {
  private artifactLoader: ArtifactLoader;
  private branchValidator: BranchValidator;
  private prManager: PRManager;

  constructor() {
    this.artifactLoader = new ArtifactLoader();
    this.branchValidator = new BranchValidator();
    this.prManager = new PRManager();
  }

  /**
   * Sync artifact state changes to PR status
   */
  async syncArtifactToPR(options: PRSyncOptions): Promise<PRSyncResult> {
    try {
      // Load artifact
      const artifact = await this.artifactLoader.loadArtifact(
        options.artifactId,
        options.repoPath,
      );

      if (!artifact) {
        return {
          success: false,
          actions: [],
          error: `Artifact ${options.artifactId} not found`,
        };
      }

      // Get current artifact state
      const currentState = getCurrentState(artifact.metadata.events);

      // Find associated PR
      const prNumber =
        options.prNumber ||
        (await this.findPRForArtifact(options.artifactId, options.repoPath));

      if (!prNumber) {
        return {
          success: false,
          actions: [],
          error: `No PR found for artifact ${options.artifactId}`,
        };
      }

      // Get PR info
      const prInfo = await this.prManager.getPRInfo(prNumber, options.repoPath);
      if (!prInfo) {
        return {
          success: false,
          actions: [],
          error: `PR #${prNumber} not found`,
        };
      }

      const actions: string[] = [];

      // Sync PR status based on artifact state
      await this.updatePRForArtifactState(
        artifact,
        currentState,
        prNumber,
        { isDraft: prInfo.isDraft ?? false, state: prInfo.state },
        options.repoPath,
        actions,
      );

      // Update PR labels if not skipped
      if (!options.skipLabels) {
        await this.updatePRLabels(
          prNumber,
          currentState,
          options.repoPath,
          actions,
        );
      }

      // Add status comment if not skipped
      if (!options.skipComments) {
        await this.addStatusComment(
          prNumber,
          artifact,
          currentState,
          options.repoPath,
          actions,
        );
      }

      return {
        success: true,
        prNumber,
        prUrl: prInfo.url,
        actions,
      };
    } catch (error) {
      const formatted = errorFormatter.createStructuredError(
        error instanceof Error ? error : String(error),
        'pr-sync-artifact-to-pr',
        {
          artifactId: options.artifactId,
          prNumber: options.prNumber,
        },
        options.repoPath,
      );

      const result = errorFormatter.format(formatted);
      return {
        success: false,
        actions: [],
        error: result.message,
      };
    }
  }

  /**
   * Find PR number for an artifact
   */
  private async findPRForArtifact(
    artifactId: string,
    repoPath: string,
  ): Promise<number | null> {
    try {
      // List PRs for the artifact branch
      const prs = await this.prManager.listPRs(repoPath, {
        branch: artifactId,
      });

      if (prs.length === 0) {
        return null;
      }

      // Return the most recent PR (assuming sorted by recency)
      return prs[0]?.number || null;
    } catch (error) {
      console.warn(`Failed to find PR for artifact ${artifactId}:`, error);
      return null;
    }
  }

  /**
   * Update PR status based on artifact state
   */
  private async updatePRForArtifactState(
    _artifact: Artifact,
    currentState: string,
    prNumber: number,
    prInfo: { isDraft: boolean; state: string },
    repoPath: string,
    actions: string[],
  ): Promise<void> {
    // Handle PR ready/draft status based on artifact state
    if (currentState === 'in_review' && prInfo.isDraft) {
      // Artifact is in review, PR should be ready
      await this.prManager.updatePR({
        repoPath,
        prNumber,
        ready: true,
      });
      actions.push('marked PR as ready for review');
    } else if (currentState === 'in_progress' && !prInfo.isDraft) {
      // Artifact is in progress, PR should be draft
      // Note: GitHub API doesn't support converting ready PR back to draft
      // This would require a different approach or just comment
      actions.push(
        'artifact in progress (PR cannot be converted back to draft)',
      );
    }

    // Handle PR closure for cancelled artifacts
    if (currentState === 'cancelled' && prInfo.state === 'open') {
      // Close PR if artifact is cancelled
      try {
        execSync(`gh pr close ${prNumber}`, {
          cwd: repoPath,
          encoding: 'utf-8',
        });
        actions.push('closed PR due to cancelled artifact');
      } catch (error) {
        console.warn(`Failed to close PR ${prNumber}:`, error);
        actions.push('failed to close PR for cancelled artifact');
      }
    }
  }

  /**
   * Update PR labels based on artifact state
   */
  private async updatePRLabels(
    prNumber: number,
    currentState: string,
    repoPath: string,
    actions: string[],
  ): Promise<void> {
    try {
      // Define state-based labels
      const stateLabels: Record<string, string> = {
        draft: 'status: draft',
        ready: 'status: ready',
        in_progress: 'status: in-progress',
        in_review: 'status: in-review',
        completed: 'status: completed',
        cancelled: 'status: cancelled',
        blocked: 'status: blocked',
      };

      const targetLabel = stateLabels[currentState];
      if (targetLabel) {
        // Remove existing status labels and add new one
        const removeLabels = Object.values(stateLabels).filter(
          (label) => label !== targetLabel,
        );

        // Remove old labels
        for (const label of removeLabels) {
          try {
            execSync(`gh pr edit ${prNumber} --remove-label "${label}"`, {
              cwd: repoPath,
              encoding: 'utf-8',
            });
          } catch (_error) {
            // Ignore errors for labels that don't exist
          }
        }

        // Add new label
        execSync(`gh pr edit ${prNumber} --add-label "${targetLabel}"`, {
          cwd: repoPath,
          encoding: 'utf-8',
        });

        actions.push(`updated PR label to ${targetLabel}`);
      }
    } catch (error) {
      console.warn(`Failed to update PR labels:`, error);
      actions.push('failed to update PR labels');
    }
  }

  /**
   * Add status comment to PR
   */
  private async addStatusComment(
    prNumber: number,
    artifact: Artifact,
    currentState: string,
    repoPath: string,
    actions: string[],
  ): Promise<void> {
    try {
      // Get latest event for context
      const latestEvent =
        artifact.metadata.events[artifact.metadata.events.length - 1];
      const timestamp = latestEvent?.timestamp || new Date().toISOString();
      const actor = latestEvent?.actor || 'system';

      // Create status comment
      const comment = `🔄 **Artifact Status Update**

**Status:** \`${currentState}\`
**Updated:** ${timestamp}
**Actor:** ${actor}

_This comment was automatically generated by the bidirectional PR sync system._`;

      // Add comment using gh CLI
      execSync(`gh pr comment ${prNumber} --body "${comment}"`, {
        cwd: repoPath,
        encoding: 'utf-8',
      });

      actions.push('added status comment to PR');
    } catch (error) {
      console.warn(`Failed to add status comment:`, error);
      actions.push('failed to add status comment');
    }
  }

  /**
   * Validate PR sync configuration
   */
  validateSyncConfig(options: PRSyncOptions): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!options.artifactId) {
      errors.push('Artifact ID is required');
    }

    if (!options.repoPath) {
      errors.push('Repository path is required');
    }

    // Validate artifact ID format
    if (options.artifactId) {
      const validation = this.branchValidator.validate(options.artifactId);
      if (!validation.valid) {
        errors.push(
          `Invalid artifact ID format: ${validation.error || 'Unknown error'}`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get sync status for an artifact
   */
  async getSyncStatus(
    artifactId: string,
    repoPath: string,
  ): Promise<{
    artifact: Artifact | null;
    currentState: string;
    prNumber: number | null;
    prUrl: string | null;
    lastSync: string | null;
  }> {
    try {
      // Load artifact
      const artifact = await this.artifactLoader.loadArtifact(
        artifactId,
        repoPath,
      );

      if (!artifact) {
        return {
          artifact: null,
          currentState: 'unknown',
          prNumber: null,
          prUrl: null,
          lastSync: null,
        };
      }

      const currentState = getCurrentState(artifact.metadata.events);
      const prNumber = await this.findPRForArtifact(artifactId, repoPath);

      let prUrl: string | null = null;
      if (prNumber) {
        const prInfo = await this.prManager.getPRInfo(prNumber, repoPath);
        prUrl = prInfo?.url || null;
      }

      // Find last sync event
      const syncEvents = artifact.metadata.events.filter(
        (event) => event.metadata?.automation_source === 'pr_sync',
      );
      const lastSync =
        syncEvents.length > 0
          ? syncEvents[syncEvents.length - 1]?.timestamp || null
          : null;

      return {
        artifact,
        currentState,
        prNumber,
        prUrl,
        lastSync,
      };
    } catch (error) {
      console.error(`Failed to get sync status for ${artifactId}:`, error);
      return {
        artifact: null,
        currentState: 'error',
        prNumber: null,
        prUrl: null,
        lastSync: null,
      };
    }
  }
}
