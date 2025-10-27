/**
 * Artifact loader for discovering and loading Kodebase artifacts
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { glob } from 'glob';
import {
  ARTIFACT_FILE_EXT,
  type ArtifactType,
  KODEBASE_DIR,
} from '../data/types/constants';

/**
 * Service for loading and discovering artifact files
 */
export class ArtifactLoader {
  private baseDir: string;

  constructor(baseDir: string = process.cwd()) {
    this.baseDir = baseDir;
  }

  /**
   * Load all artifact file paths in the repository
   */
  async loadAllArtifactPaths(): Promise<string[]> {
    const artifactsDir = join(this.baseDir, KODEBASE_DIR, 'artifacts');

    try {
      // Check if artifacts directory exists
      await fs.access(artifactsDir);

      // Find all YAML files in the artifacts directory
      const pattern = join(artifactsDir, '**', `*${ARTIFACT_FILE_EXT}`);
      const files = await glob(pattern, {
        absolute: true,
        nodir: true,
      });

      return files;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw new Error(
        `Failed to load artifact paths: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Find artifact files by pattern
   */
  async findArtifactsByPattern(pattern: string): Promise<string[]> {
    const artifactsDir = join(this.baseDir, KODEBASE_DIR, 'artifacts');
    const searchPattern = join(artifactsDir, '**', pattern);

    try {
      const files = await glob(searchPattern, {
        absolute: true,
        nodir: true,
      });

      return files.filter((file) => file.endsWith(ARTIFACT_FILE_EXT));
    } catch (error) {
      throw new Error(
        `Failed to find artifacts by pattern: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Load artifacts by type (initiative, milestone, issue)
   */
  async loadArtifactsByType(type: ArtifactType): Promise<string[]> {
    const allPaths = await this.loadAllArtifactPaths();

    return allPaths.filter((path) => {
      const filename = path.split('/').pop() || '';
      const match = filename.match(/^([A-Z]+(?:\.\d+)*)/);

      if (!match) return false;

      const id = match[1];
      const parts = id ? id.split('.') : [];

      switch (type) {
        case 'initiative':
          return parts.length === 1;
        case 'milestone':
          return parts.length === 2;
        case 'issue':
          return parts.length >= 3;
        default:
          return false;
      }
    });
  }

  /**
   * Get artifact ID from file path
   */
  getArtifactIdFromPath(path: string): string | null {
    const filename = path.split('/').pop() || '';
    const match = filename.match(/^([A-Z]+(?:\.\d+)*)\.yml$/);
    return match ? (match[1] ?? null) : null;
  }
}
