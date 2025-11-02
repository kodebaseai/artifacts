/**
 * CLI Bridge Main Module
 *
 * Main interface for the CLI bridge that connects git hooks with CLI commands.
 * Provides a unified interface for environment setup, command execution,
 * and context aggregation.
 */

import { CommandExecutor } from './command-executor';
import { ContextAggregator } from './context-aggregator';
import { EnvironmentManager } from './environment';
import { PathResolver } from './path-resolver';
import type {
  CLIBridgeConfig,
  CommandConfig,
  CommandResult,
  ContextAggregationResult,
  GitContext,
} from './types';
import { CLIBridgeError, CLIBridgeErrorType } from './types';

export type { CLIBridgeConfig } from './types';

/**
 * Main CLI Bridge class
 */
export class CLIBridge {
  private config: CLIBridgeConfig;
  private gitContext: GitContext | null = null;

  constructor(config: Partial<CLIBridgeConfig> = {}) {
    // Set default configuration
    this.config = {
      repoRoot: config.repoRoot || process.cwd(),
      scriptsDir: config.scriptsDir || 'scripts',
      defaultTimeout: config.defaultTimeout || 30000,
      environment: {
        additionalPaths: config.environment?.additionalPaths || [],
        envVars: config.environment?.envVars || {},
      },
    };

    // Validate configuration
    this.validateConfig();
  }

  /**
   * Execute a CLI command
   */
  async executeCommand(
    command: string,
    args: string[] = [],
    options: {
      timeout?: number;
      envOverrides?: Record<string, string>;
    } = {},
  ): Promise<CommandResult> {
    try {
      // Setup environment
      const environment = await EnvironmentManager.setupEnvironment(
        this.config.repoRoot,
        this.config.environment.additionalPaths,
        {
          ...this.config.environment.envVars,
          ...options.envOverrides,
        },
      );

      // Get git context if not already loaded
      if (!this.gitContext) {
        this.gitContext = await this.getGitContext();
      }

      // Build command configuration
      const commandConfig: CommandConfig = {
        name: command,
        args,
        gitContext: this.gitContext,
        timeout: options.timeout || this.config.defaultTimeout,
      };

      // Validate command configuration
      CommandExecutor.validateConfig(commandConfig);

      // Execute command
      return await CommandExecutor.executeCommand(commandConfig, environment);
    } catch (error) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.COMMAND_EXECUTION_FAILED,
        `Failed to execute command '${command}': ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Execute multiple commands in sequence
   */
  async executeSequence(
    commands: { command: string; args?: string[] }[],
    options: {
      timeout?: number;
      envOverrides?: Record<string, string>;
      stopOnFailure?: boolean;
    } = {},
  ): Promise<CommandResult[]> {
    const results: CommandResult[] = [];

    for (const { command, args = [] } of commands) {
      const result = await this.executeCommand(command, args, options);
      results.push(result);

      // Stop on first failure if configured to do so
      if (options.stopOnFailure !== false && !result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Get git context information
   */
  async getGitContext(): Promise<GitContext> {
    try {
      const context = await EnvironmentManager.getGitContext(
        this.config.repoRoot,
      );
      return {
        ...context,
        repoRoot: this.config.repoRoot,
      };
    } catch (error) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.ENVIRONMENT_SETUP_FAILED,
        `Failed to get git context: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Aggregate context for milestone completion
   */
  async aggregateMilestoneContext(
    milestoneId: string,
    options: {
      includeCompletionAnalysis?: boolean;
      includeDevelopmentProcess?: boolean;
    } = {},
  ): Promise<ContextAggregationResult> {
    try {
      return await ContextAggregator.aggregateMilestoneContext(
        milestoneId,
        this.config.repoRoot,
        options,
      );
    } catch (error) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.CONTEXT_AGGREGATION_FAILED,
        `Failed to aggregate milestone context: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Aggregate context for initiative completion
   */
  async aggregateInitiativeContext(
    initiativeId: string,
    options: {
      includeCompletionAnalysis?: boolean;
      includeDevelopmentProcess?: boolean;
    } = {},
  ): Promise<ContextAggregationResult> {
    try {
      return await ContextAggregator.aggregateInitiativeContext(
        initiativeId,
        this.config.repoRoot,
        options,
      );
    } catch (error) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.CONTEXT_AGGREGATION_FAILED,
        `Failed to aggregate initiative context: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Check if a script exists
   */
  async scriptExists(command: string): Promise<boolean> {
    try {
      await PathResolver.resolveScriptPath(
        command,
        this.config.repoRoot,
        this.config.scriptsDir,
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get available scripts
   */
  async getAvailableScripts(): Promise<string[]> {
    try {
      const packageScripts = await PathResolver.findPackageScripts(
        this.config.repoRoot,
      );
      return Object.keys(packageScripts);
    } catch {
      return [];
    }
  }

  /**
   * Validate CLI bridge configuration
   */
  private validateConfig(): void {
    if (!this.config.repoRoot) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.INVALID_CONFIGURATION,
        'Repository root is required',
      );
    }

    if (!this.config.scriptsDir) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.INVALID_CONFIGURATION,
        'Scripts directory is required',
      );
    }

    if (this.config.defaultTimeout < 0 || this.config.defaultTimeout > 600000) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.INVALID_CONFIGURATION,
        'Default timeout must be between 0 and 600000ms (10 minutes)',
      );
    }

    // Validate repository is a git repository
    if (!EnvironmentManager.isGitRepository(this.config.repoRoot)) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.INVALID_CONFIGURATION,
        `Path is not a git repository: ${this.config.repoRoot}`,
      );
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CLIBridgeConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CLIBridgeConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      environment: {
        ...this.config.environment,
        ...updates.environment,
      },
    };

    // Reset git context to force reload
    this.gitContext = null;

    // Validate updated configuration
    this.validateConfig();
  }
}

export { CommandExecutor } from './command-executor';
export { ContextAggregator } from './context-aggregator';
export { EnvironmentManager } from './environment';
export { PathResolver } from './path-resolver';
// Export all types and classes
export * from './types';
