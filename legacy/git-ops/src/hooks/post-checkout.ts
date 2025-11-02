/**
 * Post-checkout hook implementation
 */

import { execSync } from 'node:child_process';
import {
  type Artifact,
  CascadeEngine,
  canTransition,
  type EventMetadata,
  performTransition,
} from '@kodebase/core';
import { BranchValidator } from '../branch';
import { CLIBridge } from '../cli-bridge';
import type { HookResult, PostCheckoutContext } from '../types';
import { CHookExitCode } from '../types';
import { ArtifactLoader } from './artifact-loader';

/**
 * Post-checkout hook that triggers in_progress status and creates draft PR
 */
export class PostCheckoutHook {
  private validator: BranchValidator;
  private artifactLoader: ArtifactLoader;
  private cliBridge: CLIBridge;
  private cascadeEngine: CascadeEngine;

  constructor() {
    this.validator = new BranchValidator();
    this.artifactLoader = new ArtifactLoader();
    this.cliBridge = new CLIBridge();
    this.cascadeEngine = new CascadeEngine();
  }

  /**
   * Determine if the hook should run
   */
  async shouldRun(context: PostCheckoutContext): Promise<boolean> {
    // Only run for branch checkouts, not file checkouts
    if (!context.isBranchCheckout) {
      return false;
    }

    // Skip if we're not actually changing branches
    if (context.previousHead === context.newHead) {
      return false;
    }

    return true;
  }

  /**
   * Run the post-checkout hook
   */
  async run(context: PostCheckoutContext): Promise<HookResult> {
    try {
      // Get current branch name with graceful degradation
      const branchName = await this.getBranchNameSafely(context.repoPath);

      // Handle special git states gracefully
      if (!branchName || branchName === '' || branchName.includes('(')) {
        return {
          exitCode: CHookExitCode.SUCCESS,
          message: `Skipping hook: not on a regular branch (detached HEAD, bisect, or rebase mode)`,
          continue: true,
        };
      }

      // Check if it's an artifact branch
      if (!this.isArtifactBranch(branchName)) {
        return {
          exitCode: CHookExitCode.SUCCESS,
          message: `Not an artifact branch: ${branchName}`,
          continue: true,
        };
      }

      let eventAdded = false;
      let prCreated = false;
      const warnings: string[] = [];

      // Try to add in_progress event using @kodebase/core with retries
      let eventId: string | undefined;
      try {
        eventId = await this.performStateTransitionWithRetry(
          branchName,
          'in_progress',
          context.repoPath,
        );
        eventAdded = true;
      } catch (error) {
        const errorMessage = this.categorizeError(error);
        console.error('Failed to add in_progress event:', errorMessage);
        warnings.push(`Event update failed: ${errorMessage}`);
      }

      // Try cascade operations if event was added successfully
      if (eventAdded && eventId) {
        try {
          await this.performCascadeOperations(
            branchName,
            context.repoPath,
            eventId,
          );
        } catch (error) {
          const errorMessage = this.categorizeError(error);
          console.error('Failed to perform cascade operations:', errorMessage);
          warnings.push(`Cascade operations failed: ${errorMessage}`);
        }
      }

      // Try to create draft PR with enhanced error handling
      try {
        const pr = await this.createDraftPRWithRetry(branchName);
        prCreated = true;
        console.log(`Draft PR created: ${pr.url}`);
      } catch (error) {
        const errorMessage = this.categorizeNetworkError(error);
        console.error('Failed to create draft PR:', errorMessage);
        warnings.push(`PR creation failed: ${errorMessage}`);
      }

      // Build result message with actionable guidance
      const messages = [];
      if (eventAdded) {
        messages.push('in_progress event added');
      }
      if (prCreated) {
        messages.push('draft PR created');
      }

      // Add helpful guidance if both operations failed
      if (!eventAdded && !prCreated) {
        messages.push('hook completed with limited functionality');
        warnings.push('Consider running: git status, gh auth status');
      }

      const result = {
        exitCode: CHookExitCode.SUCCESS,
        message: `Post-checkout hook completed for ${branchName}: ${messages.join(', ')}`,
        continue: true,
      };

      // Log warnings for debugging but don't fail the hook
      if (warnings.length > 0) {
        console.warn('Post-checkout warnings:', warnings.join('; '));
      }

      return result;
    } catch (error) {
      console.error('Post-checkout hook error:', error);

      // Provide actionable error messages
      const actionableMessage = this.getActionableErrorMessage(error);

      return {
        exitCode: CHookExitCode.SUCCESS, // Don't fail git operations due to hook errors
        message: `Post-checkout hook failed: ${actionableMessage}`,
        continue: true,
      };
    }
  }

