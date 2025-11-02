/**
 * Post-merge hook implementation
 */

import { execSync } from 'node:child_process';
import {
  type Artifact,
  CascadeEngine,
  CompletionCascadeAnalyzer,
  canTransition,
  getCurrentState,
  performTransition,
} from '@kodebase/core';
import { BranchValidator } from '../branch';
import { CLIBridge } from '../cli-bridge';
import { errorFormatter } from '../error-handling';
import type { HookResult, PostMergeContext, THookExitCode } from '../types';
import { CHookExitCode } from '../types';
import { ArtifactLoader } from './artifact-loader';

/**
 * Post-merge hook that triggers completed status on artifact merge
 */
export class PostMergeHook {
  private artifactLoader: ArtifactLoader;
  private branchValidator: BranchValidator;
  private cascadeEngine: CascadeEngine;
  private completionAnalyzer: CompletionCascadeAnalyzer;
  private cliBridge: CLIBridge;

  constructor() {
    this.artifactLoader = new ArtifactLoader();
    this.branchValidator = new BranchValidator();
    this.cascadeEngine = new CascadeEngine();
    this.completionAnalyzer = new CompletionCascadeAnalyzer();
    this.cliBridge = new CLIBridge();
  }

  /**
   * Determine if the hook should run
   */
  async shouldRun(context: PostMergeContext): Promise<boolean> {
    // Only run on main/master branches
    const currentBranch = await this.getCurrentBranch(context.repoPath);
    return currentBranch === 'main' || currentBranch === 'master';
  }

