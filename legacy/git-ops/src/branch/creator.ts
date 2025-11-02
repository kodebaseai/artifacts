/**
 * Branch creation utilities
 */

import type { SimpleGit } from 'simple-git';
import type { BranchCreateOptions, BranchInfo } from '../types';
import { BranchValidator } from './validator';

/**
 * Creates and manages git branches following Kodebase conventions
 */
export class BranchCreator {
  private validator: BranchValidator;

  constructor(private git: SimpleGit) {
    this.validator = new BranchValidator();
  }

  /**
   * Create a new branch for an artifact
   */
  async create(options: BranchCreateOptions): Promise<BranchInfo> {
    const {
      artifactId,
      baseBranch = 'main',
      checkout = true,
      push = false,
      track = false,
      artifactStatus,
    } = options;

    // Validate artifact ID
    const validation = this.validator.validate(artifactId);
    if (!validation.valid) {
      throw new Error(`Invalid artifact ID: ${validation.error}`);
    }

    // Check artifact status if provided
    if (artifactStatus) {
      if (artifactStatus === 'completed' || artifactStatus === 'archived') {
        throw new Error(
          `Cannot create branch for ${artifactStatus} artifact ${artifactId}`,
        );
      }
    }

    // Check if we're in a git repository
    const isRepo = await this.git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Not in a git repository');
    }

    // Check if branch already exists
    const exists = await this.exists(artifactId);
    if (exists) {
      throw new Error(`Branch ${artifactId} already exists`);
    }

    // Create the branch
    if (checkout) {
      // Create and checkout in one command
      await this.git.checkout(['-b', artifactId, baseBranch]);
    } else {
      // Create branch without checking out
      await this.git.branch([artifactId, baseBranch]);
    }

    // Push to remote if requested
    if (push) {
      if (track) {
        await this.git.push(['--set-upstream', 'origin', artifactId]);
      } else {
        await this.git.push(['origin', artifactId]);
      }
    }

    // Get branch info
    const commitSha = await this.git.revparse(['HEAD']);

    return {
      name: artifactId,
      existsLocal: true,
      existsRemote: push,
      commitSha: commitSha.trim(),
      artifactId,
      isProtected: false,
      protectionLevel: 'none',
    };
  }

  /**
   * Check if a branch exists locally
   */
  async exists(branchName: string): Promise<boolean> {
    try {
      const branches = await this.git.branch();
      return branches.all.includes(branchName);
    } catch {
      return false;
    }
  }

  /**
   * Get information about a branch
   */
  async getBranchInfo(branchName: string): Promise<BranchInfo | null> {
    try {
      const branches = await this.git.branch(['-a']);
      const existsLocal = branches.all.includes(branchName);
      const existsRemote = branches.all.includes(
        `remotes/origin/${branchName}`,
      );

      if (!existsLocal && !existsRemote) {
        return null;
      }

      const validation = this.validator.validate(branchName);
      const commitSha = existsLocal
        ? await this.git.revparse([branchName])
        : undefined;

      return {
        name: branchName,
        existsLocal,
        existsRemote,
        commitSha: commitSha?.trim(),
        artifactId: validation.valid ? validation.artifactId : undefined,
        isProtected: branchName === 'main' || branchName === 'master',
        protectionLevel:
          branchName === 'main' || branchName === 'master' ? 'strict' : 'none',
      };
    } catch {
      return null;
    }
  }
}