  /**
   * Perform state transition using @kodebase/core
   */
  private async performStateTransition(
    artifactId: string,
    newState: 'in_progress',
    repoPath: string,
  ): Promise<string> {
    // Load the artifact
    const artifact = await this.artifactLoader.loadArtifact(
      artifactId,
      repoPath,
    );

    // Check if transition is valid
    if (!canTransition(artifact, newState)) {
      throw new Error(
        `Cannot transition artifact ${artifactId} to ${newState}`,
      );
    }

    // Get actor information from git config
    const actor = await this.artifactLoader.getGitActor(repoPath);

    // Store the current event count
    const eventCountBefore = artifact.metadata.events.length;

    // Perform the transition
    performTransition(artifact, newState, actor);

    // Get the newly added event (should be the last one)
    const newEventIndex = artifact.metadata.events.length - 1;
    const newEvent = artifact.metadata.events[newEventIndex];

    if (!newEvent || artifact.metadata.events.length === eventCountBefore) {
      throw new Error('Failed to add new event during transition');
    }

    // Save the artifact back to file
    await this.artifactLoader.saveArtifact(artifact, artifactId, repoPath);

    // Return a simple identifier (v2.0 schema doesn't have event_id)
    return `${newEvent.event}_${newEvent.timestamp}`;
  }

  /**
   * Get the current branch name
   */
  private async getBranchName(repoPath: string): Promise<string> {
    const result = execSync('git branch --show-current', {
      cwd: repoPath,
      encoding: 'utf-8',
    });
    return result.trim();
  }

  /**
   * Get the current branch name with error handling for edge cases
   */
  private async getBranchNameSafely(repoPath: string): Promise<string> {
    try {
      const result = execSync('git branch --show-current', {
        cwd: repoPath,
        encoding: 'utf-8',
        timeout: 5000, // 5 second timeout
      });
      return result.trim();
    } catch (error) {
      // Handle common edge cases
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          console.warn(
            'Git branch command timed out, falling back to HEAD detection',
          );
        } else if (error.message.includes('not a git repository')) {
          console.warn('Not in a git repository');
          return '';
        }
      }

