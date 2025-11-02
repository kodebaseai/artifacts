/**
 * Pre-push hook implementation
 */

import { execSync } from 'node:child_process';
import { getCurrentState } from '@kodebase/core';
import { BranchValidator } from '../branch';
import { ARTIFACT_NOT_FOUND, errorFormatter } from '../error-handling';
import type { HookResult, PrePushContext, THookExitCode } from '../types';
import { CHookExitCode } from '../types';
import { ArtifactLoader } from './artifact-loader';

/**
 * Pre-push hook that validates artifact state before push
 */
export class PrePushHook {
  private validator: BranchValidator;
  private artifactLoader: ArtifactLoader;

  constructor() {
    this.validator = new BranchValidator();
    this.artifactLoader = new ArtifactLoader();
  }

  /**
   * Determine if the hook should run
   */
  async shouldRun(context: PrePushContext): Promise<boolean> {
    return context.refs.length > 0;
  }

  /**
   * Run the pre-push hook
   */
  async run(context: PrePushContext): Promise<HookResult> {
    try {
      const warnings: string[] = [];
      const errors: string[] = [];

      // Check uncommitted changes once
      const hasChanges = await this.hasUncommittedChanges(context.repoPath);
      if (hasChanges) {
        warnings.push('Warning: Uncommitted changes detected');
        console.log(
          '⚠️  Warning: You have uncommitted changes that will not be pushed',
        );
      }

      // Validate each ref being pushed
      for (const ref of context.refs) {
        const branchName = this.extractBranchFromRef(ref.localRef);

        if (!branchName) {
          continue; // Skip non-branch refs (tags, etc.)
        }

        // Check if it's an artifact branch
        const validation = this.validator.validate(branchName);
        if (!validation.valid) {
          console.log(`✓ Non-artifact branch: ${branchName}`);
          continue;
        }

        // Get artifact status using @kodebase/core
        const artifactId = validation.artifactId;
        if (!artifactId) {
          continue; // Should not happen for valid artifacts
        }

        const status = await this.getArtifactStatus(
          artifactId,
          context.repoPath,
        );

        if (!status) {
          const formatted = errorFormatter.format({
            ...ARTIFACT_NOT_FOUND,
            debug: {
              operation: 'pre-push-validation',
              context: {
                artifactId,
                branchName,
                ref: ref.localRef,
                repoPath: context.repoPath,
              },
              timestamp: new Date().toISOString(),
            },
          });
          warnings.push(
            `Artifact not found: ${artifactId} - ${formatted.message}`,
          );
          continue;
        }

        // Check if artifact is in pushable state
        if (status === 'completed') {
          const formatted = errorFormatter.format({
            code: 'ARTIFACT_STATE_002',
            severity: 'error',
            category: 'validation',
            type: 'user_error',
            message: 'Cannot push to completed artifact',
            description: `Artifact ${artifactId} is already completed and should not receive new changes`,
            impact:
              'Prevents accidental modifications to completed work and maintains artifact lifecycle integrity',
            actions: [
              {
                description: 'Create a new artifact for additional work',
                command: 'Create a new issue/milestone artifact instead',
              },
              {
                description: 'If this is a bug fix, create a hotfix branch',
                command: `git checkout -b ${artifactId}-hotfix`,
              },
              {
                description: 'Review artifact lifecycle documentation',
                link: 'https://docs.kodebase.ai/artifacts/lifecycle',
              },
            ],
            debug: {
              operation: 'pre-push-validation',
              context: {
                artifactId,
                currentState: status,
                branchName,
                allowedStates: ['draft', 'ready', 'in_progress', 'in_review'],
              },
              timestamp: new Date().toISOString(),
            },
          });
          errors.push(formatted.message);
        } else if (status === 'archived') {
          const formatted = errorFormatter.format({
            code: 'ARTIFACT_STATE_003',
            severity: 'error',
            category: 'validation',
            type: 'user_error',
            message: 'Cannot push to archived artifact',
            description: `Artifact ${artifactId} has been archived and is read-only`,
            impact:
              'Archived artifacts are historical records and should not be modified',
            actions: [
              {
                description:
                  'Check if you meant to work on a different artifact',
                command: 'git branch -a | grep -v archived',
              },
              {
                description:
                  'Create a new artifact if additional work is needed',
                command: 'Create a new issue/milestone artifact instead',
              },
              {
                description: 'Contact team lead if archive status is incorrect',
              },
            ],
            debug: {
              operation: 'pre-push-validation',
              context: {
                artifactId,
                currentState: status,
                branchName,
              },
              timestamp: new Date().toISOString(),
            },
          });
          errors.push(formatted.message);
        } else {
          console.log(`✓ Artifact ${artifactId} is ${status}, push allowed`);
        }
      }

      // Return result based on errors
      if (errors.length > 0) {
        return {
          exitCode: CHookExitCode.ERROR,
          message: `Pre-push validation failed:\n${errors.join('\n\n')}`,
          continue: false,
        };
      }

      const message =
        warnings.length > 0
          ? `✅ Pre-push validation passed with warnings:\n${warnings.join('\n')}`
          : '✅ Pre-push validation passed';

      return {
        exitCode: CHookExitCode.SUCCESS,
        message,
        continue: true,
      };
    } catch (error) {
      console.error('Pre-push hook error:', error);

      const formatted = errorFormatter.createStructuredError(
        error instanceof Error ? error : String(error),
        'pre-push-hook',
        {
          repoPath: context.repoPath,
          remoteName: context.remoteName,
          remoteUrl: context.remoteUrl,
          refs: context.refs.map((ref) => ({
            local: ref.localRef,
            remote: ref.remoteRef,
          })),
        },
        context.repoPath,
      );

      const result = errorFormatter.format(formatted);

      return {
        exitCode: result.exitCode as THookExitCode,
        message: result.message,
        continue: result.shouldContinue,
      };
    }
  }

  /**
   * Extract branch name from git ref
   */
  private extractBranchFromRef(ref: string): string | null {
    // refs/heads/branch-name -> branch-name
    const match = ref.match(/^refs\/heads\/(.+)$/);
    return match ? (match[1] ?? null) : null;
  }

  /**
   * Get artifact status using @kodebase/core
   */
  private async getArtifactStatus(
    artifactId: string,
    repoPath: string,
  ): Promise<string | null> {
    try {
      const artifact = await this.artifactLoader.loadArtifact(
        artifactId,
        repoPath,
      );
      if (!artifact) {
        return null;
      }

      const currentState = getCurrentState(artifact.metadata.events);
      return currentState;
    } catch (error) {
      console.warn(`Failed to load artifact ${artifactId}:`, error);
      return null;
    }
  }

  /**
   * Check for uncommitted changes
   */
  private async hasUncommittedChanges(repoPath: string): Promise<boolean> {
    try {
      const result = execSync('git status --porcelain', {
        cwd: repoPath,
        encoding: 'utf-8',
        timeout: 5000,
      });
      return result.trim().length > 0;
    } catch (error) {
      console.warn('Failed to check git status:', error);
      return false; // Assume no changes if we can't check
    }
  }
}
