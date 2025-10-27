/**
 * File service for reading and writing Kodebase artifacts
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { KODEBASE_DIR } from '../data/types/constants';

/**
 * Service for handling artifact file operations
 */
export class ArtifactFileService {
  /**
   * Read an artifact from a file path
   */
  async readArtifact(path: string): Promise<any> {
    try {
      const content = await fs.readFile(path, 'utf-8');
      return parse(content);
    } catch (error) {
      throw new Error(
        `Failed to read artifact at ${path}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Write an artifact to a file path
   */
  async writeArtifact(path: string, data: any): Promise<void> {
    try {
      const content = stringify(data, {
        lineWidth: 0,
        defaultStringType: 'PLAIN',
        defaultKeyType: 'PLAIN',
      });
      await fs.writeFile(path, content, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to write artifact at ${path}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Check if an artifact file exists
   */
  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the artifacts directory path
   */
  getArtifactsDir(baseDir: string = process.cwd()): string {
    return join(baseDir, KODEBASE_DIR, 'artifacts');
  }
}
