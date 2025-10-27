/**
 * Core validation engine for Kodebase artifacts
 *
 * This module provides the main entry point for artifact validation,
 * orchestrating schema validation, readiness checks, and dependency analysis.
 */

import type { ArtifactSchema } from '../data/schemas';
import type { ArtifactType } from '../data/types';
import { CArtifact } from '../data/types/constants';
import { ArtifactValidator } from '../data/validator';
import { ArtifactLoader } from '../loading/artifact-loader';
import { ArtifactFileService } from '../services/artifact-file-service';
import {
  ReadinessValidator,
  type ValidationError,
  type ValidationResult,
} from './readiness-validator';

/**
 * Options for validation
 */
export interface ValidationOptions {
  /** Check schema compliance */
  validateSchema?: boolean;
  /** Check readiness rules */
  validateReadiness?: boolean;
  /** Check for circular dependencies */
  validateDependencies?: boolean;
  /** Check for cross-level relationships */
  validateRelationships?: boolean;
  /** Attempt to fix fixable issues */
  fix?: boolean;
  /** Cache artifacts for performance */
  useCache?: boolean;
}

/**
 * Batch validation result
 */
export interface BatchValidationResult {
  totalArtifacts: number;
  validArtifacts: number;
  invalidArtifacts: number;
  errors: ValidationError[];
  results: ValidationResult[];
  duration: number;
}

/**
 * Fix result for auto-repair
 */
export interface FixResult {
  artifactId: string;
  fixesApplied: string[];
  success: boolean;
  error?: string;
}

/**
 * Main validation engine
 */
export class ValidationEngine {
  private schemaValidator: ArtifactValidator;
  private readinessValidator: ReadinessValidator;
  private artifactLoader: ArtifactLoader;
  /** @deprecated - use artifactLoader directly. Retained for backward compatibility with tests */
  public loader: ArtifactLoader;
  private fileService: ArtifactFileService;
  private artifactCache: Map<string, ArtifactSchema> = new Map();

  constructor() {
    this.schemaValidator = new ArtifactValidator();
    this.readinessValidator = new ReadinessValidator();
    this.artifactLoader = new ArtifactLoader();
    // Alias for backward compatibility
    this.loader = this.artifactLoader;
    this.fileService = new ArtifactFileService();
  }

  /**
   * Validate a single artifact
   */
  async validateArtifact(
    artifactPath: string,
    options: ValidationOptions = {},
  ): Promise<ValidationResult> {
    const defaultOptions: ValidationOptions = {
      validateSchema: true,
      validateReadiness: true,
      validateDependencies: false,
      validateRelationships: false,
      fix: false,
      useCache: true,
      ...options,
    };

    try {
      const artifactId = this.extractArtifactId(artifactPath);

      // Load the artifact, preferring cache when available
      let artifactData: unknown;
      if (defaultOptions.useCache && this.artifactCache.has(artifactId)) {
        artifactData = this.artifactCache.get(artifactId);
      } else {
        artifactData = await this.fileService.readArtifact(artifactPath);
      }

      const errors: ValidationError[] = [];

      // Schema validation
      if (defaultOptions.validateSchema) {
        try {
          const validated = this.schemaValidator.validate(artifactData);

          // Cache the validated artifact
          if (defaultOptions.useCache) {
            this.artifactCache.set(artifactId, validated);
          }
        } catch (error) {
          // Treat any validation error as schema validation failure
          errors.push({
            code: 'SCHEMA_VALIDATION_FAILED',
            message:
              error instanceof Error
                ? error.message
                : 'Schema validation failed',
            fixable: false,
          });
        }
      }

      // If schema validation failed, we can't proceed with other validations
      if (errors.length > 0) {
        return {
          artifactId,
          artifactType: this.getArtifactTypeFromId(artifactId),
          isValid: false,
          errors,
        };
      }

      // Get all artifacts for dependency validation
      let allArtifacts: Map<string, ArtifactSchema> | undefined;
      if (
        defaultOptions.validateDependencies ||
        defaultOptions.validateRelationships
      ) {
        allArtifacts = await this.loadAllArtifacts(
          defaultOptions.useCache ?? true,
        );
      }

      // Readiness validation
      if (defaultOptions.validateReadiness) {
        const artifact =
          this.artifactCache.get(artifactId) ||
          this.schemaValidator.validate(artifactData);

        let readinessResult: ValidationResult;

        if (this.readinessValidator.isIssue(artifact)) {
          readinessResult = this.readinessValidator.validateIssueReadiness(
            artifact,
            artifactId,
            allArtifacts,
          );
        } else if (this.readinessValidator.isMilestone(artifact)) {
          readinessResult = this.readinessValidator.validateMilestoneReadiness(
            artifact,
            artifactId,
            allArtifacts,
          );
        } else if (this.readinessValidator.isInitiative(artifact)) {
          readinessResult = this.readinessValidator.validateInitiativeReadiness(
            artifact,
            artifactId,
            allArtifacts,
          );
        } else {
          throw new Error('Unknown artifact type');
        }

        errors.push(...readinessResult.errors);
      }

      return {
        artifactId,
        artifactType: this.getArtifactTypeFromId(artifactId),
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        artifactId: this.extractArtifactId(artifactPath),
        artifactType: this.getArtifactTypeFromId(
          this.extractArtifactId(artifactPath),
        ),
        isValid: false,
        errors: [
          {
            code: 'VALIDATION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            fixable: false,
          },
        ],
      };
    }
  }

