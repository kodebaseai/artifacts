/**
 * Branch cleanup utilities
 */

import type { SimpleGit } from 'simple-git';
import type { BranchCleanupOptions, BranchCleanupResult } from '../types';
import { BranchValidator } from './validator';

/**
 * Cleans up merged and stale branches
 */
export class BranchCleaner {
  private validator: BranchValidator;
  private protectedBranches = new Set([
    'main',
    'master',
    'develop',
    'staging',
    'production',
  ]);

  constructor(private git: SimpleGit) {
    this.validator = new BranchValidator();
  }

  /**
   * Clean up branches based on options
   */
  async cleanup(options: BranchCleanupOptions): Promise<BranchCleanupResult> {
    const {
      deleteLocal = true,
      deleteRemote = false,
      force = false,
      exclude = [],
      mergedOnly = true,
      targetBranch = 'main',
    } = options;

    const result: BranchCleanupResult = {
      deleted: [],
      skipped: [],
      errors: [],
    };

    // Check if we're in a git repository
    const isRepo = await this.git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Not in a git repository');
    }

    // Get current branch
    const branches = await this.git.branch();
    const currentBranch = branches.current;

    // Get branches to process
    const allBranches = branches.all;
    const mergedBranches = mergedOnly
      ? await this.getMergedBranches(targetBranch)
      : [];

    for (const branch of allBranches) {
      // Skip if branch is in exclude list
      if (exclude.includes(branch)) {
        result.skipped.push(branch);
        continue;
      }

      // Skip protected branches
      if (this.protectedBranches.has(branch)) {
        result.skipped.push(branch);
        continue;
      }

      // Skip current branch
      if (branch === currentBranch) {
        result.skipped.push(branch);
        continue;
      }

      // Skip if not a valid artifact branch
      const validation = this.validator.validate(branch);
      if (!validation.valid) {
        result.skipped.push(branch);
        continue;
      }

      // Skip if mergedOnly is true and branch is not merged
      if (mergedOnly && !mergedBranches.includes(branch)) {
        result.skipped.push(branch);
        continue;
      }

      // Delete the branch
      try {
        if (deleteLocal) {
          await this.git.deleteLocalBranch(branch, force);
        }

        if (deleteRemote) {
          await this.git.push(['origin', '--delete', branch]);
        }

        result.deleted.push(branch);
      } catch (error) {
        result.errors.push({
          branch,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  /**
   * Get list of branches merged into target branch
   */
  async getMergedBranches(targetBranch: string): Promise<string[]> {
    try {
      const mergedOutput = await this.git.raw([
        'branch',
        '--merged',
        targetBranch,
      ]);
      return mergedOutput
        .split('\n')
        .map((line) => line.trim().replace('* ', ''))
        .filter((branch) => branch && branch !== targetBranch);
    } catch {
      return [];
    }
  }

  /**
   * Get list of branches not merged into target branch
   */
  async getUnmergedBranches(targetBranch: string): Promise<string[]> {
    try {
      const unmergedOutput = await this.git.raw([
        'branch',
        '--no-merged',
        targetBranch,
      ]);
      return unmergedOutput
        .split('\n')
        .map((line) => line.trim().replace('* ', ''))
        .filter((branch) => branch && branch !== targetBranch);
    } catch {
      return [];
    }
  }

  /**
   * Get branches that haven't been updated in a certain number of days
   */
  async getStaleBranches(days: number): Promise<string[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

      // Get branches with their last commit dates
      const branchesOutput = await this.git.raw([
        'for-each-ref',
        '--format=%(refname:short) %(committerdate:unix)',
        'refs/heads',
      ]);

      const staleBranches: string[] = [];

      for (const line of branchesOutput.split('\n')) {
        if (!line.trim()) continue;

        const [branch, timestamp] = line.split(' ');
        if (branch && timestamp && parseInt(timestamp) < cutoffTimestamp) {
          staleBranches.push(branch);
        }
      }

      return staleBranches;
    } catch {
      return [];
    }
  }
}
