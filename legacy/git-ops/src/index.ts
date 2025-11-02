/**
 * @kodebase/git-ops
 *
 * Git operations and hook implementations for the Kodebase methodology.
 */

export { PRManager, PRSync } from './automation';
export {
  assignReviewers,
  loadReviewerRules,
  type ReviewerAssignmentOptions,
  type ReviewerRuleConfig,
} from './automation/reviewer-assignment';
export {
  buildPrBody,
  buildPrTitle,
  createValidationChecks,
  deriveArtifactCategory,
  type ArtifactTemplateContext,
  type ArtifactCategory,
  type ValidationCheck,
  type DependencyImpact,
} from './automation/pr-template';
// Branch operations
export { BranchCleaner, BranchCreator, BranchValidator } from './branch';
// CLI Bridge
export { CLIBridge, type CLIBridgeConfig } from './cli-bridge';
// Workflow Coordination
export {
  ComplexOperationsHandler,
  PerformanceMonitor,
  RollbackManager,
  TeamCollaborationManager,
  WorkflowCoordinator,
  WorkflowIntegration,
} from './coordination';
// Artifact utilities
export { ArtifactLoader } from './hooks/artifact-loader';
// Error handling system
export {
  ARTIFACT_CORRUPTED,
  ARTIFACT_NOT_FOUND,
  type DebugInfo,
  // Error catalog
  ERROR_CATALOG,
  type ErrorAction,
  type ErrorCategory,
  type ErrorCode,
  type ErrorFormatOptions,
  ErrorFormatter,
  // Error types
  type ErrorSeverity,
  type ErrorType,
  errorFormatter,
  type FormattedError,
  formatError,
  GIT_CONFIG_MISSING,
  GITHUB_AUTH_REQUIRED,
  // Common errors
  GITHUB_CLI_NOT_INSTALLED,
  getErrorByCode,
  getErrorsByCategory,
  HOOKS_PERMISSION_DENIED,
  INVALID_ARTIFACT_ID,
  INVALID_STATE_TRANSITION,
  NETWORK_TIMEOUT,
  NOT_GIT_REPOSITORY,
  type StructuredError,
  shouldContinueAfterError,
} from './error-handling';
// Hooks
export { PostCheckoutHook } from './hooks/post-checkout';
export { PostMergeHook } from './hooks/post-merge';
export { PreCommitHook } from './hooks/pre-commit';
export { PrePushHook } from './hooks/pre-push';
// Installation and automation
export { HookInstaller } from './installer';
// Types
export type * from './types';