  /**
   * Run the post-merge hook
   */
  async run(context: PostMergeContext): Promise<HookResult> {
    try {
      // Get the merged branch name
      const mergedBranch = await this.getMergedBranch(context);

      if (!mergedBranch) {
        return {
          exitCode: CHookExitCode.SUCCESS,
          message: 'Could not determine merged branch',
          continue: true,
        };
      }

      // Check if it's an artifact branch
      const validation = this.branchValidator.validate(mergedBranch);
      if (!validation.valid) {
        return {
          exitCode: CHookExitCode.SUCCESS,
          message: `Not an artifact branch: ${mergedBranch}`,
          continue: true,
        };
      }

      let eventAdded = false;
      let cascadeCompleted = false;
      const warnings: string[] = [];

      // Try to add completed event using @kodebase/core
      try {
        await this.performStateTransition(
          mergedBranch,
          'completed',
          context.repoPath,
          { mergeCommit: context.mergeCommit },
        );
        eventAdded = true;
        console.log(`✅ Marked artifact ${mergedBranch} as completed`);
      } catch (error) {
        const formatted = errorFormatter.createStructuredError(
          error instanceof Error ? error : String(error),
          'post-merge-state-transition',
          {
            artifactId: mergedBranch,
            targetState: 'completed',
            mergeCommit: context.mergeCommit,
          },
          context.repoPath,
        );

        const result = errorFormatter.format(formatted);
        warnings.push(`State transition failed: ${result.message}`);
        console.error('Failed to add completed event:', result.message);
      }

      // Try to cascade completion using CascadeEngine
      try {
        const cascadeResult = await this.performCascadeAnalysis(
          mergedBranch,
          context.repoPath,
        );
        cascadeCompleted = cascadeResult.cascaded;
        if (cascadeCompleted) {
          console.log(`✅ Cascade completion triggered for ${mergedBranch}`);
        }
      } catch (error) {
        const formatted = errorFormatter.createStructuredError(
          error instanceof Error ? error : String(error),
          'post-merge-cascade-analysis',
          {
            artifactId: mergedBranch,
            cascadeOperation: 'completion-analysis',
          },
          context.repoPath,
        );

        const result = errorFormatter.format(formatted);
        warnings.push(`Cascade analysis failed: ${result.message}`);
        console.error('Failed to cascade completion:', result.message);
      }

      // Build result message
      const messages = [];
      if (eventAdded) {
        messages.push('completed event added');
      } else {
        messages.push('Failed to add completed event');
      }
      if (cascadeCompleted) {
        messages.push('cascade completion triggered');
      } else if (warnings.length === 0) {
        messages.push('no cascade needed');
      }

      let finalMessage = `Post-merge hook completed for ${mergedBranch}: ${messages.join(', ')}`;

      if (warnings.length > 0) {
        finalMessage += `\n\n⚠️  Warnings:\n${warnings.join('\n')}`;
      }

      return {
        exitCode: CHookExitCode.SUCCESS,
        message: finalMessage,
        continue: true,
      };
    } catch (error) {
      console.error('Post-merge hook error:', error);

      const formatted = errorFormatter.createStructuredError(
        error instanceof Error ? error : String(error),
        'post-merge-hook',
        {
          repoPath: context.repoPath,
          mergeCommit: context.mergeCommit,
          isSquash: context.isSquash,
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
   * Perform state transition using @kodebase/core
   */
  private async performStateTransition(
    artifactId: string,
    newState: 'completed',
    repoPath: string,
    metadata?: { mergeCommit?: string },
  ): Promise<void> {
    // Load the artifact
    const artifact = await this.artifactLoader.loadArtifact(
      artifactId,
      repoPath,
    );
    if (!artifact) {
      throw new Error(`Artifact ${artifactId} not found`);
    }

    // Get current state
    const currentState = getCurrentState(artifact.metadata.events);

    // Check if transition is valid
    if (!canTransition(artifact, newState)) {
      throw new Error(
        `Cannot transition artifact ${artifactId} from ${currentState} to ${newState}`,
      );
    }

    // Get git actor info
    const actor = await this.artifactLoader.getGitActor(repoPath);

    // Perform the transition
    const eventMetadata = metadata?.mergeCommit
      ? { merge_commit: metadata.mergeCommit }
      : undefined;

    performTransition(artifact, newState, actor, eventMetadata);

    // Save the updated artifact
    await this.artifactLoader.saveArtifact(artifact, artifactId, repoPath);
  }

  /**
   * Perform cascade analysis using CascadeEngine
   */
  private async performCascadeAnalysis(
    artifactId: string,
    repoPath: string,
  ): Promise<{
    cascaded: boolean;
    completedArtifacts?: string[];
    error?: string;
  }> {
    try {
      // Load the completed artifact for cascade analysis
      const completedArtifact = await this.artifactLoader.loadArtifact(
        artifactId,
        repoPath,
      );

      // Load all artifacts for comprehensive cascade analysis
      const artifactMap = await this.loadAllArtifacts(repoPath);
      artifactMap.set(artifactId, completedArtifact);

      const cascadeResults = this.completionAnalyzer.analyzeCompletionCascade(
        artifactId,
        artifactMap,
      );

      if (!cascadeResults.hasCascades) {
        return { cascaded: false };
      }

      // Apply cascade completions with proper correlation tracking
      const completedArtifacts: string[] = [];
      const actor = await this.artifactLoader.getGitActor(repoPath);

      // Get the completion event from the trigger artifact for correlation
      const triggerEvent = completedArtifact.metadata.events.find(
        (e) => e.event === 'completed',
      );

      for (const result of cascadeResults.autoCompleted) {
        try {
          // Load the artifact that needs to be completed
          const artifact = await this.artifactLoader.loadArtifact(
            result.id,
            repoPath,
          );

          // Generate cascade event with proper correlation
          const cascadeEvent = triggerEvent
            ? this.cascadeEngine.generateCascadeEvent(
                'completed',
                triggerEvent,
                'completion_cascade',
              )
            : undefined;

          performTransition(
            artifact,
            'completed',
            actor,
            cascadeEvent?.metadata || { cascade_trigger: artifactId },
          );

          await this.artifactLoader.saveArtifact(artifact, result.id, repoPath);

          completedArtifacts.push(artifact.metadata.title);
          console.log(
            `Cascaded completion to ${result.id}: ${artifact.metadata.title}`,
          );
        } catch (error) {
          console.error(`Failed to cascade completion to ${result.id}:`, error);
          // Continue with other cascades even if one fails
        }
      }

      return {
        cascaded: completedArtifacts.length > 0,
        completedArtifacts,
      };
    } catch (error) {
      console.error('Cascade analysis error:', error);
      // Don't throw - cascade failures shouldn't break git operations
      // Return basic success result instead
      return {
        cascaded: false,
        error: error instanceof Error ? error.message : 'Unknown cascade error',
      };
    }
  }

  /**
   * Load all artifacts in the repository for comprehensive cascade analysis
   *
   * This method enables the CompletionCascadeAnalyzer to perform intelligent analysis
   * across the entire artifact hierarchy. It includes performance optimizations:
   * - Batched loading to avoid overwhelming the system
   * - Warning for large collections that may impact performance
   * - Graceful error handling for individual artifact failures
   *
   * @param repoPath - Repository root path
   * @returns Map of artifact ID to Artifact for cascade analysis
   */
  private async loadAllArtifacts(
    repoPath: string,
  ): Promise<Map<string, Artifact>> {
    const { glob } = await import('glob');
    const artifactMap = new Map<string, Artifact>();

    try {
      // Pattern to find all artifact files
      const pattern = `${repoPath}/.kodebase/artifacts/**/*.yml`;
      const files = await glob(pattern);

      console.log(`Loading ${files.length} artifacts for cascade analysis...`);

      // Process artifacts in batches to avoid overwhelming the system
      const BATCH_SIZE = 20;
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (file) => {
            const artifactId = this.extractArtifactIdFromPath(file);
            if (artifactId) {
              try {
                const artifact = await this.artifactLoader.loadArtifact(
                  artifactId,
                  repoPath,
                );
                artifactMap.set(artifactId, artifact);
              } catch (error) {
                console.warn(`Failed to load artifact ${artifactId}:`, error);
              }
            }
          }),
        );
      }

      console.log(`Loaded ${artifactMap.size} artifacts for cascade analysis`);

      // Warn if collection is getting large
      if (artifactMap.size > 100) {
        console.warn(
          `Large artifact collection (${artifactMap.size} artifacts) may impact cascade performance`,
        );
      }
    } catch (error) {
      console.error('Failed to load artifacts for cascade analysis:', error);
    }

    return artifactMap;
  }

  /**
   * Extract artifact ID from file path
   */
  private extractArtifactIdFromPath(filePath: string): string | null {
    const fileName = filePath.split('/').pop();
    if (!fileName || !fileName.endsWith('.yml')) {
      return null;
    }
    return fileName.replace('.yml', '');
  }

  /**
   * Get current branch name
   */
  private async getCurrentBranch(repoPath: string): Promise<string> {
    try {
      // Use CLI bridge with fallback to execSync
      const result = await this.cliBridge.executeCommand('git', [
        'rev-parse',
        '--abbrev-ref',
        'HEAD',
      ]);

      if (result.success) {
        return result.stdout.trim();
      } else {
        throw new Error(`Git command failed: ${result.stderr}`);
      }
    } catch (error) {
      console.warn('CLI bridge failed, falling back to execSync:', error);
      try {
        const output = execSync('git rev-parse --abbrev-ref HEAD', {
          cwd: repoPath,
          encoding: 'utf-8',
        });
        return output.trim();
      } catch (fallbackError) {
        console.error('Failed to get current branch:', fallbackError);
        return 'main'; // Default fallback
      }
    }
  }

  /**
   * Get the merged branch name from merge commit or git reflog
   */
  private async getMergedBranch(
    context: PostMergeContext,
  ): Promise<string | null> {
    try {
      // First, try to extract from merge commit message if available
      if (context.mergeCommit) {
        const branchFromCommit = this.extractBranchFromCommitMessage(
          context.mergeCommit,
        );
        if (branchFromCommit) {
          return branchFromCommit;
        }
      }

      // Fallback: Check recent merge in git reflog
      try {
        // Use CLI bridge with fallback to execSync
        const result = await this.cliBridge.executeCommand('git', [
          'reflog',
          '--oneline',
          '-1',
          '--grep=Merge branch',
          'HEAD',
        ]);

        if (result.success) {
          const branchFromReflog = this.extractBranchFromCommitMessage(
            result.stdout,
          );
          if (branchFromReflog) {
            return branchFromReflog;
          }
        } else {
          throw new Error(`Git reflog failed: ${result.stderr}`);
        }
      } catch (error) {
        console.warn(
          'CLI bridge failed for git reflog, falling back to execSync:',
          error,
        );
        try {
          const result = execSync(
            "git reflog --oneline -1 --grep='Merge branch' HEAD",
            {
              cwd: context.repoPath,
              encoding: 'utf-8',
              timeout: 5000,
            },
          );

          if (result) {
            const branchFromReflog =
              this.extractBranchFromCommitMessage(result);
            if (branchFromReflog) {
              return branchFromReflog;
            }
          }
        } catch (fallbackError) {
          console.error(
            'Failed to get merged branch from reflog:',
            fallbackError,
          );
        }
      }

      return null;
    } catch (error) {
      console.warn('Failed to determine merged branch:', error);
      return null;
    }
  }

  /**
   * Extract branch name from merge commit message
   */
  private extractBranchFromCommitMessage(message: string): string | null {
    // Pattern: "Merge branch 'branch-name'"
    const branchMatch = message.match(/Merge branch '([^']+)'/);
    if (branchMatch) {
      return branchMatch[1] ?? null;
    }

    // Pattern: "Merge branch 'branch-name' into target"
    const branchIntoMatch = message.match(/Merge branch '([^']+)' into/);
    if (branchIntoMatch) {
      return branchIntoMatch[1] ?? null;
    }

    // Pattern: "Merge pull request #123 from org/branch-name"
    const prMatch = message.match(/Merge pull request #\d+ from [^/]+\/(.+)/);
    if (prMatch) {
      return prMatch[1] ?? null;
    }

    return null;
  }
}
