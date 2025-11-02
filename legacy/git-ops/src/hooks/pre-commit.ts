/**
 * Pre-commit hook implementation
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { BranchValidator } from '../branch';
import { errorFormatter } from '../error-handling';
import type { HookResult, PreCommitContext, THookExitCode } from '../types';
import { CCommitType, CHookExitCode } from '../types';

/**
 * Pre-commit hook that validates commit message format
 */
export class PreCommitHook {
  private validator: BranchValidator;

  constructor() {
    this.validator = new BranchValidator();
  }

  /**
   * Determine if the hook should run
   */
  async shouldRun(context: PreCommitContext): Promise<boolean> {
    // Only run if there are staged files
    return context.stagedFiles.length > 0;
  }

  /**
   * Run the pre-commit hook
   */
  async run(context: PreCommitContext): Promise<HookResult> {
    try {
      // Get current branch name
      const branchName = await this.getBranchNameSafely(context.repoPath);

      // Check if it's an artifact branch
      const validation = this.validator.validate(branchName);
      if (!validation.valid) {
        return {
          exitCode: CHookExitCode.SUCCESS,
          message: `Non-artifact branch (${branchName}), skipping validation`,
          continue: true,
        };
      }

      // Read commit message
      const commitMessage = await this.readCommitMessage(
        context.commitMessagePath,
      );

      // Check for empty message
      if (!commitMessage.trim()) {
        const formatted = errorFormatter.format({
          code: 'VALIDATION_COMMIT_001',
          severity: 'error',
          category: 'validation',
          type: 'user_error',
          message: 'Commit message cannot be empty',
          description: 'Git requires a commit message to create a commit',
          impact: 'Cannot create commit without a message',
          actions: [
            {
              description: 'Add a descriptive commit message',
              command: `git commit -m "${branchName}: type: Your commit description"`,
            },
            {
              description: 'Follow conventional commit format',
              link: 'https://docs.kodebase.ai/git-ops/commit-format',
            },
          ],
          debug: {
            operation: 'pre-commit-validation',
            context: {
              branchName,
              commitMessagePath: context.commitMessagePath,
            },
            timestamp: new Date().toISOString(),
          },
        });

        return {
          exitCode: formatted.exitCode as THookExitCode,
          message: formatted.message,
          continue: formatted.shouldContinue,
        };
      }

      // Extract artifact ID from commit message
      const commitArtifactMatch = commitMessage.match(
        /^([A-Z]+(?:\.[0-9]+)*):\s/,
      );

      if (!commitArtifactMatch) {
        const formatted = errorFormatter.format({
          code: 'VALIDATION_COMMIT_002',
          severity: 'error',
          category: 'validation',
          type: 'user_error',
          message: 'Invalid commit message format',
          description:
            'Commit message must start with artifact ID followed by colon',
          impact: 'Cannot link commit to artifact lifecycle tracking',
          actions: [
            {
              description: 'Use correct format with artifact ID prefix',
              command: `git commit --amend -m "${branchName}: feat: Your commit description"`,
            },
            {
              description: 'Check current branch for correct artifact ID',
              command: 'git branch --show-current',
            },
            {
              description: 'Learn about conventional commit format',
              link: 'https://docs.kodebase.ai/git-ops/commit-format',
            },
          ],
          debug: {
            operation: 'pre-commit-validation',
            context: {
              branchName,
              commitMessage: commitMessage.substring(0, 100),
              expectedFormat: `${branchName}: type: description`,
            },
            timestamp: new Date().toISOString(),
          },
        });

        return {
          exitCode: formatted.exitCode as THookExitCode,
          message: formatted.message,
          continue: formatted.shouldContinue,
        };
      }

      // Check if artifact ID matches branch name
      const commitArtifactId = commitArtifactMatch[1];
      if (commitArtifactId !== branchName) {
        const formatted = errorFormatter.format({
          code: 'VALIDATION_COMMIT_003',
          severity: 'error',
          category: 'validation',
          type: 'user_error',
          message: 'Artifact ID mismatch',
          description:
            'Commit message artifact ID does not match current branch name',
          impact:
            'Commit will be associated with wrong artifact, breaking lifecycle tracking',
          actions: [
            {
              description: 'Fix commit message to match branch',
              command: `git commit --amend -m "${branchName}: ${commitMessage.substring(commitArtifactMatch[0].length)}"`,
            },
            {
              description: 'Verify you are on the correct branch',
              command: 'git branch --show-current',
            },
            {
              description: 'Switch to correct branch if needed',
              command: `git checkout ${commitArtifactId}`,
            },
          ],
          debug: {
            operation: 'pre-commit-validation',
            context: {
              branchName,
              commitArtifactId,
              commitMessage: commitMessage.substring(0, 100),
            },
            timestamp: new Date().toISOString(),
          },
        });

        return {
          exitCode: formatted.exitCode as THookExitCode,
          message: formatted.message,
          continue: formatted.shouldContinue,
        };
      }

      // Extract the message after artifact ID
      const messageWithoutId = commitMessage.substring(
        commitArtifactMatch[0].length,
      );

      // Validate conventional commit format
      if (!this.isConventionalCommit(messageWithoutId)) {
        const formatted = errorFormatter.format({
          code: 'VALIDATION_COMMIT_004',
          severity: 'error',
          category: 'validation',
          type: 'user_error',
          message: 'Invalid conventional commit format',
          description:
            'Commit message must follow conventional commit format after artifact ID',
          impact:
            'Commit history becomes inconsistent and harder to track changes',
          actions: [
            {
              description: 'Use valid conventional commit type',
              command: `git commit --amend -m "${branchName}: feat: ${messageWithoutId}"`,
            },
            {
              description:
                'Valid types: feat, fix, docs, style, refactor, test, chore',
            },
            {
              description: 'Learn about conventional commits',
              link: 'https://conventionalcommits.org/',
            },
          ],
          debug: {
            operation: 'pre-commit-validation',
            context: {
              branchName,
              messageWithoutId,
              validTypes: Object.values(CCommitType),
            },
            timestamp: new Date().toISOString(),
          },
        });

        return {
          exitCode: formatted.exitCode as THookExitCode,
          message: formatted.message,
          continue: formatted.shouldContinue,
        };
      }

      return {
        exitCode: CHookExitCode.SUCCESS,
        message: `✅ Commit message validated for ${branchName}`,
        continue: true,
      };
    } catch (error) {
      console.error('Pre-commit hook error:', error);

      const formatted = errorFormatter.createStructuredError(
        error instanceof Error ? error : String(error),
        'pre-commit-hook',
        {
          repoPath: context.repoPath,
          commitMessagePath: context.commitMessagePath,
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
   * Get the current branch name with enhanced error handling
   */
  private async getBranchNameSafely(repoPath: string): Promise<string> {
    const result = execSync('git branch --show-current', {
      cwd: repoPath,
      encoding: 'utf-8',
      timeout: 5000,
    });
    return result.trim();
  }

  /**
   * Read commit message from file
   */
  private async readCommitMessage(messagePath?: string): Promise<string> {
    if (!messagePath) {
      throw new Error('Commit message path not provided in hook context');
    }

    try {
      return readFileSync(messagePath, 'utf-8');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to read commit message from ${messagePath}: ${message}`,
      );
    }
  }

  /**
   * Check if message follows conventional commit format
   */
  private isConventionalCommit(message: string): boolean {
    // Pattern: type(scope)?: description
    // Where type is one of the conventional commit types
    const types = Object.values(CCommitType).join('|');
    const pattern = new RegExp(`^(${types})(\\([^)]+\\))?(!)?:\\s.+`);
    return pattern.test(message);
  }
}
