/**
 * ValidationService orchestrates all core validators into a unified validation pipeline.
 *
 * Combines schema validation, dependency validation, and state machine validation
 * into a single service with aggregated results.
 */

import {
  type ArtifactValidationError,
  type ArtifactValidationIssue,
  ArtifactValidator,
  assertTransition,
  type CircularDependencyIssue,
  type CrossLevelDependencyIssue,
  type RelationshipConsistencyIssue,
  type StateTransitionError,
  type TAnyArtifact,
  type TArtifactType,
} from "@kodebase/core";

/**
 * Aggregated validation result with errors and warnings from all validators.
 */
export interface ValidationResult {
  /** Artifact ID being validated */
  artifactId: string;
  /** Whether the artifact passed all validations */
  valid: boolean;
  /** Array of validation errors with context */
  errors: ValidationError[];
  /** Array of non-blocking warnings */
  warnings: ValidationWarning[];
}

/**
 * Validation error with artifact context and suggested fix.
 */
export interface ValidationError {
  /** Error code identifying the type of validation failure */
  code: string;
  /** Human-readable error message */
  message: string;
  /** JSON path to the field causing the error (e.g., "metadata.relationships.blocks[0]") */
  field?: string;
  /** Suggested fix or action to resolve the error */
  suggestedFix?: string;
}

/**
 * Non-blocking validation warning.
 */
export interface ValidationWarning {
  /** Warning code */
  code: string;
  /** Human-readable warning message */
  message: string;
  /** JSON path to the field */
  field?: string;
}

/**
 * Options for validateArtifact operation.
 */
export interface ValidateArtifactOptions {
  /** Artifact ID for relationship validation */
  artifactId: string;
  /** Optional collection of all artifacts for dependency validation */
  allArtifacts?: Map<string, TAnyArtifact>;
  /** Optional current state to validate against next state transition */
  currentState?: string;
  /** Optional next state to validate state machine transition */
  nextState?: string;
}

/**
 * Options for batch validation operation.
 */
export interface ValidateAllOptions {
  /** Map of artifact IDs to artifact data */
  artifacts: Map<string, TAnyArtifact>;
}

/**
 * ValidationService orchestrates schema, dependency, and state machine validators.
 *
 * Provides unified validation pipeline with aggregated error reporting.
 */
