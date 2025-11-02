import { execSync } from 'node:child_process';
import type { GitContext } from './coordination';

/**
 * Interface for Git client operations
 */
export interface GitClient {
  /**
   * Get current Git context
   */
  getContext(): Promise<GitContext>;

  /**
   * Get current branch name
   */
  getCurrentBranch(): Promise<string>;

  /**
   * Get current commit hash
   */
  getCurrentCommit(): Promise<string>;

  /**
   * Get Git author information
   */
  getAuthor(): Promise<{ name: string; email: string }>;

  /**
   * Check if branch exists
   */
  branchExists(branchName: string): Promise<boolean>;

  /**
   * Get branch status
   */
  getBranchStatus(branchName: string): Promise<{
    exists: boolean;
    isClean: boolean;
    hasUncommittedChanges: boolean;
  }>;

  /**
   * Get repository status
   */
  getRepositoryStatus(): Promise<{
    isClean: boolean;
    hasUncommittedChanges: boolean;
    hasUntrackedFiles: boolean;
  }>;
}

/**
 * Simple Git client implementation
 */
export class SimpleGitClient implements GitClient {
  async getContext(): Promise<GitContext> {
    const [branch, commit, author] = await Promise.all([
      this.getCurrentBranch(),
      this.getCurrentCommit(),
      this.getAuthor(),
    ]);

    return {
      operation: 'current',
      branch,
      commit,
      author: `${author.name} (${author.email})`,
      timestamp: new Date().toISOString(),
    };
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const result = execSync('git branch --show-current', {
        encoding: 'utf8',
      });
      return result.trim();
    } catch {
      return 'main'; // Fallback
    }
  }

  async getCurrentCommit(): Promise<string> {
    try {
      const result = execSync('git rev-parse HEAD', { encoding: 'utf8' });
      return result.trim();
    } catch {
      return 'unknown'; // Fallback
    }
  }

  async getAuthor(): Promise<{ name: string; email: string }> {
    try {
      const name = execSync('git config user.name', {
        encoding: 'utf8',
      }).trim();
      const email = execSync('git config user.email', {
        encoding: 'utf8',
      }).trim();
      return { name, email };
    } catch {
      return { name: 'Unknown', email: 'unknown@example.com' }; // Fallback
    }
  }

  async branchExists(branchName: string): Promise<boolean> {
    try {
      execSync(`git show-ref --verify --quiet refs/heads/${branchName}`, {
        encoding: 'utf8',
        stdio: 'ignore',
      });
      return true;
    } catch {
      return false;
    }
  }

  async getBranchStatus(branchName: string): Promise<{
    exists: boolean;
    isClean: boolean;
    hasUncommittedChanges: boolean;
  }> {
    const exists = await this.branchExists(branchName);
    if (!exists) {
      return { exists: false, isClean: false, hasUncommittedChanges: false };
    }

    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      const hasUncommittedChanges = status.trim().length > 0;

      return {
        exists: true,
        isClean: !hasUncommittedChanges,
        hasUncommittedChanges,
      };
    } catch {
      return { exists: true, isClean: false, hasUncommittedChanges: true };
    }
  }

  async getRepositoryStatus(): Promise<{
    isClean: boolean;
    hasUncommittedChanges: boolean;
    hasUntrackedFiles: boolean;
  }> {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      const lines = status
        .trim()
        .split('\n')
        .filter((line) => line.length > 0);

      const hasUncommittedChanges = lines.some(
        (line) =>
          line.startsWith('M ') ||
          line.startsWith('A ') ||
          line.startsWith('D '),
      );
      const hasUntrackedFiles = lines.some((line) => line.startsWith('??'));
      const isClean = lines.length === 0;

      return {
        isClean,
        hasUncommittedChanges,
        hasUntrackedFiles,
      };
    } catch {
      return {
        isClean: false,
        hasUncommittedChanges: true,
        hasUntrackedFiles: true,
      };
    }
  }
}
