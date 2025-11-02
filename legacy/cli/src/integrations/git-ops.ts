/**
 * Git-Ops Integration Module
 *
 * Provides integration with @kodebase/git-ops package.
 * Sets up CLIBridge for git operations and context detection.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CLIBridge,
  type CLIBridgeConfig,
  formatError,
} from '@kodebase/git-ops';

// Define types locally until they're properly exported from git-ops
interface StructuredError extends Error {
  code: string;
  message: string;
  category: string;
}

/**
 * Default configuration for CLIBridge
 */
const DEFAULT_CONFIG: Partial<CLIBridgeConfig> = {
  defaultTimeout: 30000,
  scriptsDir: 'scripts',
  environment: {
    additionalPaths: [],
    envVars: {},
  },
};

/**
 * Singleton instance of CLIBridge
 */
let cliBridgeInstance: CLIBridge | null = null;

/**
 * Get or create CLIBridge instance
 */
export function getCLIBridge(config?: Partial<CLIBridgeConfig>): CLIBridge {
  if (!cliBridgeInstance) {
    cliBridgeInstance = new CLIBridge({
      ...DEFAULT_CONFIG,
      ...config,
      repoRoot: config?.repoRoot || process.cwd(),
    });
  }
  return cliBridgeInstance;
}

/**
 * Check if current directory is a git repository
 */
export function isGitRepository(path?: string): boolean {
  const checkPath = path || process.cwd();
  const gitDir = resolve(checkPath, '.git');
  return existsSync(gitDir);
}

/**
 * Ensure we're in a git repository before executing git commands
 * @throws Error if not in a git repository
 */
export function ensureGitRepository(path?: string): void {
  if (!isGitRepository(path)) {
    throw new Error(
      'Not in a git repository. Please run this command from within a git repository.',
    );
  }
}

/**
 * Reset CLIBridge instance (useful for testing)
 */
export function resetCLIBridge(): void {
  cliBridgeInstance = null;
}

/**
 * Error wrapper for git-ops operations
 * Translates git-ops errors into user-friendly CLI messages
 */
export async function withGitOpsErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Check if it's a structured error from git-ops
    if (isStructuredError(error)) {
      const formattedMessage = formatError(
        error.message,
        context || 'git-ops operation',
        { code: error.code, category: error.category },
      );
      throw new Error(formattedMessage);
    }

    // Handle generic errors
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(context ? `${context}: ${message}` : message);
  }
}

/**
 * Type guard for StructuredError
 */
function isStructuredError(error: unknown): error is StructuredError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    'category' in error
  );
}
