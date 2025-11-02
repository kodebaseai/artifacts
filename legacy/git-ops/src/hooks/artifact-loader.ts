/**
 * Shared utility for loading and saving artifacts using @kodebase/core
 */

import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import {
  type Artifact,
  ArtifactParser,
  ArtifactValidator,
  formatActor,
  type Initiative,
  type Issue,
  type Milestone,
} from '@kodebase/core';

/**
 * Utility class for loading and saving Kodebase artifacts
 */
export class ArtifactLoader {
  private parser: ArtifactParser;
  private validator: ArtifactValidator;

  constructor() {
    this.parser = new ArtifactParser();
    this.validator = new ArtifactValidator();
  }

  /**
   * Load artifact using @kodebase/core ArtifactParser with comprehensive error handling
   */
  async loadArtifact(artifactId: string, repoPath: string): Promise<Artifact> {
    const filePath = this.getArtifactFilePath(artifactId, repoPath);

    if (!existsSync(filePath)) {
      throw new ArtifactFileError(
        `Artifact file not found: ${filePath}`,
        'FILE_NOT_FOUND',
        artifactId,
        filePath,
      );
    }

    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new ArtifactFileError(
        `Failed to read artifact file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'READ_ERROR',
        artifactId,
        filePath,
        error instanceof Error ? error : undefined,
      );
    }

    // Parse and validate based on artifact type
    const parts = artifactId.split('.');
    let parsedArtifact: Artifact;

    try {
      if (parts.length === 1) {
        parsedArtifact = this.parser.parseInitiative(content) as Initiative;
      } else if (parts.length === 2) {
        parsedArtifact = this.parser.parseMilestone(content) as Milestone;
      } else {
        parsedArtifact = this.parser.parseIssue(content) as Issue;
      }
    } catch (error) {
      throw new ArtifactFileError(
        `Failed to parse artifact YAML: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PARSE_ERROR',
        artifactId,
        filePath,
        error instanceof Error ? error : undefined,
      );
    }

    // Validate to ensure proper typing and data integrity
    try {
      const validatedArtifact = this.validator.validate(
        parsedArtifact,
      ) as Artifact;

      // Additional integrity checks
      this.validateArtifactIntegrity(validatedArtifact, artifactId);

      return validatedArtifact;
    } catch (error) {
      throw new ArtifactFileError(
        `Artifact validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'VALIDATION_ERROR',
        artifactId,
        filePath,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Save artifact back to file with atomic operations and comprehensive error handling
   */
  async saveArtifact(
    artifact: Artifact,
    artifactId: string,
    repoPath: string,
  ): Promise<void> {
    const filePath = this.getArtifactFilePath(artifactId, repoPath);
    const tempFilePath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
    const backupFilePath = `${filePath}.backup`;

    // Validate artifact before saving
    try {
      this.validator.validate(artifact);
      this.validateArtifactIntegrity(artifact, artifactId);
    } catch (error) {
      throw new ArtifactFileError(
        `Artifact validation failed before save: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'VALIDATION_ERROR',
        artifactId,
        filePath,
        error instanceof Error ? error : undefined,
      );
    }

