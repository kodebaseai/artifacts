import type { TArtifactEvent } from '@kodebase/core';
import type { ArtifactLoader } from '../hooks/artifact-loader';
import type { CoordinationResult, TeamContext } from '../types/coordination';
import { SimpleGitClient } from '../types/git-client';
import { ComplexOperationsHandler } from './complex-operations';
import { PerformanceMonitor } from './performance-monitor';
import { RollbackManager } from './rollback-manager';
import { TeamCollaborationManager } from './team-collaboration';
import { WorkflowCoordinator } from './workflow-coordinator';

/**
 * Main integration point for workflow coordination between Git and artifact states.
 * Provides unified interface for all coordination operations.
 */
export class WorkflowIntegration {
  private workflowCoordinator: WorkflowCoordinator;
  private rollbackManager: RollbackManager;
  private teamCollaborationManager: TeamCollaborationManager;
  private complexOperationsHandler: ComplexOperationsHandler;
  private performanceMonitor: PerformanceMonitor;

  constructor(
    private artifactLoader: ArtifactLoader,
    private gitClient: SimpleGitClient = new SimpleGitClient(),
  ) {
    this.workflowCoordinator = new WorkflowCoordinator(
      this.artifactLoader,
      this.gitClient,
    );
    this.rollbackManager = new RollbackManager(
      this.artifactLoader,
      this.gitClient,
    );
    this.teamCollaborationManager = new TeamCollaborationManager(
      this.artifactLoader,
      this.gitClient,
    );
    this.complexOperationsHandler = new ComplexOperationsHandler(
      this.artifactLoader,
      this.gitClient,
      this.workflowCoordinator,
    );
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Main coordination method that handles all aspects of workflow coordination
   */
  async coordinateWorkflow(
    artifactId: string,
    operation: 'checkout' | 'commit' | 'push' | 'merge' | 'rebase',
    teamContext?: TeamContext,
  ): Promise<CoordinationResult> {
    const operationId = `${artifactId}_${operation}_${Date.now()}`;
    this.performanceMonitor.startOperation(operationId);

    try {
      // Get Git context
      const gitContext = await this.gitClient.getContext();
      gitContext.operation = operation;

      // Handle team collaboration if context provided
      if (teamContext) {
        const teamResult =
          await this.teamCollaborationManager.coordinateTeamWork(
            artifactId,
            gitContext,
            teamContext,
          );

        if (!teamResult.success) {
          return teamResult;
        }
      }

      // Handle complex operations
      let result: CoordinationResult;
      switch (operation) {
        case 'rebase':
          result = await this.complexOperationsHandler.handleRebase(
            artifactId,
            'main', // Default target branch
            gitContext,
          );
          break;
        case 'merge':
          result = await this.complexOperationsHandler.handleMerge(
            artifactId,
            gitContext.branch || artifactId,
            'main',
            gitContext,
          );
          break;
        default:
          // Standard synchronization
          result = await this.workflowCoordinator.synchronizeStates(
            artifactId,
            this.getExpectedStateForOperation(operation),
            gitContext,
          );
          break;
      }

      // Record performance metrics
      const metrics = this.performanceMonitor.endOperation(
        operationId,
        50, // Placeholder git operation time
        30, // Placeholder artifact operation time
        result.conflictResolved ? 20 : 0,
      );

      // Add performance info to result
      result.performanceMetrics = metrics;

      return result;
    } catch (error) {
      // Attempt rollback if operation failed
      if (error instanceof Error) {
        await this.attemptRollback(artifactId, operation, error);
      }
      throw error;
    }
  }

  /**
   * Handles recovery procedures for divergent states
   */
  async recoverFromDivergentStates(
    artifactId: string,
    targetState: TArtifactEvent,
  ): Promise<CoordinationResult> {
    const operationId = `${artifactId}_recovery_${Date.now()}`;
    this.performanceMonitor.startOperation(operationId);
    // Check if rollback is possible
    const gitContext = await this.gitClient.getContext();
    const canRollback = await this.rollbackManager.canRollback(
      artifactId,
      targetState,
      gitContext,
    );

    if (!canRollback) {
      return {
        success: false,
        artifactState: 'draft',
        gitState: gitContext.operation,
        synchronized: false,
        error: 'Recovery not possible - manual intervention required',
      };
    }

    // Perform rollback
    const rollbackResult = await this.rollbackManager.rollback(
      artifactId,
      targetState,
      gitContext,
    );

    // Only proceed with synchronization if rollback was successful
    if (!rollbackResult.success) {
      return {
        success: false,
        artifactState: targetState,
        gitState: gitContext.operation,
        synchronized: false,
        error: rollbackResult.error || 'Rollback failed during recovery',
      };
    }

    // Re-synchronize states
    const syncResult = await this.workflowCoordinator.synchronizeStates(
      artifactId,
      targetState,
      gitContext,
    );

    const metrics = this.performanceMonitor.endOperation(
      operationId,
      40, // Placeholder git operation time
      60, // Placeholder artifact operation time (higher for recovery)
      100, // Placeholder conflict resolution time (higher for recovery)
    );

    return {
      success: syncResult.success,
      artifactState: targetState,
      gitState: gitContext.operation,
      synchronized: syncResult.synchronized,
      conflictResolved: {
        type: 'divergent_state_recovery',
        resolution: 'rollback_and_resync',
        action: `Recovered from divergent state using rollback to ${targetState}`,
      },
      performanceMetrics: metrics,
    };
  }

  /**
   * Gets performance report for all operations
   */
  getPerformanceReport(): string {
    return this.performanceMonitor.generateReport();
  }

  /**
   * Validates that performance impact is minimal
   */
  isPerformanceAcceptable(operationId: string): boolean {
    return this.performanceMonitor.isPerformanceAcceptable(operationId);
  }

  /**
   * Gets expected artifact state for Git operations
   */
  private getExpectedStateForOperation(operation: string): TArtifactEvent {
    const stateMap: Record<string, TArtifactEvent> = {
      checkout: 'in_progress',
      commit: 'in_progress',
      push: 'in_review',
      merge: 'completed',
      rebase: 'in_progress',
    };

    return stateMap[operation] || 'draft';
  }

  /**
   * Attempts rollback on operation failure
   */
  private async attemptRollback(
    artifactId: string,
    operation: string,
    _error: Error,
  ): Promise<void> {
    try {
      const gitContext = await this.gitClient.getContext();
      const previousState = this.getPreviousStateForOperation(operation);
      _error;
      await this.rollbackManager.rollback(
        artifactId,
        previousState,
        gitContext,
        { maxRetries: 1 },
      );
    } catch (rollbackError) {
      // Log rollback failure but don't throw - original error is more important
      console.error('Rollback failed:', rollbackError);
    }
  }

  /**
   * Gets previous state for rollback purposes
   */
  private getPreviousStateForOperation(operation: string): TArtifactEvent {
    const rollbackMap: Record<string, TArtifactEvent> = {
      checkout: 'ready',
      commit: 'in_progress',
      push: 'in_progress',
      merge: 'in_review',
      rebase: 'in_progress',
    };

    return rollbackMap[operation] || 'draft';
  }
}

// Add performance metrics to coordination result type
declare module '../types/coordination' {
  interface CoordinationResult {
    performanceMetrics?: PerformanceMetrics;
  }
}
