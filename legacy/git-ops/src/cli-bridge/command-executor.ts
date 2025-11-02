/**
 * Command Executor for CLI Bridge
 *
 * Handles execution of CLI commands with proper error handling, timeouts,
 * and context passing from git hook environments.
 */

import { spawn } from 'node:child_process';
import { PathResolver } from './path-resolver';
import type { CommandConfig, CommandResult, EnvironmentConfig } from './types';
import { CLIBridgeError, CLIBridgeErrorType } from './types';

/**
 * Command execution manager
 */

// biome-ignore lint/complexity/noStaticOnlyClass: Makes sense for consistency
export class CommandExecutor {
  /**
   * Execute a CLI command with proper environment and error handling
   */
  static async executeCommand(
    config: CommandConfig,
    environment: EnvironmentConfig,
  ): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      // Build the command to execute
      const commandInfo = await CommandExecutor.buildCommand(
        config,
        environment,
      );

      // Execute the command
      const result = await CommandExecutor.runCommand(
        commandInfo.command,
        commandInfo.args,
        environment,
        config.timeout || environment.timeout,
      );

      const executionTime = Date.now() - startTime;

      return {
        ...result,
        executionTime,
      };
    } catch (error) {
      const _executionTime = Date.now() - startTime;

      throw new CLIBridgeError(
        CLIBridgeErrorType.COMMAND_EXECUTION_FAILED,
        `Command '${config.name}' failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Build command information for execution
   */
  private static async buildCommand(
    config: CommandConfig,
    environment: EnvironmentConfig,
  ): Promise<{ command: string; args: string[] }> {
    const { name, args } = config;

    // Check if it's a package.json script first
    if (await PathResolver.isPackageScript(name, environment.cwd)) {
      return {
        command: 'pnpm',
        args: [name, ...args],
      };
    }

    // Otherwise, resolve as a script file
    return await PathResolver.buildScriptCommand(name, args, environment.cwd);
  }

  /**
   * Run a command with proper error handling and timeout
   */
  private static async runCommand(
    command: string,
    args: string[],
    environment: EnvironmentConfig,
    timeout: number,
  ): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timeoutHandle: NodeJS.Timeout | undefined;

      // Merge environment with any overrides
      const execEnv = {
        ...environment.env,
      };

      // Spawn the process
      const child = spawn(command, args, {
        cwd: environment.cwd,
        env: execEnv,
        stdio: 'pipe',
      });

      // Set up timeout
      if (timeout > 0) {
        timeoutHandle = setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`Command timed out after ${timeout}ms`));
        }, timeout);
      }

      // Handle stdout
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      // Handle stderr
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process exit
      child.on('close', (code) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        const result: CommandResult = {
          exitCode: code || 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          success: code === 0,
          executionTime: 0, // Will be set by caller
        };

        resolve(result);
      });

      // Handle process error
      child.on('error', (error) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        reject(error);
      });
    });
  }

  /**
   * Execute multiple commands in sequence
   */
  static async executeSequence(
    commands: CommandConfig[],
    environment: EnvironmentConfig,
  ): Promise<CommandResult[]> {
    const results: CommandResult[] = [];

    for (const command of commands) {
      const result = await CommandExecutor.executeCommand(command, environment);
      results.push(result);

      // Stop on first failure unless explicitly configured to continue
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute multiple commands in parallel
   */
  static async executeParallel(
    commands: CommandConfig[],
    environment: EnvironmentConfig,
  ): Promise<CommandResult[]> {
    const promises = commands.map((command) =>
      CommandExecutor.executeCommand(command, environment),
    );

    return Promise.all(promises);
  }

  /**
   * Execute a command with retry logic
   */
  static async executeWithRetry(
    config: CommandConfig,
    environment: EnvironmentConfig,
    maxRetries: number = 3,
    retryDelay: number = 1000,
  ): Promise<CommandResult> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await CommandExecutor.executeCommand(
          config,
          environment,
        );

        // If successful, return result
        if (result.success) {
          return result;
        }

        // If not successful but not the last attempt, continue to retry
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }

        // Last attempt failed, return the result
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If not the last attempt, wait and retry
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }

        // Last attempt failed with error, throw it
        throw lastError;
      }
    }

    // Should never reach here, but just in case
    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Validate command configuration
   */
  static validateConfig(config: CommandConfig): void {
    if (!config.name) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.INVALID_CONFIGURATION,
        'Command name is required',
      );
    }

    if (!Array.isArray(config.args)) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.INVALID_CONFIGURATION,
        'Command args must be an array',
      );
    }

    if (config.timeout && (config.timeout < 0 || config.timeout > 600000)) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.INVALID_CONFIGURATION,
        'Command timeout must be between 0 and 600000ms (10 minutes)',
      );
    }
  }
}
