/**
 * Environment Setup for CLI Bridge
 *
 * Handles environment configuration for CLI command execution from git hooks.
 * Git hooks often run in minimal environments without proper PATH setup.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { EnvironmentConfig } from './types';
import { CLIBridgeError, CLIBridgeErrorType } from './types';

/**
 * Environment setup manager
 */

// biome-ignore lint/complexity/noStaticOnlyClass: Makes sense for consistency
export class EnvironmentManager {
  private static readonly COMMON_NODE_PATHS = [
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/opt/homebrew/bin',
    '/usr/local/node/bin',
    '/usr/local/nodejs/bin',
    '~/.nvm/current/bin',
    '~/.nodenv/shims',
    '~/.asdf/shims',
  ];

  private static readonly COMMON_PYTHON_PATHS = [
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/opt/homebrew/bin',
    '/usr/local/python/bin',
    '~/.pyenv/shims',
    '~/.asdf/shims',
  ];

  /**
   * Setup environment configuration for CLI execution
   */
  static async setupEnvironment(
    repoRoot: string,
    additionalPaths: string[] = [],
    envVars: Record<string, string> = {},
  ): Promise<EnvironmentConfig> {
    try {
      // Get current environment
      const currentEnv = { ...process.env };

      // Build PATH with common locations
      const pathComponents = [
        ...additionalPaths,
        ...EnvironmentManager.COMMON_NODE_PATHS,
        ...EnvironmentManager.COMMON_PYTHON_PATHS,
        currentEnv.PATH || '',
      ];

      // Add local node_modules/.bin
      const localNodeModulesBin = join(repoRoot, 'node_modules', '.bin');
      if (existsSync(localNodeModulesBin)) {
        pathComponents.unshift(localNodeModulesBin);
      }

      // Deduplicate and join PATH
      const uniquePaths = [...new Set(pathComponents.filter(Boolean))];
      const newPath = uniquePaths.join(':');

      // Setup environment variables
      const env = {
        ...currentEnv,
        PATH: newPath,
        HOME: currentEnv.HOME || '~',
        USER: currentEnv.USER || 'unknown',
        PWD: repoRoot,
        // Override with custom env vars
        ...envVars,
      };

      // Validate critical tools are available
      await EnvironmentManager.validateEnvironment(env);

      return {
        cwd: repoRoot,
        env,
        timeout: 30000, // 30 second default timeout
      };
    } catch (error) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.ENVIRONMENT_SETUP_FAILED,
        `Failed to setup environment: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Validate that critical tools are available
   */
  private static async validateEnvironment(
    env: Record<string, string>,
  ): Promise<void> {
    const validations = [
      { tool: 'node', command: 'node --version' },
      { tool: 'pnpm', command: 'pnpm --version' },
      { tool: 'python3', command: 'python3 --version' },
      { tool: 'git', command: 'git --version' },
    ];

    const failures: string[] = [];

    for (const { tool, command } of validations) {
      try {
        execSync(command, {
          env,
          stdio: 'pipe',
          timeout: 5000,
        });
      } catch (_error) {
        failures.push(`${tool} not available or not working`);
      }
    }

    if (failures.length > 0) {
      throw new Error(`Environment validation failed: ${failures.join(', ')}`);
    }
  }

  /**
   * Get git user configuration
   */
  static async getGitUser(
    repoRoot: string,
  ): Promise<{ name: string; email: string }> {
    try {
      const name = execSync('git config user.name', {
        cwd: repoRoot,
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();

      const email = execSync('git config user.email', {
        cwd: repoRoot,
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();

      return { name, email };
    } catch (error) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.ENVIRONMENT_SETUP_FAILED,
        `Failed to get git user configuration: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Get current git context
   */
  static async getGitContext(repoRoot: string): Promise<{
    branch: string;
    commit: string;
    user: { name: string; email: string };
  }> {
    try {
      const branch = execSync('git branch --show-current', {
        cwd: repoRoot,
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();

      const commit = execSync('git rev-parse HEAD', {
        cwd: repoRoot,
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();

      const user = await EnvironmentManager.getGitUser(repoRoot);

      return { branch, commit, user };
    } catch (error) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.ENVIRONMENT_SETUP_FAILED,
        `Failed to get git context: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Check if we're in a git repository
   */
  static isGitRepository(path: string): boolean {
    try {
      execSync('git rev-parse --git-dir', {
        cwd: path,
        stdio: 'pipe',
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find git repository root
   */
  static findGitRoot(startPath: string): string | null {
    try {
      const gitRoot = execSync('git rev-parse --show-toplevel', {
        cwd: startPath,
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
      return gitRoot;
    } catch {
      return null;
    }
  }
}