export class ValidationService {
  /**
   * Validate a single artifact through all validators.
   *
   * Runs validations in order:
   * 1. Schema validation (Zod schemas for initiative/milestone/issue)
   * 2. Dependency validation (circular, cross-level, consistency)
   * 3. State machine validation (valid transitions)
   *
   * @param artifact - The artifact to validate
   * @param options - Validation options including artifact ID and optional context
   * @returns Aggregated validation result with errors and warnings
   *
   * @example
   * ```ts
   * const service = new ValidationService();
   * const result = service.validateArtifact(artifact, {
   *   artifactId: "A.1.1",
   *   allArtifacts: artifactsMap,
   * });
   *
   * if (!result.valid) {
   *   result.errors.forEach(err => {
   *     console.error(`${err.code}: ${err.message}`);
   *     if (err.suggestedFix) {
   *       console.log(`  Fix: ${err.suggestedFix}`);
   *     }
   *   });
   * }
   * ```
   */
  validateArtifact(
    artifact: TAnyArtifact,
    options: ValidateArtifactOptions,
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Infer artifact type from ID to avoid content-based detection errors
    const expectedType = this.getArtifactTypeFromId(options.artifactId);

    // 1. Schema validation
    try {
      ArtifactValidator.validateArtifact(artifact, expectedType, {
        artifactId: options.artifactId,
      });
    } catch (error) {
      if (this.isArtifactValidationError(error)) {
        errors.push(...this.formatSchemaErrors(error, options.artifactId));
      } else {
        throw error;
      }
    }

    // 2. Dependency validation (only if we have all artifacts)
    if (options.allArtifacts) {
      errors.push(
        ...this.validateDependencies(
          options.artifactId,
          artifact,
          options.allArtifacts,
        ),
      );
    }

    // 3. State machine validation (only if current and next states provided)
    if (options.currentState && options.nextState) {
      try {
        errors.push(
          ...this.validateStateTransition(
            artifact,
            options.currentState,
            options.nextState,
          ),
        );
      } catch (error) {
        if (this.isStateTransitionError(error)) {
          errors.push(this.formatStateTransitionError(error));
        } else {
          throw error;
        }
      }
    }

    return {
      artifactId: options.artifactId,
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate multiple artifacts with batch optimization.
   *
   * Reuses artifact tree loading to avoid redundant disk I/O.
   * Validates all artifacts and returns aggregated results.
   *
   * @param options - Batch validation options with artifacts map
   * @returns Array of validation results, one per artifact
   *
   * @example
   * ```ts
   * const service = new ValidationService();
   * const results = service.validateAll({
   *   artifacts: new Map([
   *     ["A.1", artifactA1],
   *     ["A.2", artifactA2],
   *   ]),
   * });
   *
   * const failed = results.filter(r => !r.valid);
   * console.log(`${failed.length} artifacts failed validation`);
   * ```
   */
  validateAll(options: ValidateAllOptions): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Batch optimization: reuse artifacts map for all dependency validations
    for (const [artifactId, artifact] of options.artifacts) {
      results.push(
        this.validateArtifact(artifact, {
          artifactId,
          allArtifacts: options.artifacts,
        }),
      );
    }

    return results;
  }

  /**
   * Infer artifact type from ID format.
   *
   * @private
   */
  private getArtifactTypeFromId(id: string): TArtifactType {
    const segments = id.split(".");
    if (segments.length === 1) {
      return "initiative";
    }
    if (segments.length === 2) {
      return "milestone";
    }
    return "issue";
  }

  /**
   * Validate dependency relationships for an artifact.
   *
   * Checks:
   * - Circular dependencies
   * - Cross-level dependencies
   * - Relationship consistency (bidirectional)
   *
   * @private
   */
  private validateDependencies(
    _artifactId: string,
    _artifact: TAnyArtifact,
    allArtifacts: Map<string, TAnyArtifact>,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check circular dependencies
    const circularIssues =
      ArtifactValidator.detectCircularDependencies(allArtifacts);
    errors.push(...this.formatCircularDependencyErrors(circularIssues));

    // Check cross-level dependencies
    const crossLevelIssues =
      ArtifactValidator.detectCrossLevelDependencies(allArtifacts);
    errors.push(...this.formatCrossLevelDependencyErrors(crossLevelIssues));

    // Check relationship consistency
    const consistencyIssues =
      ArtifactValidator.validateRelationshipConsistency(allArtifacts);
    errors.push(...this.formatRelationshipConsistencyErrors(consistencyIssues));

    return errors;
  }

  /**
   * Validate state machine transition.
   *
   * @private
   */
  private validateStateTransition(
    artifact: TAnyArtifact,
    currentState: string,
    nextState: string,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Infer artifact type from content structure
    const type = ArtifactValidator.getArtifactType(artifact);

    // Validate transition using state machine
    try {
      assertTransition(type, currentState as never, nextState as never);
    } catch (error) {
      if (this.isStateTransitionError(error)) {
        errors.push(this.formatStateTransitionError(error));
      } else {
        throw error;
      }
    }

    return errors;
  }

  /**
   * Format schema validation errors with context.
   *
   * @private
   */
  private formatSchemaErrors(
    error: ArtifactValidationError,
    artifactId: string,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (error.issues) {
      for (const issue of error.issues) {
        errors.push({
          code: issue.code ?? "SCHEMA_ERROR",
          message: issue.message,
          field: issue.path ?? undefined,
          suggestedFix: this.suggestSchemaFix(issue),
        });
      }
    } else {
      errors.push({
        code: error.kind,
        message: error.message,
        suggestedFix: `Verify artifact ${artifactId} structure matches expected schema`,
      });
    }

    return errors;
  }

  /**
   * Suggest fixes for schema validation errors.
   *
   * @private
   */
  private suggestSchemaFix(issue: ArtifactValidationIssue): string | undefined {
    // Extract field name from path
    const field = issue.path?.split(".").pop();
    const code = issue.code ?? "";

    if (code.includes("MISSING")) {
      return `Add required field ${field ?? "to artifact"}`;
    }

    if (code.includes("INVALID_ID")) {
      return "Use valid artifact ID format (e.g., A, A.1, A.1.1)";
    }

    if (code.includes("WRONG_TYPE")) {
      return issue.message.includes("initiative")
        ? "Reference an initiative ID (e.g., A, B)"
        : issue.message.includes("milestone")
          ? "Reference a milestone ID (e.g., A.1, B.2)"
          : "Reference an issue ID (e.g., A.1.1, B.2.3)";
    }

    if (code.includes("DIFFERENT_INITIATIVE")) {
      return "Only reference artifacts within the same initiative";
    }

    if (code.includes("DIFFERENT_MILESTONE")) {
      return "Only reference issues within the same milestone";
    }

    return undefined;
  }

  /**
   * Format circular dependency errors with artifact context.
   *
   * @private
   */
  private formatCircularDependencyErrors(
    issues: CircularDependencyIssue[],
  ): ValidationError[] {
    return issues.map((issue) => ({
      code: issue.code,
      message: issue.message,
      field: "metadata.relationships.blocked_by",
      suggestedFix: `Break the circular dependency chain: ${issue.cycle.join(" → ")}`,
    }));
  }

  /**
   * Format cross-level dependency errors with artifact context.
   *
   * @private
   */
  private formatCrossLevelDependencyErrors(
    issues: CrossLevelDependencyIssue[],
  ): ValidationError[] {
    return issues.map((issue) => ({
      code: issue.code,
      message: issue.message,
      field: "metadata.relationships.blocked_by",
      suggestedFix: `Only reference ${issue.sourceType} artifacts (not ${issue.dependencyType})`,
    }));
  }

  /**
   * Format relationship consistency errors with artifact context.
   *
   * @private
   */
  private formatRelationshipConsistencyErrors(
    issues: RelationshipConsistencyIssue[],
  ): ValidationError[] {
    return issues.map((issue) => ({
      code: issue.code,
      message: issue.message,
      field: issue.path,
      suggestedFix:
        issue.code === "RELATIONSHIP_UNKNOWN_ARTIFACT"
          ? "Ensure the referenced artifact exists"
          : "Add the reciprocal relationship entry",
    }));
  }

  /**
   * Format state transition error with valid transitions.
   *
   * @private
   */
  private formatStateTransitionError(
    error: StateTransitionError,
  ): ValidationError {
    return {
      code: "INVALID_STATE_TRANSITION",
      message: error.message,
      field: "metadata.events",
      suggestedFix:
        error.validTransitions.length > 0
          ? `Valid transitions from ${error.fromState}: ${error.validTransitions.join(", ")}`
          : `${error.fromState} is a terminal state (no further transitions allowed)`,
    };
  }

  /**
   * Type guard for ArtifactValidationError.
   *
   * @private
   */
  private isArtifactValidationError(
    error: unknown,
  ): error is ArtifactValidationError {
    return (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "ArtifactValidationError"
    );
  }

  /**
   * Type guard for StateTransitionError.
   *
   * @private
   */
  private isStateTransitionError(
    error: unknown,
  ): error is StateTransitionError {
    return (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "StateTransitionError"
    );
  }
}
