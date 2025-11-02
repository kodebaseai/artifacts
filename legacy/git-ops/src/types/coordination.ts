import type { TArtifactEvent } from '@kodebase/core';

/**
 * Context information about Git operations
 */
export interface GitContext {
  operation: string;
  branch?: string;
  commit?: string;
  author?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result of workflow coordination operations
 */
export interface CoordinationResult {
  success: boolean;
  artifactState: TArtifactEvent;
  gitState: string;
  synchronized: boolean;
  conflictResolved?: {
    type: string;
    resolution: string;
    action: string;
  };
  error?: string;
}

/**
 * Represents a synchronization conflict between Git and artifact states
 */
export interface SyncConflict {
  type: 'state_mismatch' | 'git_artifact_inconsistency';
  artifactState: TArtifactEvent;
  expectedState: TArtifactEvent;
  gitContext: GitContext;
  severity: 'error' | 'warning';
}

/**
 * Configuration for rollback operations
 */
export interface RollbackConfig {
  maxRetries: number;
  retryDelay: number;
  preserveGitState: boolean;
  preserveArtifactState: boolean;
}

/**
 * Result of a rollback operation
 */
export interface RollbackResult {
  success: boolean;
  restoredState: TArtifactEvent;
  gitStateRestored: boolean;
  artifactStateRestored: boolean;
  error?: string;
}

/**
 * Team collaboration context
 */
export interface TeamContext {
  collaborators: string[];
  currentUser: string;
  concurrentOperations: GitContext[];
  lockStatus?: {
    locked: boolean;
    lockedBy?: string;
    lockReason?: string;
  };
}

/**
 * Performance metrics for coordination operations
 */
export interface PerformanceMetrics {
  operationTime: number;
  gitOperationTime: number;
  artifactOperationTime: number;
  conflictResolutionTime: number;
  impactOnNormalOperations: number;
}