  /**
   * Validate all artifacts in the repository
   */
  async validateAll(
    options: ValidationOptions = {},
  ): Promise<BatchValidationResult> {
    const startTime = Date.now();
    const defaultOptions: ValidationOptions = {
      validateSchema: true,
      validateReadiness: true,
      validateDependencies: true,
      validateRelationships: false,
      useCache: true,
      ...options,
    };
    const results: ValidationResult[] = [];
    const errors: ValidationError[] = [];

    try {
      // Load all artifacts
      const allArtifacts = await this.loadAllArtifacts(
        defaultOptions.useCache ?? true,
      );

      // Validate based on actual file paths to ensure invalid artifacts are counted
      const allPaths = await this.loader.loadAllArtifactPaths();
      for (const artifactPath of allPaths) {
        const result = await this.validateArtifact(
          artifactPath,
          defaultOptions,
        );
        results.push(result);
      }

      // Global validations (dependencies, relationships)
      if (defaultOptions.validateDependencies && allArtifacts.size > 0) {
        const depErrors = this.readinessValidator.detectCircularDependencies(
          new Map([...allArtifacts].filter(([, art]) => art)),
        );
        if (depErrors.length > 0) {
          errors.push({
            artifactId: 'system',
            issues: depErrors,
          } as unknown as ValidationError);
        }
      }

      if (defaultOptions.validateRelationships && allArtifacts.size > 0) {
        const relErrors = this.readinessValidator.detectCrossLevelRelationships(
          new Map([...allArtifacts].filter(([, art]) => art)),
        );
        errors.push(...relErrors);
      }

      const validCount = results.filter((r) => r.isValid).length;
      const invalidCount = results.filter((r) => !r.isValid).length;

      return {
        totalArtifacts: results.length,
        validArtifacts: validCount,
        invalidArtifacts: invalidCount,
        errors,
        results,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        totalArtifacts: 0,
        validArtifacts: 0,
        invalidArtifacts: 0,
        errors: [
          {
            code: 'BATCH_VALIDATION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            fixable: false,
          },
        ],
        results,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Apply fixes to fixable validation errors
   */
  async applyFixes(
    artifactPath: string,
    errors: ValidationError[],
  ): Promise<FixResult> {
    const artifactId = this.extractArtifactId(artifactPath);
    const fixesApplied: string[] = [];

    try {
      const fixableErrors = errors.filter((e) => e.fixable);

      if (fixableErrors.length === 0) {
        return {
          artifactId,
          fixesApplied: [],
          success: true,
        };
      }

      // Load the artifact
      let artifactData = await this.fileService.readArtifact(artifactPath);

      // Apply fixes based on error codes
      for (const error of fixableErrors) {
        switch (error.code) {
          case 'UNSORTED_FIELDS':
            // Sort fields alphabetically
            artifactData = this.sortObjectFields(artifactData);
            fixesApplied.push('Sorted fields alphabetically');
            break;

          case 'TRAILING_WHITESPACE':
            // Remove trailing whitespace
            artifactData = this.removeTrailingWhitespace(artifactData);
            fixesApplied.push('Removed trailing whitespace');
            break;

          // Add more fixable error handlers as needed
        }
      }

      // Save the fixed artifact
      await this.fileService.writeArtifact(artifactPath, artifactData);

      return {
        artifactId,
        fixesApplied,
        success: true,
      };
    } catch (error) {
      return {
        artifactId,
        fixesApplied,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Load all artifacts with caching
   */
  private async loadAllArtifacts(
    useCache: boolean,
  ): Promise<Map<string, ArtifactSchema>> {
    if (useCache && this.artifactCache.size > 0) {
      return this.artifactCache;
    }

    const artifacts = new Map<string, ArtifactSchema>();
    // Use a fresh loader to respect the current working directory at call time
    let artifactPaths: string[] = [];
    try {
      artifactPaths = await this.loader.loadAllArtifactPaths();
    } catch {
      /* ignore errors from mocked loader */
    }
    if (artifactPaths.length === 0) {
      artifactPaths = await new ArtifactLoader().loadAllArtifactPaths();
    }

    for (const path of artifactPaths) {
      try {
        const id = this.extractArtifactId(path);

        if (useCache && this.artifactCache.has(id)) {
          artifacts.set(id, this.artifactCache.get(id)!);
          continue;
        }

        const data = await this.fileService.readArtifact(path);
        const validated = this.schemaValidator.validate(data);
        artifacts.set(id, validated);

        if (useCache) {
          this.artifactCache.set(id, validated);
        }
      } catch (_error) {
        // Skip invalid artifacts during loading
        // Don't store them in the artifacts map as they can't be used for dependency checking
        // They will still be validated individually in validateAll
      }
    }

    return artifacts;
  }

  /**
   * Extract artifact ID from file path
   */
  private extractArtifactId(path: string): string {
    const match = path.match(/([A-Z](?:\.\d+)+)\.yml$/);
    return match?.[1] ? match[1] : 'unknown';
  }

  /**
   * Get artifact type from ID
   */
  private getArtifactTypeFromId(id: string): ArtifactType {
    const parts = id.split('.');
    if (parts.length === 1) return CArtifact.INITIATIVE;
    if (parts.length === 2) return CArtifact.MILESTONE;
    return CArtifact.ISSUE;
  }

  /**
   * Get artifact file path from ID
   */
  private async getArtifactPath(artifactId: string): Promise<string> {
    // Use a fresh loader to respect the current working directory at call time
    let paths: string[] = [];
    try {
      paths = await this.loader.loadAllArtifactPaths();
    } catch {
      /* ignore */
    }
    if (paths.length === 0) {
      paths = await new ArtifactLoader().loadAllArtifactPaths();
    }
    const path = paths.find((p) => p.includes(`${artifactId}.yml`));

    if (!path) {
      throw new Error(`Artifact path not found for ID: ${artifactId}`);
    }

    return path;
  }

  /**
   * Sort object fields alphabetically
   */
  private sortObjectFields(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObjectFields(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const sorted: Record<string, unknown> = {};
      const objRecord = obj as Record<string, unknown>;
      const keys = Object.keys(objRecord).sort();

      for (const key of keys) {
        sorted[key] = this.sortObjectFields(objRecord[key]);
      }

      return sorted;
    }

    return obj;
  }

  /**
   * Remove trailing whitespace from strings
   */
  private removeTrailingWhitespace(obj: unknown): unknown {
    if (typeof obj === 'string') {
      return obj.trimEnd();
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.removeTrailingWhitespace(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const cleaned: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(obj)) {
        cleaned[key] = this.removeTrailingWhitespace(value);
      }

      return cleaned;
    }

    return obj;
  }
}