      // Try alternative method for detached HEAD or other edge cases
      try {
        const result = execSync(
          'git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --short HEAD',
          {
            cwd: repoPath,
            encoding: 'utf-8',
            timeout: 3000,
          },
        );
        return result.trim();
      } catch {
        return ''; // Return empty string if all methods fail
      }
    }
  }

  /**
   * Check if branch name is an artifact ID
   */
  private isArtifactBranch(branchName: string): boolean {
    const validation = this.validator.validate(branchName);
    return validation.valid;
  }

  /**
   * Create draft PR using gh CLI
   */
  private async createDraftPR(branchName: string): Promise<{ url: string }> {
    const title = `${branchName}: Work Started`;
    const body = `Draft PR for issue ${branchName}`;

    try {
      // Use CLI bridge for better error handling and environment setup
      const result = await this.cliBridge.executeCommand('gh', [
        'pr',
        'create',
        '--draft',
        '--title',
        title,
        '--body',
        body,
      ]);

      if (!result.success) {
        throw new Error(
          `PR creation failed: ${result.stderr || result.stdout}`,
        );
      }

      // Extract URL from output
      const urlMatch = result.stdout.match(/https:\/\/[^\s]+/);
      return {
        url: urlMatch ? urlMatch[0] : 'PR created',
      };
    } catch (error) {
      // Fallback to direct execution if CLI bridge fails
      console.warn(
        'CLI bridge failed, falling back to direct execution:',
        error,
      );

      const result = execSync(
        `gh pr create --draft --title "${title}" --body "${body}"`,
        {
          encoding: 'utf-8',
        },
      );

      // Extract URL from output
      const urlMatch = result.match(/https:\/\/[^\s]+/);
      return {
        url: urlMatch ? urlMatch[0] : 'PR created',
      };
    }
  }

  /**
   * Perform state transition with retry logic for transient failures
   */
  private async performStateTransitionWithRetry(
    artifactId: string,
    newState: 'in_progress',
    repoPath: string,
    maxRetries: number = 3,
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const eventId = await this.performStateTransition(
          artifactId,
          newState,
          repoPath,
        );
        return eventId; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry certain types of errors
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }

        // Log retry attempt
        if (attempt < maxRetries) {
          console.warn(
            `State transition attempt ${attempt} failed, retrying... Error: ${lastError.message}`,
          );

          // Exponential backoff: 100ms, 200ms, 400ms
          const delay = 100 * 2 ** (attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Create draft PR with retry logic for network failures
   */
  private async createDraftPRWithRetry(
    branchName: string,
    maxRetries: number = 2,
  ): Promise<{ url: string }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.createDraftPR(branchName);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry authentication or command not found errors
        if (this.isNonRetryableNetworkError(lastError)) {
          throw lastError;
        }

        if (attempt < maxRetries) {
          console.warn(
            `PR creation attempt ${attempt} failed, retrying... Error: ${lastError.message}`,
          );

          // Linear backoff for network operations: 1s, 2s
          const delay = 1000 * attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded for PR creation');
  }

  /**
   * Categorize errors for better user guidance
   */
  private categorizeError(error: unknown): string {
    if (!(error instanceof Error)) {
      return 'Unknown error occurred';
    }

    const message = error.message.toLowerCase();

    // Permission errors
    if (message.includes('permission denied') || message.includes('eacces')) {
      return 'Permission denied - check file/directory permissions';
    }

    // Disk space errors
    if (message.includes('enospc') || message.includes('no space left')) {
      return 'Insufficient disk space - free up storage and try again';
    }

    // File lock errors
    if (message.includes('resource busy') || message.includes('file exists')) {
      return 'File in use - another process may be accessing the artifact file';
    }

    // Git configuration errors
    if (
      message.includes('git config') ||
      message.includes('user.name') ||
      message.includes('user.email')
    ) {
      return 'Git configuration missing - run: git config user.name "Your Name" && git config user.email "your@email.com"';
    }

    // Repository errors
    if (message.includes('not a git repository')) {
      return "Not in a git repository - ensure you're in the correct directory";
    }

    return error.message;
  }

  /**
   * Categorize network-specific errors
   */
  private categorizeNetworkError(error: unknown): string {
    if (!(error instanceof Error)) {
      return 'Unknown network error occurred';
    }

    const message = error.message.toLowerCase();

    // Command not found
    if (message.includes('command not found') || message.includes('enoent')) {
      return 'GitHub CLI not installed - install with: brew install gh (macOS) or visit https://cli.github.com/';
    }

    // Authentication errors
    if (
      message.includes('unauthorized') ||
      message.includes('401') ||
      message.includes('authentication')
    ) {
      return 'GitHub authentication required - run: gh auth login';
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('403')) {
      return 'GitHub API rate limit exceeded - wait and try again later';
    }

    // Network timeouts
    if (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection')
    ) {
      return 'Network connection issue - check internet connectivity';
    }

    // Repository access
    if (message.includes('not found') || message.includes('404')) {
      return 'Repository not found or access denied - check repository permissions';
    }

    return error.message;
  }

  /**
   * Determine if an error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    return (
      message.includes('permission denied') ||
      message.includes('not a git repository') ||
      message.includes('user.name') ||
      message.includes('user.email') ||
      message.includes('artifact not found') ||
      message.includes('invalid transition')
    );
  }

  /**
   * Determine if a network error should not be retried
   */
  private isNonRetryableNetworkError(error: Error): boolean {
    const message = error.message.toLowerCase();

    return (
      message.includes('command not found') ||
      message.includes('enoent') ||
      message.includes('unauthorized') ||
      message.includes('401') ||
      message.includes('authentication') ||
      message.includes('not found') ||
      message.includes('404')
    );
  }

  /**
   * Perform cascade operations for milestone and initiative transitions using CascadeEngine
   *
   * This method integrates with @kodebase/core's CascadeEngine to automatically trigger
   * parent artifact state transitions when child artifacts start. For example:
   * - Issue A.1.5 starts → Milestone A.1 may transition to in_progress
   * - Milestone A.1 starts → Initiative A may transition to in_progress
   *
   * Features proper correlation tracking between events for audit trails.
   */
  private async performCascadeOperations(
    branchName: string,
    repoPath: string,
    triggerEventId: string,
  ): Promise<void> {
    try {
      // Get actor information
      const actorString = await this.artifactLoader.getGitActor(repoPath);

      // Load issue artifact and trigger event for correlation
      const issueArtifact = await this.artifactLoader.loadArtifact(
        branchName,
        repoPath,
      );
      const triggerEvent = issueArtifact.metadata.events.find(
        (e) => `${e.event}_${e.timestamp}` === triggerEventId,
      );

      if (!triggerEvent) {
        console.warn('Could not find trigger event for cascade correlation');
        return;
      }

      // Check milestone cascade (A.1.5 -> A.1)
      const milestoneId = this.extractMilestoneId(branchName);
      if (milestoneId) {
        await this.performParentCascade(
          milestoneId,
          repoPath,
          actorString,
          triggerEvent,
          'milestone',
        );

        // Check initiative cascade (A.1 -> A)
        const initiativeId = this.extractInitiativeId(milestoneId);
        if (initiativeId) {
          await this.performParentCascade(
            initiativeId,
            repoPath,
            actorString,
            triggerEvent,
            'initiative',
          );
        }
      }
    } catch (error) {
      console.error('Error in cascade operations:', error);
      throw error;
    }
  }

  /**
   * Perform cascade analysis and transition for a parent artifact
   */
  private async performParentCascade(
    parentId: string,
    repoPath: string,
    actorString: string,
    triggerEvent: EventMetadata,
    cascadeType: string,
  ): Promise<void> {
    try {
      // Load parent artifact
      const parentArtifact = await this.artifactLoader.loadArtifact(
        parentId,
        repoPath,
      );

      // Load all child artifacts to perform cascade analysis
      const childArtifacts = await this.loadChildArtifacts(parentId, repoPath);

      // Check if parent should cascade using CascadeEngine
      const cascadeResult = this.cascadeEngine.shouldCascadeToParent(
        childArtifacts,
        this.cascadeEngine.getCurrentState(parentArtifact),
      );

      if (cascadeResult.shouldCascade && cascadeResult.newState) {
        console.log(
          `Cascading ${cascadeType} ${parentId} to ${cascadeResult.newState}: ${cascadeResult.reason}`,
        );

        // Generate cascade event with proper correlation
        const cascadeEvent = this.cascadeEngine.generateCascadeEvent(
          cascadeResult.newState,
          triggerEvent,
          `${cascadeType}_start_cascade`,
        );

        // Perform the transition
        performTransition(
          parentArtifact,
          cascadeResult.newState,
          actorString,
          cascadeEvent.metadata,
        );

        // Save the updated parent artifact
        await this.artifactLoader.saveArtifact(
          parentArtifact,
          parentId,
          repoPath,
        );
      }
    } catch (error) {
      console.error(`Error in ${cascadeType} cascade for ${parentId}:`, error);
      // Don't throw - cascade failures shouldn't break git operations
    }
  }

  /**
   * Load all child artifacts for cascade analysis
   */
  private async loadChildArtifacts(
    parentId: string,
    repoPath: string,
  ): Promise<Artifact[]> {
    const { glob } = await import('glob');
    const children: Artifact[] = [];

    try {
      // Pattern to find child artifacts
      const pattern = `${repoPath}/.kodebase/artifacts/**/${parentId}.*.yml`;
      const files = await glob(pattern);

      for (const file of files) {
        const childId = this.extractArtifactIdFromPath(file);
        if (childId && childId !== parentId) {
          try {
            const childArtifact = await this.artifactLoader.loadArtifact(
              childId,
              repoPath,
            );
            children.push(childArtifact);
          } catch (error) {
            console.warn(`Failed to load child artifact ${childId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load child artifacts:', error);
    }

    return children;
  }

  /**
   * Extract milestone ID from issue ID (e.g., A.1.5 -> A.1)
   */
  private extractMilestoneId(issueId: string): string | null {
    const match = issueId.match(/^([A-Z]\.\d+)\.\d+$/);
    return match?.[1] ?? null;
  }

  /**
   * Extract initiative ID from milestone ID (e.g., A.1 -> A)
   */
  private extractInitiativeId(milestoneId: string): string | null {
    const match = milestoneId.match(/^([A-Z])\.\d+$/);
    return match?.[1] ?? null;
  }

  /**
   * Extract artifact ID from file path
   */
  private extractArtifactIdFromPath(filePath: string): string | null {
    const fileName = filePath.split('/').pop();
    if (!fileName || !fileName.endsWith('.yml')) {
      return null;
    }
    return fileName.replace('.yml', '');
  }

  /**
   * Get actionable error message for users
   */
  private getActionableErrorMessage(error: unknown): string {
    if (!(error instanceof Error)) {
      return 'Unknown error - check git status and try again';
    }

    const message = error.message.toLowerCase();

    if (message.includes('timeout')) {
      return 'Operation timed out - check network connection and try again';
    }

    if (message.includes('permission')) {
      return 'Permission error - check file permissions and git configuration';
    }

    if (message.includes('git')) {
      return "Git error - ensure you're in a valid git repository with proper configuration";
    }

    return `${error.message} - check your git and GitHub CLI setup`;
  }
}
