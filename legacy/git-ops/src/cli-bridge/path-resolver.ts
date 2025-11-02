/**
 * Path Resolution for CLI Bridge
 *
 * Handles path resolution for CLI scripts and utilities from git hook contexts.
 * Git hooks may run from different working directories than the repo root.
 */

import { existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { PathResolution } from './types';
import { CLIBridgeError, CLIBridgeErrorType } from './types';

const SCRIPT_EXTENSIONS = ['.sh', '.py', '.js', '.ts'];
const SCRIPT_COMMANDS = {
  ictx: 'get-issue-context.sh',
  cpr: 'create-pr.sh',
  complete: 'complete-issue.py',
  'pr-desc': 'generate-pr-description.sh',
};

/**
 * Path resolution utilities
 */

// biome-ignore lint/complexity/noStaticOnlyClass: Makes sense for consistency
export class PathResolver {
  /**
   * Resolve paths for CLI execution
   */
  static async resolvePaths(
    repoRoot: string,
    scriptsDir: string = 'scripts',
  ): Promise<PathResolution> {
    try {
      const absoluteRepoRoot = resolve(repoRoot);
      const absoluteScriptsDir = join(absoluteRepoRoot, scriptsDir);

      // Validate repository root exists
      if (!existsSync(absoluteRepoRoot)) {
        throw new Error(`Repository root does not exist: ${absoluteRepoRoot}`);
      }

      // Validate scripts directory exists
      if (!existsSync(absoluteScriptsDir)) {
        throw new Error(
          `Scripts directory does not exist: ${absoluteScriptsDir}`,
        );
      }

      // Validate it's a directory
      if (!statSync(absoluteScriptsDir).isDirectory()) {
        throw new Error(
          `Scripts path is not a directory: ${absoluteScriptsDir}`,
        );
      }

      return {
        scriptPath: absoluteScriptsDir,
        repoRoot: absoluteRepoRoot,
        scriptsDir: absoluteScriptsDir,
      };
    } catch (error) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.PATH_RESOLUTION_FAILED,
        `Failed to resolve paths: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Resolve script path for a specific command
   */
  static async resolveScriptPath(
    command: string,
    repoRoot: string,
    scriptsDir: string = 'scripts',
  ): Promise<string> {
    try {
      const paths = await PathResolver.resolvePaths(repoRoot, scriptsDir);

      // Check if command is a known script command
      const scriptName =
        SCRIPT_COMMANDS[command as keyof typeof SCRIPT_COMMANDS];
      if (scriptName) {
        const scriptPath = join(paths.scriptsDir, scriptName);
        if (existsSync(scriptPath)) {
          return scriptPath;
        }
      }

      // Try to find script with various extensions
      for (const ext of SCRIPT_EXTENSIONS) {
        const scriptPath = join(paths.scriptsDir, `${command}${ext}`);
        if (existsSync(scriptPath)) {
          return scriptPath;
        }
      }

      // Try without extension
      const scriptPath = join(paths.scriptsDir, command);
      if (existsSync(scriptPath)) {
        return scriptPath;
      }

      throw new Error(`Script not found: ${command}`);
    } catch (error) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.PATH_RESOLUTION_FAILED,
        `Failed to resolve script path for '${command}': ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Validate script exists and is executable
   */
  static async validateScript(scriptPath: string): Promise<boolean> {
    try {
      if (!existsSync(scriptPath)) {
        return false;
      }

      const stats = statSync(scriptPath);
      if (!stats.isFile()) {
        return false;
      }

      // Check if file is executable (has execute permission)
      // This is a simplified check - in practice, you might want more sophisticated validation
      try {
        // Try to access the file - if it throws, it's not accessible
        statSync(scriptPath);
        return true;
      } catch {
        return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Get script interpreter for a given script
   */
  static getScriptInterpreter(scriptPath: string): string {
    const ext = scriptPath.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'sh':
        return 'bash';
      case 'py':
        return 'python3';
      case 'js':
        return 'node';
      case 'ts':
        return 'tsx'; // or 'ts-node' if available
      default:
        // For extensionless files, try to determine by shebang or assume bash
        return 'bash';
    }
  }

  /**
   * Build full command for script execution
   */
  static async buildScriptCommand(
    command: string,
    args: string[],
    repoRoot: string,
    scriptsDir: string = 'scripts',
  ): Promise<{ command: string; args: string[]; scriptPath: string }> {
    try {
      const scriptPath = await PathResolver.resolveScriptPath(
        command,
        repoRoot,
        scriptsDir,
      );

      // Validate script exists
      if (!(await PathResolver.validateScript(scriptPath))) {
        throw new Error(`Script is not valid or not executable: ${scriptPath}`);
      }

      const interpreter = PathResolver.getScriptInterpreter(scriptPath);

      return {
        command: interpreter,
        args: [scriptPath, ...args],
        scriptPath,
      };
    } catch (error) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.PATH_RESOLUTION_FAILED,
        `Failed to build script command for '${command}': ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Find package.json script commands
   */
  static async findPackageScripts(
    repoRoot: string,
  ): Promise<Record<string, string>> {
    try {
      const packageJsonPath = join(repoRoot, 'package.json');

      if (!existsSync(packageJsonPath)) {
        return {};
      }

      const packageJson = JSON.parse(
        require('node:fs').readFileSync(packageJsonPath, 'utf-8'),
      );

      return packageJson.scripts || {};
    } catch (error) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.PATH_RESOLUTION_FAILED,
        `Failed to read package.json scripts: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Check if command is a package.json script
   */
  static async isPackageScript(
    command: string,
    repoRoot: string,
  ): Promise<boolean> {
    try {
      const scripts = await PathResolver.findPackageScripts(repoRoot);
      return command in scripts;
    } catch {
      return false;
    }
  }
}
