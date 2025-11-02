/**
 * Branch management type definitions
 */

import type { ArtifactType, TArtifactEvent } from '@kodebase/core';
import type { TBranchProtection, TMergeStrategy } from './constants';

/**
 * Branch validation result
 */
export interface BranchValidationResult {
  /** Whether branch name is valid */
  valid: boolean;
  /** Validation error if invalid */
  error?: string;
  /** Extracted artifact ID if valid */
  artifactId?: string;
  /** Artifact type (initiative, milestone, issue, nested_artifact) */
  artifactType?: ArtifactType | 'nested_artifact';
  /** Suggested correction for invalid branch names */
  suggestion?: string;
}

/**
 * Branch creation options
 */
export interface BranchCreateOptions {
  /** Artifact ID for the branch */
  artifactId: string;
  /** Base branch to create from (default: main) */
  baseBranch?: string;
  /** Whether to checkout after creation */
  checkout?: boolean;
  /** Whether to push to remote */
  push?: boolean;
  /** Whether to set up tracking */
  track?: boolean;
  /** Optional artifact status to validate against */
  artifactStatus?: TArtifactEvent;
}

/**
 * Branch information
 */
export interface BranchInfo {
  /** Branch name */
  name: string;
  /** Whether branch exists locally */
  existsLocal: boolean;
  /** Whether branch exists on remote */
  existsRemote: boolean;
  /** Current commit SHA */
  commitSha?: string;
  /** Artifact ID if applicable */
  artifactId?: string;
  /** Whether branch is protected */
  isProtected: boolean;
  /** Protection level */
  protectionLevel: TBranchProtection;
}

/**
 * Branch cleanup options
 */
export interface BranchCleanupOptions {
  /** Whether to delete local branches */
  deleteLocal?: boolean;
  /** Whether to delete remote branches */
  deleteRemote?: boolean;
  /** Whether to force deletion */
  force?: boolean;
  /** Branches to exclude from cleanup */
  exclude?: string[];
  /** Only clean branches merged to target */
  mergedOnly?: boolean;
  /** Target branch for merged check */
  targetBranch?: string;
}

/**
 * Branch cleanup result
 */
export interface BranchCleanupResult {
  /** Branches that were deleted */
  deleted: string[];
  /** Branches that were skipped */
  skipped: string[];
  /** Errors encountered */
  errors: Array<{
    branch: string;
    error: string;
  }>;
}

/**
 * Branch protection rules
 */
export interface BranchProtectionRules {
  /** Protection level */
  level: TBranchProtection;
  /** Required status checks */
  requiredStatusChecks?: string[];
  /** Require PR reviews */
  requireReviews?: boolean;
  /** Number of required approvals */
  requiredApprovals?: number;
  /** Dismiss stale reviews */
  dismissStaleReviews?: boolean;
  /** Require up-to-date branches */
  requireUpToDate?: boolean;
  /** Restrict who can push */
  restrictPush?: boolean;
  /** Allow force pushes */
  allowForcePush?: boolean;
  /** Allow deletions */
  allowDeletions?: boolean;
}

/**
 * Branch merge options
 */
export interface BranchMergeOptions {
  /** Source branch to merge */
  sourceBranch: string;
  /** Target branch (default: main) */
  targetBranch?: string;
  /** Merge strategy */
  strategy: TMergeStrategy;
  /** Commit message */
  message?: string;
  /** Whether to delete branch after merge */
  deleteBranch?: boolean;
  /** Whether to push after merge */
  push?: boolean;
}
