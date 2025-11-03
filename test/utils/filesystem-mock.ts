import path from "node:path";
import { vol } from "memfs";

/**
 * Default base directory for test workspaces
 */
export const DEFAULT_TEST_BASE_DIR = "/test-workspace";

/**
 * Initialize the mock filesystem with an optional base directory.
 * Creates the base directory structure ready for testing.
 *
 * @param baseDir - Base directory for tests (defaults to /test-workspace)
 * @returns The base directory path
 */
export function setupMockFs(baseDir = DEFAULT_TEST_BASE_DIR): string {
  vol.reset();
  vol.mkdirSync(baseDir, { recursive: true });
  return baseDir;
}

/**
 * Reset the mock filesystem, clearing all files and directories.
 * Should be called in afterEach() to ensure test isolation.
 */
export function resetMockFs(): void {
  vol.reset();
}

/**
 * Create a mock directory in the filesystem.
 *
 * @param dirPath - Absolute path to the directory to create
 * @param options - Options for directory creation
 */
export function createMockDirectory(
  dirPath: string,
  options?: { recursive?: boolean },
): void {
  vol.mkdirSync(dirPath, { recursive: options?.recursive ?? true });
}

/**
 * Write a file to the mock filesystem.
 *
 * @param filePath - Absolute path to the file
 * @param content - File content (string or Buffer)
 * @param options - Write options
 */
export function writeMockFile(
  filePath: string,
  content: string | Buffer,
  options?: { encoding?: BufferEncoding },
): void {
  const dir = path.dirname(filePath);
  if (!vol.existsSync(dir)) {
    vol.mkdirSync(dir, { recursive: true });
  }
  const encoding = options?.encoding ?? "utf-8";
  vol.writeFileSync(filePath, content, { encoding });
}

/**
 * Read a file from the mock filesystem.
 *
 * @param filePath - Absolute path to the file
 * @param options - Read options
 * @returns File content as string
 */
export function readMockFile(
  filePath: string,
  options?: { encoding?: BufferEncoding },
): string {
  const encoding = options?.encoding ?? "utf-8";
  return vol.readFileSync(filePath, { encoding }) as string;
}

/**
 * Check if a file or directory exists in the mock filesystem.
 *
 * @param filePath - Absolute path to check
 * @returns True if the path exists
 */
export function mockFileExists(filePath: string): boolean {
  return vol.existsSync(filePath);
}

/**
 * List files in a directory in the mock filesystem.
 *
 * @param dirPath - Absolute path to the directory
 * @returns Array of filenames
 */
export function listMockDirectory(dirPath: string): string[] {
  return vol.readdirSync(dirPath) as string[];
}

/**
 * Get the full structure of the mock filesystem as a JSON object.
 * Useful for debugging tests.
 *
 * @returns JSON representation of the filesystem
 */
export function getMockFsStructure(): Record<string, unknown> {
  return vol.toJSON();
}
