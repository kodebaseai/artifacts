/**
 * Git operations constants
 * @description Constants for git hooks, branch patterns, and automation
 */

/**
 * Git hook types
 */
export const CGitHook = {
  POST_CHECKOUT: 'post-checkout',
  PRE_COMMIT: 'pre-commit',
  PRE_PUSH: 'pre-push',
  POST_MERGE: 'post-merge',
  POST_RECEIVE: 'post-receive',
  PRE_RECEIVE: 'pre-receive',
} as const;
export const GIT_HOOKS = Object.values(CGitHook);

/**
 * Supported hook names for installation
 */
export const CHookName = {
  POST_CHECKOUT: 'post-checkout',
  PRE_COMMIT: 'pre-commit',
  PRE_PUSH: 'pre-push',
  POST_MERGE: 'post-merge',
} as const;
export const GIT_HOOKS_INSTALLABLE = Object.values(CHookName);

/**
 * Git hook exit codes
 */
export const CHookExitCode = {
  SUCCESS: 0,
  ERROR: 1,
  SKIP: 2,
} as const;
export const GIT_HOOK_EXIT_CODES = Object.values(CHookExitCode);

/**
 * Branch protection levels
 */
export const CBranchProtection = {
  NONE: 'none',
  BASIC: 'basic',
  STRICT: 'strict',
} as const;
export const GIT_BRANCH_PROTECTION_LEVELS = Object.values(CBranchProtection);

/**
 * PR states
 */
export const CPRState = {
  DRAFT: 'draft',
  READY: 'ready',
  REVIEW: 'review',
  APPROVED: 'approved',
  MERGED: 'merged',
  CLOSED: 'closed',
} as const;
export const GIT_PR_STATES = Object.values(CPRState);

/**
 * Commit message types (Conventional Commits)
 */
export const CCommitType = {
  FEAT: 'feat',
  FIX: 'fix',
  DOCS: 'docs',
  STYLE: 'style',
  REFACTOR: 'refactor',
  PERF: 'perf',
  TEST: 'test',
  BUILD: 'build',
  CI: 'ci',
  CHORE: 'chore',
  REVERT: 'revert',
} as const;
export const GIT_COMMIT_TYPES = Object.values(CCommitType);

/**
 * Git platforms
 */
export const CGitPlatform = {
  GITHUB: 'github',
  GITLAB: 'gitlab',
  BITBUCKET: 'bitbucket',
  LOCAL: 'local',
} as const;
export const GIT_PLATFORMS = Object.values(CGitPlatform);

/**
 * Merge strategies
 */
export const CMergeStrategy = {
  SQUASH: 'squash',
  MERGE: 'merge',
  REBASE: 'rebase',
  CHERRY_PICK: 'cherry-pick',
} as const;
export const GIT_MERGE_STRATEGIES = Object.values(CMergeStrategy);

/**
 * PR review status
 */
export const CReviewStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  CHANGES_REQUESTED: 'changes_requested',
} as const;
export const PR_REVIEW_STATUSES = Object.values(CReviewStatus);

/**
 * PR merge methods (subset of merge strategies)
 */
export const CMergeMethod = {
  MERGE: 'merge',
  SQUASH: 'squash',
  REBASE: 'rebase',
} as const;
export const PR_MERGE_METHODS = Object.values(CMergeMethod);

// Type aliases
export type TGitHook = (typeof CGitHook)[keyof typeof CGitHook];
export type THookExitCode = (typeof CHookExitCode)[keyof typeof CHookExitCode];
export type TBranchProtection =
  (typeof CBranchProtection)[keyof typeof CBranchProtection];
export type TPRState = (typeof CPRState)[keyof typeof CPRState];
export type TCommitType = (typeof CCommitType)[keyof typeof CCommitType];
export type TGitPlatform = (typeof CGitPlatform)[keyof typeof CGitPlatform];
export type TMergeStrategy =
  (typeof CMergeStrategy)[keyof typeof CMergeStrategy];
export type TReviewStatus = (typeof CReviewStatus)[keyof typeof CReviewStatus];
export type TMergeMethod = (typeof CMergeMethod)[keyof typeof CMergeMethod];
export type THookName = (typeof CHookName)[keyof typeof CHookName];
