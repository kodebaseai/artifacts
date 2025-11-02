export { WorkflowCoordinator } from './workflow-coordinator';
export { RollbackManager } from './rollback-manager';
export { TeamCollaborationManager } from './team-collaboration';
export { ComplexOperationsHandler } from './complex-operations';
export { PerformanceMonitor } from './performance-monitor';
export { WorkflowIntegration } from './workflow-integration';

export type {
  GitContext,
  CoordinationResult,
  SyncConflict,
  RollbackConfig,
  RollbackResult,
  TeamContext,
  PerformanceMetrics,
} from '../types/coordination';

export type { GitClient } from '../types/git-client';
export { SimpleGitClient } from '../types/git-client';

export {
  CoordinationError,
  SynchronizationError,
  ConflictResolutionError,
  RollbackError,
} from '../error-handling/coordination-errors';