    // Ensure directory exists
    const dir = dirname(filePath);
    try {
      mkdirSync(dir, { recursive: true });
    } catch (error) {
      throw new ArtifactFileError(
        `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DIRECTORY_ERROR',
        artifactId,
        filePath,
        error instanceof Error ? error : undefined,
      );
    }

    // Create backup if original file exists
    if (existsSync(filePath)) {
      try {
        const originalContent = readFileSync(filePath, 'utf-8');
        writeFileSync(backupFilePath, originalContent, 'utf-8');
      } catch (error) {
        throw new ArtifactFileError(
          `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'BACKUP_ERROR',
          artifactId,
          filePath,
          error instanceof Error ? error : undefined,
        );
      }
    }

    try {
      // Format the YAML content
      const { stringify } = await import('yaml');
      const yamlOptions = {
        lineWidth: -1, // Disable line wrapping
        quotingType: '"' as const, // Use double quotes
        forceQuotes: false, // Only quote when necessary
        indent: 2, // Use 2-space indentation
        flowLevel: -1, // Never use flow style
        sortKeys: false, // Preserve key order
        collectionStyle: 'block' as const, // Use block style for arrays/objects
        blockQuote: true, // Use block quotes for multiline strings
      };

      const content = stringify(artifact, yamlOptions);

      // Post-process to remove extra blank lines between array elements
      const cleanedContent = content
        .replace(/\n\n(\s*-\s)/g, '\n$1') // Remove blank lines before array items
        .replace(
          /\n\n(\s*(?:metadata|content|development_process|completion_analysis|review_details|notes):\s*$)/g,
          '\n$1',
        ); // Remove blank lines only before top-level section keys

      // Write to temporary file first (atomic operation)
      writeFileSync(tempFilePath, cleanedContent, 'utf-8');

      // Verify the written content can be parsed back correctly
      try {
        const verificationContent = readFileSync(tempFilePath, 'utf-8');
        const parts = artifactId.split('.');

        if (parts.length === 1) {
          this.parser.parseInitiative(verificationContent);
        } else if (parts.length === 2) {
          this.parser.parseMilestone(verificationContent);
        } else {
          this.parser.parseIssue(verificationContent);
        }
      } catch (error) {
        throw new ArtifactFileError(
          `Written content verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'VERIFICATION_ERROR',
          artifactId,
          filePath,
          error instanceof Error ? error : undefined,
        );
      }

      // Atomically move temp file to final location
      renameSync(tempFilePath, filePath);

      // Clean up backup on success
      if (existsSync(backupFilePath)) {
        try {
          const fs = await import('node:fs');
          fs.unlinkSync(backupFilePath);
        } catch (error) {
          // Backup cleanup failure is non-critical
          console.warn(
            `Warning: Could not clean up backup file ${backupFilePath}: ${error}`,
          );
        }
      }
    } catch (error) {
      // Clean up temporary file on error
      if (existsSync(tempFilePath)) {
        try {
          const fs = await import('node:fs');
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.warn(
            `Warning: Could not clean up temp file ${tempFilePath}: ${cleanupError}`,
          );
        }
      }

      // Restore from backup if available
      if (existsSync(backupFilePath)) {
        try {
          const backupContent = readFileSync(backupFilePath, 'utf-8');
          writeFileSync(filePath, backupContent, 'utf-8');
          console.log(`Restored artifact from backup: ${artifactId}`);
        } catch (restoreError) {
          console.error(
            `Critical: Failed to restore from backup: ${restoreError}`,
          );
        }
      }

      throw new ArtifactFileError(
        `Failed to save artifact: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SAVE_ERROR',
        artifactId,
        filePath,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Get artifact file path based on ID and repo path
   * Enhanced to handle nested artifacts and better validation
   */
  getArtifactFilePath(artifactId: string, repoPath: string): string {
    // Validate inputs
    if (!artifactId || typeof artifactId !== 'string') {
      throw new Error('Artifact ID must be a non-empty string');
    }

    if (!repoPath || typeof repoPath !== 'string') {
      throw new Error('Repository path must be a non-empty string');
    }

    // Validate artifact ID format
    if (!this.isValidArtifactId(artifactId)) {
      throw new Error(`Invalid artifact ID format: ${artifactId}`);
    }

    const parts = artifactId.split('.');
    const basePath = join(repoPath, '.kodebase/artifacts');

    if (parts.length === 1) {
      // Initiative: A -> A/A.yml
      return join(basePath, artifactId, `${artifactId}.yml`);
    } else if (parts.length === 2) {
      // Milestone: A.1 -> A/A.1/A.1.yml
      const [initiative] = parts;
      if (!initiative) throw new Error(`Invalid artifact ID: ${artifactId}`);
      return join(basePath, initiative, artifactId, `${artifactId}.yml`);
    } else {
      // Issue or nested artifact: A.1.5 -> A/A.1/A.1.5.yml
      // For nested: A.1.2.3.4 -> A/A.1/A.1.2.3.4.yml
      const [initiative, milestone] = parts;
      if (!initiative || !milestone)
        throw new Error(`Invalid artifact ID: ${artifactId}`);
      const milestoneId = `${initiative}.${milestone}`;
      return join(basePath, initiative, milestoneId, `${artifactId}.yml`);
    }
  }

  /**
   * Validate artifact ID format using the same pattern as BranchValidator
   */
  private isValidArtifactId(artifactId: string): boolean {
    const artifactPattern = /^[A-Z]+(\.[0-9]+)*$/;
    return artifactPattern.test(artifactId);
  }

  /**
   * Get git actor information formatted for @kodebase/core
   */
  async getGitActor(repoPath: string): Promise<string> {
    try {
      const name = execSync('git config user.name', {
        encoding: 'utf-8',
        cwd: repoPath,
      }).trim();
      const email = execSync('git config user.email', {
        encoding: 'utf-8',
        cwd: repoPath,
      }).trim();

      return formatActor(name, email);
    } catch (error) {
      throw new Error(`Failed to get git user info: ${error}`);
    }
  }

  /**
   * Check if artifact file exists
   */
  artifactExists(artifactId: string, repoPath: string): boolean {
    const filePath = this.getArtifactFilePath(artifactId, repoPath);
    return existsSync(filePath);
  }

  /**
   * Validate artifact integrity after loading/before saving
   */
  private validateArtifactIntegrity(
    artifact: Artifact,
    expectedArtifactId: string,
  ): void {
    // Validate basic structure
    if (!artifact.metadata) {
      throw new Error('Artifact missing metadata section');
    }

    if (!artifact.metadata.events || !Array.isArray(artifact.metadata.events)) {
      throw new Error('Artifact metadata must contain events array');
    }

    if (!artifact.content) {
      throw new Error('Artifact missing content section');
    }

    // Validate event structure (v2.0 schema)
    for (const [index, event] of artifact.metadata.events.entries()) {
      if (!event.timestamp || !event.event || !event.actor) {
        throw new Error(
          `Event at index ${index} missing required fields (timestamp, event, actor)`,
        );
      }

      if (!event.trigger) {
        throw new Error(`Event at index ${index} missing trigger`);
      }

      // Validate timestamp format
      if (Number.isNaN(Date.parse(event.timestamp))) {
        throw new Error(
          `Event at index ${index} has invalid timestamp format: ${event.timestamp}`,
        );
      }
    }

    // Validate events are chronologically ordered
    for (let i = 1; i < artifact.metadata.events.length; i++) {
      const currentEvent = artifact.metadata.events[i];
      const previousEvent = artifact.metadata.events[i - 1];

      if (!currentEvent || !previousEvent) {
        throw new Error(`Event at index ${i} or ${i - 1} is undefined`);
      }

      const currentTime = new Date(currentEvent.timestamp);
      const previousTime = new Date(previousEvent.timestamp);

      if (currentTime < previousTime) {
        throw new Error(
          `Events not in chronological order: event ${i} (${currentTime.toISOString()}) is before event ${i - 1} (${previousTime.toISOString()})`,
        );
      }
    }

    // Validate relationships structure
    if (artifact.metadata.relationships) {
      if (
        artifact.metadata.relationships.blocks &&
        !Array.isArray(artifact.metadata.relationships.blocks)
      ) {
        throw new Error('Artifact relationships.blocks must be an array');
      }

      if (
        artifact.metadata.relationships.blocked_by &&
        !Array.isArray(artifact.metadata.relationships.blocked_by)
      ) {
        throw new Error('Artifact relationships.blocked_by must be an array');
      }
    }

    // Validate artifact type-specific content
    const parts = expectedArtifactId.split('.');
    if (parts.length === 1) {
      // Initiative validation
      if (!('vision' in artifact.content)) {
        throw new Error('Initiative artifact missing vision in content');
      }
    } else if (parts.length === 2) {
      // Milestone validation
      if (!('deliverables' in artifact.content)) {
        throw new Error('Milestone artifact missing deliverables in content');
      }
    } else {
      // Issue validation
      if (!('acceptance_criteria' in artifact.content)) {
        throw new Error(
          'Issue artifact missing acceptance_criteria in content',
        );
      }

      if (!Array.isArray(artifact.content.acceptance_criteria)) {
        throw new Error('Issue acceptance_criteria must be an array');
      }
    }
  }

  /**
   * Safe artifact loading with retry logic for transient failures
   */
  async loadArtifactWithRetry(
    artifactId: string,
    repoPath: string,
    maxRetries: number = 3,
    delayMs: number = 100,
  ): Promise<Artifact> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.loadArtifact(artifactId, repoPath);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry certain error types
        if (error instanceof ArtifactFileError) {
          if (
            error.code === 'FILE_NOT_FOUND' ||
            error.code === 'VALIDATION_ERROR'
          ) {
            throw error;
          }
        }

        if (attempt < maxRetries) {
          const delay = delayMs * 2 ** (attempt - 1); // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Safe artifact saving with retry logic for transient failures
   */
  async saveArtifactWithRetry(
    artifact: Artifact,
    artifactId: string,
    repoPath: string,
    maxRetries: number = 3,
    delayMs: number = 100,
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.saveArtifact(artifact, artifactId, repoPath);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry certain error types
        if (error instanceof ArtifactFileError) {
          if (
            error.code === 'VALIDATION_ERROR' ||
            error.code === 'DIRECTORY_ERROR'
          ) {
            throw error;
          }
        }

        if (attempt < maxRetries) {
          const delay = delayMs * 2 ** (attempt - 1); // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }
}

/**
 * Custom error class for artifact file operations
 */
export class ArtifactFileError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'FILE_NOT_FOUND'
      | 'READ_ERROR'
      | 'WRITE_ERROR'
      | 'PARSE_ERROR'
      | 'VALIDATION_ERROR'
      | 'DIRECTORY_ERROR'
      | 'BACKUP_ERROR'
      | 'SAVE_ERROR'
      | 'VERIFICATION_ERROR',
    public readonly artifactId: string,
    public readonly filePath: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'ArtifactFileError';

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ArtifactFileError);
    }
  }

  /**
   * Get user-friendly error message with actionable guidance
   */
  getActionableMessage(): string {
    switch (this.code) {
      case 'FILE_NOT_FOUND':
        return `Artifact file not found: ${this.artifactId}. Check if the artifact exists or if the path is correct.`;
      case 'READ_ERROR':
        return `Cannot read artifact file: ${this.artifactId}. Check file permissions and disk space.`;
      case 'WRITE_ERROR':
      case 'SAVE_ERROR':
        return `Cannot write artifact file: ${this.artifactId}. Check file permissions, disk space, and that the directory is writable.`;
      case 'PARSE_ERROR':
        return `Invalid YAML format in artifact: ${this.artifactId}. The file may be corrupted or manually edited incorrectly.`;
      case 'VALIDATION_ERROR':
        return `Artifact validation failed: ${this.artifactId}. The artifact structure does not match the expected schema.`;
      case 'DIRECTORY_ERROR':
        return `Cannot create directory for artifact: ${this.artifactId}. Check parent directory permissions.`;
      case 'BACKUP_ERROR':
        return `Cannot create backup for artifact: ${this.artifactId}. Check disk space and file permissions.`;
      case 'VERIFICATION_ERROR':
        return `Written content verification failed for artifact: ${this.artifactId}. The saved file could not be parsed back correctly.`;
      default:
        return `Artifact operation failed: ${this.artifactId}. ${this.message}`;
    }
  }
}
