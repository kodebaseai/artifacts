/**
 * Git automation type definitions
 */

import type { ArtifactType, TArtifactEvent } from '@kodebase/core';
import type {
  TGitPlatform,
  THookName,
  TMergeMethod,
  TPRState,
  TReviewStatus,
} from './constants';

/**
 * PR creation options
 */
export interface PRCreateOptions {
  /** Branch name for the PR */
  branch?: string;
  /** PR title */
  title: string;
  /** PR body/description */
  body?: string;
  /** Whether to create as draft */
  draft?: boolean;
  /** Repository path */
  repoPath: string;
  /** Base branch (default: main) */
  baseBranch?: string;
  /** Labels to add */
  labels?: string[];
  /** Assignees */
  assignees?: string[];
  /** Reviewers */
  reviewers?: string[];
  /** Milestone */
  milestone?: string;
}

/**
 * PR update options
 */
export interface PRUpdateOptions {
  /** PR number */
  prNumber: number;
  /** New title */
  title?: string;
  /** New body */
  body?: string;
  /** Mark as ready for review */
  ready?: boolean;
  /** New state */
  state?: TPRState;
  /** Repository path */
  repoPath: string;
  /** Labels to add */
  addLabels?: string[];
  /** Labels to remove */
  removeLabels?: string[];
  /** Assignees to add */
  addAssignees?: string[];
  /** Reviewers to add */
  addReviewers?: string[];
}

/**
 * PR list options
 */
export interface PRListOptions {
  /** Filter by branch */
  branch?: string;
  /** Filter by state */
  state?: 'open' | 'closed' | 'merged' | 'all';
}

/**
 * PR information
 */
export interface PRInfo {
  /** PR number */
  number: number;
  /** PR state */
  state: string;
  /** PR title */
  title: string;
  /** PR body */
  body?: string;
  /** PR URL */
  url?: string;
  /** Source branch */
  sourceBranch?: string;
  /** Target branch */
  targetBranch?: string;
  /** Author */
  author?: string;
  /** Created date */
  createdAt?: Date;
  /** Updated date */
  updatedAt?: Date;
  /** Whether PR is draft */
  isDraft?: boolean;
  /** Labels */
  labels?: string[];
  /** Assignees */
  assignees?: string[];
  /** Reviewers */
  reviewers?: string[];
  /** Review status */
  reviewStatus?: TReviewStatus;
  /** Number of approvals */
  approvals?: number;
  /** Merge status */
  mergeable?: boolean;
  /** Merge conflicts */
  hasConflicts?: boolean;
}

/**
 * Status transition request
 */
export interface StatusTransition {
  /** Artifact ID */
  artifactId: string;
  /** New status */
  newStatus: TArtifactEvent;
  /** Actor performing transition */
  actor: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Correlation ID for tracking */
  correlationId?: string;
}

/**
 * Status update result
 */
export interface StatusUpdateResult {
  /** Whether update succeeded */
  success: boolean;
  /** Previous status */
  previousStatus: TArtifactEvent;
  /** New status */
  newStatus: TArtifactEvent;
  /** Cascade effects triggered */
  cascadeEffects?: CascadeEffect[];
  /** Error if failed */
  error?: string;
}

/**
 * Cascade effect information
 */
export interface CascadeEffect {
  /** Affected artifact ID */
  artifactId: string;
  /** Artifact type */
  artifactType: ArtifactType;
  /** Previous status */
  previousStatus: TArtifactEvent;
  /** New status */
  newStatus: TArtifactEvent;
  /** Trigger that caused cascade */
  trigger: string;
  /** Parent event ID */
  parentEventId?: string;
}

/**
 * Git platform adapter interface
 */
export interface GitPlatformAdapter {
  /** Platform type */
  platform: TGitPlatform;

  /** Create a pull request */
  createPR(options: PRCreateOptions): Promise<PRInfo>;

  /** Update a pull request */
  updatePR(options: PRUpdateOptions): Promise<PRInfo>;

  /** Get PR information */
  getPR(prIdentifier: string | number): Promise<PRInfo | null>;

  /** Merge a pull request */
  mergePR(
    prNumber: number,
    options?: {
      method?: TMergeMethod;
      message?: string;
      deleteBranch?: boolean;
    },
  ): Promise<void>;

  /** Check if platform is available */
  isAvailable(): Promise<boolean>;
}

/**
 * Automation configuration
 */
export interface AutomationConfig {
  /** Git platform to use */
  platform?: TGitPlatform;
  /** Repository path */
  repoPath?: string;
  /** Remote name */
  remoteName?: string;
  /** API token for platform */
  apiToken?: string;
  /** Whether to auto-create PRs */
  autoCreatePR?: boolean;
  /** Whether to auto-update status */
  autoUpdateStatus?: boolean;
  /** Custom platform adapter */
  platformAdapter?: GitPlatformAdapter;
}

/**
 * Options for installing hooks
 */
export interface InstallOptions {
  /** Repository path */
  repoPath: string;
  /** Specific hooks to install (defaults to all) */
  hooks?: THookName[];
}

/**
 * Result of hook installation
 */
export interface InstallResult {
  /** Whether installation succeeded */
  success: boolean;
  /** Hooks that were installed */
  installed: THookName[];
  /** Hooks that were skipped */
  skipped: THookName[];
  /** Backup files created */
  backups: string[];
  /** Warning messages */
  warnings: string[];
  /** Error message if failed */
  error?: string;
}

/**
 * Options for uninstalling hooks
 */
export interface UninstallOptions {
  /** Repository path */
  repoPath: string;
  /** Specific hooks to uninstall (defaults to all) */
  hooks?: THookName[];
  /** Whether to restore backups */
  restoreBackups?: boolean;
}

/**
 * Result of hook uninstallation
 */
export interface UninstallResult {
  /** Whether uninstallation succeeded */
  success: boolean;
  /** Hooks that were uninstalled */
  uninstalled: THookName[];
  /** Hooks that were skipped */
  skipped: THookName[];
  /** Hooks that were restored from backup */
  restored: THookName[];
  /** Hooks that were not found */
  notFound: THookName[];
  /** Warning messages */
  warnings: string[];
  /** Error message if failed */
  error?: string;
}

/**
 * Status of a hook
 */
export interface HookStatus {
  /** Hook name */
  name: THookName;
  /** Whether the hook is installed */
  installed: boolean;
  /** Whether it's a kodebase-managed hook */
  isKodebase: boolean;
  /** Path to the hook file */
  path: string;
}
