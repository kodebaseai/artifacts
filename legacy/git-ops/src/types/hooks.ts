/**
 * Git hook type definitions
 */

import type { TGitHook, THookExitCode } from './constants';

/**
 * Hook execution context
 */
export interface HookContext {
  /** Type of hook being executed */
  hookType: TGitHook;
  /** Git repository path */
  repoPath: string;
  /** Hook arguments passed by Git */
  args: string[];
  /** Environment variables */
  env: Record<string, string | undefined>;
  /** Current working directory */
  cwd: string;
}

/**
 * Hook execution result
 */
export interface HookResult {
  /** Exit code for the hook */
  exitCode: THookExitCode;
  /** Message to display to user */
  message?: string;
  /** Additional data for processing */
  data?: Record<string, unknown>;
  /** Whether to continue with Git operation */
  continue: boolean;
}

/**
 * Post-checkout hook context
 */
export interface PostCheckoutContext extends HookContext {
  /** Previous HEAD commit */
  previousHead: string;
  /** New HEAD commit */
  newHead: string;
  /** Whether this is a branch checkout (1) or file checkout (0) */
  isBranchCheckout: boolean;
}

/**
 * Pre-commit hook context
 */
export interface PreCommitContext extends HookContext {
  /** Staged files */
  stagedFiles: string[];
  /** Commit message file path */
  commitMessagePath?: string;
}

/**
 * Pre-push hook context
 */
export interface PrePushContext extends HookContext {
  /** Remote name */
  remoteName: string;
  /** Remote URL */
  remoteUrl: string;
  /** Refs being pushed */
  refs: PushRef[];
}

/**
 * Push reference information
 */
export interface PushRef {
  /** Local ref name */
  localRef: string;
  /** Local commit SHA */
  localSha: string;
  /** Remote ref name */
  remoteRef: string;
  /** Remote commit SHA */
  remoteSha: string;
}

/**
 * Post-merge hook context
 */
export interface PostMergeContext extends HookContext {
  /** Whether this was a squash merge */
  isSquash: boolean;
  /** Merged branch name */
  mergedBranch?: string;
  /** Merge commit SHA */
  mergeCommit: string;
}

/**
 * Hook handler function type
 */
export type HookHandler<T extends HookContext = HookContext> = (
  context: T,
) => Promise<HookResult> | HookResult;

/**
 * Hook configuration
 */
export interface HookConfig {
  /** Whether hook is enabled */
  enabled: boolean;
  /** Hook-specific configuration */
  options?: Record<string, unknown>;
  /** Custom handler override */
  handler?: HookHandler;
}

/**
 * All hooks configuration
 */
export interface HooksConfig {
  postCheckout?: HookConfig;
  preCommit?: HookConfig;
  prePush?: HookConfig;
  postMerge?: HookConfig;
}

/**
 * Hook installation options
 */
export interface HookInstallOptions {
  /** Target directory for hooks */
  targetDir: string;
  /** Whether to overwrite existing hooks */
  overwrite: boolean;
  /** Hooks to install (defaults to all) */
  hooks?: TGitHook[];
  /** Whether to backup existing hooks */
  backup: boolean;
  /** Custom hook template directory */
  templateDir?: string;
}
