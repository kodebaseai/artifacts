import { randomBytes } from "node:crypto";
import path from "node:path";
import { vol } from "memfs";

/**
 * Base directory for all temp directories in tests
 */
const TEMP_BASE_DIR = "/tmp/test";

/**
 * Track temp directories created in the current test session
 */
const activeTempDirs = new Set<string>();

/**
 * Create an isolated temporary directory for testing.
 * The directory is tracked and can be cleaned up with cleanupTempDir() or cleanupAllTempDirs().
 *
 * @param prefix - Optional prefix for the temp directory name
 * @returns Absolute path to the created temp directory
 */
export function createTempDir(prefix = "test"): string {
  const randomId = randomBytes(8).toString("hex");
  const tempDir = path.join(TEMP_BASE_DIR, `${prefix}-${randomId}`);

  vol.mkdirSync(tempDir, { recursive: true });
  activeTempDirs.add(tempDir);

  return tempDir;
}

/**
 * Clean up a specific temporary directory.
 *
 * @param tempDir - Absolute path to the temp directory to clean up
 */
export function cleanupTempDir(tempDir: string): void {
  if (vol.existsSync(tempDir)) {
    vol.rmSync(tempDir, { recursive: true, force: true });
  }
  activeTempDirs.delete(tempDir);
}

/**
 * Clean up all temporary directories created in the current test session.
 * This should typically be called in afterEach() or afterAll().
 */
export function cleanupAllTempDirs(): void {
  for (const tempDir of activeTempDirs) {
    if (vol.existsSync(tempDir)) {
      vol.rmSync(tempDir, { recursive: true, force: true });
    }
  }
  activeTempDirs.clear();
}

/**
 * Execute a callback with an isolated temporary directory.
 * The directory is automatically cleaned up after the callback completes,
 * even if an error occurs.
 *
 * This follows the RAII (Resource Acquisition Is Initialization) pattern.
 *
 * @param callback - Async function that receives the temp directory path
 * @param prefix - Optional prefix for the temp directory name
 * @returns The result of the callback
 *
 * @example
 * ```typescript
 * await withTempDir(async (tempDir) => {
 *   await fs.writeFile(path.join(tempDir, 'test.txt'), 'content');
 *   // ... test operations ...
 * });
 * // tempDir is automatically cleaned up
 * ```
 */
export async function withTempDir<T>(
  callback: (tempDir: string) => Promise<T>,
  prefix = "test",
): Promise<T> {
  const tempDir = createTempDir(prefix);
  try {
    return await callback(tempDir);
  } finally {
    cleanupTempDir(tempDir);
  }
}

/**
 * Synchronous version of withTempDir for non-async tests.
 *
 * @param callback - Function that receives the temp directory path
 * @param prefix - Optional prefix for the temp directory name
 * @returns The result of the callback
 */
export function withTempDirSync<T>(
  callback: (tempDir: string) => T,
  prefix = "test",
): T {
  const tempDir = createTempDir(prefix);
  try {
    return callback(tempDir);
  } finally {
    cleanupTempDir(tempDir);
  }
}

/**
 * Get the list of currently active temp directories.
 * Useful for debugging test cleanup issues.
 *
 * @returns Set of active temp directory paths
 */
export function getActiveTempDirs(): ReadonlySet<string> {
  return activeTempDirs;
}

/**
 * Create a nested directory structure within a temp directory.
 *
 * @param tempDir - Base temp directory
 * @param structure - Array of relative paths to create
 *
 * @example
 * ```typescript
 * const tempDir = createTempDir();
 * createTempStructure(tempDir, [
 *   'src/components',
 *   'src/utils',
 *   'test/fixtures'
 * ]);
 * ```
 */
export function createTempStructure(
  tempDir: string,
  structure: string[],
): void {
  for (const relativePath of structure) {
    const fullPath = path.join(tempDir, relativePath);
    vol.mkdirSync(fullPath, { recursive: true });
  }
}
