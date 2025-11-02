/**
 * Sandbox Environment Management
 *
 * Creates isolated temporary directories for tutorial experimentation
 * without affecting real projects or user data.
 */

import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Creates a temporary sandbox directory structure for tutorial use.
 *
 * The sandbox mimics a real kodebase project structure but is isolated
 * in the system temp directory for safe experimentation.
 *
 * @returns Promise resolving to the sandbox directory path
 * @throws Error if sandbox creation fails
 */
export async function createSandbox(): Promise<string> {
  try {
    // Create unique sandbox directory in system temp
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const sandboxName = `kodebase-tutorial-${timestamp}`;
    const sandboxPath = path.join(tempDir, sandboxName);

    // Create sandbox directory
    await fs.mkdir(sandboxPath, { recursive: true });

    // Create .kodebase directory structure
    const kodebaseDir = path.join(sandboxPath, '.kodebase');
    const artifactsDir = path.join(kodebaseDir, 'artifacts');
    await fs.mkdir(artifactsDir, { recursive: true });

    // Create basic project files
    const packageJsonContent = {
      name: 'my-tutorial-project',
      version: '1.0.0',
      description: 'Tutorial project for learning kodebase',
      private: true,
    };

    await fs.writeFile(
      path.join(sandboxPath, 'package.json'),
      JSON.stringify(packageJsonContent, null, 2),
    );

    const readmeContent = `# My Tutorial Project

This is a tutorial project for learning kodebase concepts.
This directory is temporary and will be cleaned up automatically.

Created: ${new Date().toISOString()}
`;

    await fs.writeFile(path.join(sandboxPath, 'README.md'), readmeContent);

    // Initialize git repository
    const { execSync } = await import('node:child_process');

    execSync('git init', {
      cwd: sandboxPath,
      stdio: 'ignore',
    });

    execSync('git config user.name "Tutorial User"', {
      cwd: sandboxPath,
      stdio: 'ignore',
    });

    execSync('git config user.email "tutorial@example.com"', {
      cwd: sandboxPath,
      stdio: 'ignore',
    });

    // Initial commit
    execSync('git add .', {
      cwd: sandboxPath,
      stdio: 'ignore',
    });

    execSync('git commit -m "Initial tutorial project setup"', {
      cwd: sandboxPath,
      stdio: 'ignore',
    });

    return sandboxPath;
  } catch (error) {
    throw new Error(
      `Failed to create sandbox: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Cleans up the sandbox directory and all its contents.
 *
 * @param sandboxPath Path to the sandbox directory to clean up
 * @throws Error if cleanup fails (non-critical, should not stop execution)
 */
export async function cleanupSandbox(sandboxPath: string): Promise<void> {
  try {
    if (!sandboxPath || !sandboxPath.includes('kodebase-tutorial-')) {
      // Safety check - only clean up directories we created
      throw new Error('Invalid sandbox path - safety check failed');
    }

    // Verify it exists before attempting cleanup
    await fs.access(sandboxPath);

    // Recursively remove the entire sandbox
    await fs.rm(sandboxPath, { recursive: true, force: true });
  } catch (error) {
    // Non-critical error - log but don't throw
    console.warn(`Warning: Failed to cleanup sandbox ${sandboxPath}:`, error);
  }
}

/**
 * Checks if a path is within a kodebase tutorial sandbox.
 * Used for safety checks to prevent operations on real projects.
 *
 * @param targetPath Path to check
 * @returns true if the path is within a tutorial sandbox
 */
export function isSandboxPath(targetPath: string): boolean {
  return (
    targetPath.includes('kodebase-tutorial-') &&
    targetPath.includes(os.tmpdir())
  );
}

/**
 * Gets the current working directory, accounting for sandbox context.
 *
 * @param sandboxPath Optional sandbox path to use as working directory
 * @returns Working directory path (sandbox or current directory)
 */
export function getWorkingDirectory(sandboxPath?: string): string {
  if (sandboxPath && isSandboxPath(sandboxPath)) {
    return sandboxPath;
  }
  return process.cwd();
}
