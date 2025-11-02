/**
 * @kodebase/git-ops type definitions
 *
 * This module exports all type definitions for git operations,
 * hooks, branch management, and automation.
 */

// Export automation types
export type {
  AutomationConfig,
  CascadeEffect,
  GitPlatformAdapter,
  HookStatus,
  InstallOptions,
  InstallResult,
  PRCreateOptions,
  PRInfo,
  PRListOptions,
  PRUpdateOptions,
  StatusTransition,
  StatusUpdateResult,
  UninstallOptions,
  UninstallResult,
} from './automation';
// Export branch types
export type {
  BranchCleanupOptions,
  BranchCleanupResult,
  BranchCreateOptions,
  BranchInfo,
  BranchMergeOptions,
  BranchProtectionRules,
  BranchValidationResult,
} from './branch';
// Export all constants and type aliases
export * from './constants';
// Export hook types
export type {
  HookConfig,
  HookContext,
  HookHandler,
  HookInstallOptions,
  HookResult,
  HooksConfig,
  PostCheckoutContext,
  PostMergeContext,
  PreCommitContext,
  PrePushContext,
  PushRef,
} from './hooks';
