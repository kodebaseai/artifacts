/**
 * PR Management automation
 */

import { execSync } from 'node:child_process';
import type { TContextLevel } from '@kodebase/core';
import type {
  PRCreateOptions,
  PRInfo,
  PRListOptions,
  PRUpdateOptions,
} from '../types';
import {
  PRContextGenerator,
  type PRContextOptions,
} from './pr-context-generator';

/**
 * Manager for Pull Request operations using gh CLI
 */
export class PRManager {
  private contextGenerator: PRContextGenerator;

  constructor() {
    this.contextGenerator = new PRContextGenerator();
  }

  /**
   * Generate PR context for LLM-guided description creation
   */
  async generatePRContext(
    options: PRCreateOptions & {
      artifactId?: string;
      contextLevel?: TContextLevel;
    },
  ): Promise<{
    success: boolean;
    context?: string;
    error?: string;
  }> {
    try {
      // Get current branch if not specified
      let branch = options.branch;
      if (!branch) {
        branch = execSync('git branch --show-current', {
          cwd: options.repoPath,
          encoding: 'utf-8',
        }).trim();
      }

      // Extract artifact ID from branch name or use provided one
      const artifactMatch = branch.match(/^([A-Z]+(?:\.[0-9]+)*)/);
      const artifactId =
        options.artifactId || (artifactMatch ? artifactMatch[1] : '');

      if (!artifactId) {
        return {
          success: false,
          error: 'No artifact ID found in branch name or provided',
        };
      }

      // Generate PR context using the script
      const context = await this.contextGenerator.generateContextWithScript({
        repoPath: options.repoPath,
        artifactId,
        contextLevel: options.contextLevel || 'full',
      });

      return {
        success: true,
        context,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to generate PR context:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Generate PR context for updating existing PR
   */
  async generatePRContextForUpdate(
    options: PRUpdateOptions & {
      artifactId?: string;
      contextLevel?: TContextLevel;
    },
  ): Promise<{
    success: boolean;
    context?: string;
    error?: string;
  }> {
    try {
      if (!options.artifactId) {
        return {
          success: false,
          error: 'Artifact ID is required for context generation',
        };
      }

      // Generate PR context using the script
      const context = await this.contextGenerator.generateContextWithScript({
        repoPath: options.repoPath,
        artifactId: options.artifactId,
        contextLevel: options.contextLevel || 'full',
      });

      return {
        success: true,
        context,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to generate PR context for update:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Generate comprehensive PR context with structured data
   */
  async generateStructuredPRContext(options: PRContextOptions): Promise<{
    success: boolean;
    context?: {
      artifact: unknown;
      gitAnalysis: unknown;
      developmentInsights: unknown;
      llmGuidance: string;
    };
    error?: string;
  }> {
    try {
      const context = await this.contextGenerator.generateContext(options);
      return {
        success: true,
        context,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to generate structured PR context:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Create a draft PR for an artifact branch
   */
  async createDraftPR(options: PRCreateOptions): Promise<{
    success: boolean;
    prUrl?: string;
    prNumber?: number;
    error?: string;
  }> {
    try {
      // Get current branch if not specified
      let branch = options.branch;
      if (!branch) {
        branch = execSync('git branch --show-current', {
          cwd: options.repoPath,
          encoding: 'utf-8',
        }).trim();
      }

      // Extract artifact ID from branch name
      const artifactMatch = branch.match(/^([A-Z]+(?:\.[0-9]+)*)/);
      const artifactId = artifactMatch ? artifactMatch[1] : '';

      // Build PR title with artifact ID prefix
      const title = artifactId
        ? `${artifactId}: ${options.title}`
        : options.title;

      // Build gh command
      const args: string[] = ['gh', 'pr', 'create'];

      // Add title
      args.push('--title', `"${title}"`);

      // Add body if provided
      if (options.body) {
        args.push('--body', `"${options.body}"`);
      }

      // Add draft flag if specified (default is true)
      if (options.draft !== false) {
        args.push('--draft');
      }

      // Add assignees if provided
      if (options.assignees && options.assignees.length > 0) {
        args.push('--assignee', options.assignees.join(','));
      }

      // Add reviewers if provided
      if (options.reviewers && options.reviewers.length > 0) {
        args.push('--reviewer', options.reviewers.join(','));
      }

      // Execute gh command
      const command = args.join(' ');
      const output = execSync(command, {
        cwd: options.repoPath,
        encoding: 'utf-8',
      }).trim();

      // Extract PR number from URL
      const prNumber = this.extractPRNumber(output);

      console.log(`✓ Created PR: ${output}`);

      return {
        success: true,
        prUrl: output,
        prNumber,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to create PR:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update an existing PR
   */
  async updatePR(options: PRUpdateOptions): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Build gh command
      const args: string[] = ['gh', 'pr', 'edit', options.prNumber.toString()];

      // Add title if provided
      if (options.title) {
        args.push('--title', `"${options.title}"`);
      }

      // Add body if provided
      if (options.body) {
        args.push('--body', `"${options.body}"`);
      }

      // Mark as ready if specified
      if (options.ready) {
        args.push('--ready');
      }

      // Execute gh command
      const command = args.join(' ');
      execSync(command, {
        cwd: options.repoPath,
        encoding: 'utf-8',
      });

      console.log(`✓ Updated PR #${options.prNumber}`);

      return {
        success: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to update PR:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Merge a PR
   */
  async mergePR(
    prNumber: number,
    repoPath: string,
    options: {
      method?: 'merge' | 'squash' | 'rebase';
      deleteBranch?: boolean;
    } = {},
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const method = options.method || 'merge';

      // Build gh command
      const args: string[] = ['gh', 'pr', 'merge', prNumber.toString()];

      // Add merge method
      args.push(`--${method}`);

      // Add delete branch flag if specified
      if (options.deleteBranch) {
        args.push('--delete-branch');
      }

      // Execute gh command
      const command = args.join(' ');
      execSync(command, {
        cwd: repoPath,
        encoding: 'utf-8',
      });

      console.log(`✓ Merged PR #${prNumber} using ${method}`);

      return {
        success: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to merge PR:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get PR information
   */
  async getPRInfo(prNumber: number, repoPath: string): Promise<PRInfo | null> {
    try {
      const output = execSync(
        `gh pr view ${prNumber} --json number,title,state,url,author,isDraft`,
        {
          cwd: repoPath,
          encoding: 'utf-8',
        },
      );

      return JSON.parse(output);
    } catch (error) {
      // Handle PR not found gracefully
      if (
        error instanceof Error &&
        error.message.includes('no pull requests found')
      ) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List PRs with optional filters
   */
  async listPRs(
    repoPath: string,
    options: PRListOptions = {},
  ): Promise<PRInfo[]> {
    try {
      // Build gh command
      const args: string[] = ['gh', 'pr', 'list'];

      // Add branch filter if provided
      if (options.branch) {
        args.push('--head', options.branch);
      }

      // Add state filter if provided
      if (options.state) {
        args.push('--state', options.state);
      }

      // Always request JSON output with specific fields
      args.push('--json', 'number,title,state,url,author,isDraft');

      // Execute gh command
      const command = args.join(' ');
      const output = execSync(command, {
        cwd: repoPath,
        encoding: 'utf-8',
      });

      return JSON.parse(output);
    } catch (error) {
      console.error('Failed to list PRs:', error);
      return [];
    }
  }

  /**
   * Extract PR number from PR URL
   */
  private extractPRNumber(prUrl: string): number | undefined {
    // GitHub: https://github.com/org/repo/pull/123
    // GitLab: https://gitlab.com/org/repo/-/merge_requests/456
    const patterns = [/\/pull\/(\d+)/, /\/merge_requests\/(\d+)/];

    for (const pattern of patterns) {
      const match = prUrl.match(pattern);
      if (match?.[1]) {
        return parseInt(match[1], 10);
      }
    }

    return undefined;
  }
}
