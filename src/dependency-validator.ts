/**
 * Standalone dependency validation for artifacts.
 *
 * Validates dependency references, bidirectional consistency, and circular dependencies.
 * Can validate a single artifact or all artifacts in the workspace.
 *
 * @module dependency-validator
 */

import type { TAnyArtifact } from "@kodebase/core";
import { ArtifactValidator } from "@kodebase/core";

/**
 * Dependency validation error with artifact context.
 */
export interface DependencyValidationError {
  /** Error code identifying the type of validation failure */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Artifact ID where the error occurred */
  artifactId?: string;
  /** Referenced artifact ID that caused the error */
  referencedId?: string;
  /** Suggested fix or action to resolve the error */
  suggestedFix?: string;
}

/**
 * Result of dependency validation.
 */
export interface DependencyValidationResult {
  /** Whether all dependencies are valid */
  valid: boolean;
  /** Array of dependency validation errors */
  errors: DependencyValidationError[];
}

/**
 * Options for dependency validation.
 */
export interface ValidateDependenciesOptions {
  /** Artifact ID for context in error messages */
  artifactId?: string;
  /** Whether to check for circular dependencies (default: true) */
  checkCircular?: boolean;
  /** Whether to check cross-level dependencies (default: true) */
  checkCrossLevel?: boolean;
  /** Whether to check relationship consistency (default: true) */
  checkConsistency?: boolean;
}

/**
 * Validates artifact dependency references and consistency.
 *
 * Performs comprehensive dependency validation including:
 * - All referenced artifacts exist (no orphaned refs)
 * - Bidirectional consistency (if A blocks B, then B lists A in blocked_by)
 * - Circular dependency detection (A blocks B blocks A)
 * - Cross-level dependency detection (milestone blocking issue)
 * - Parent-child relationship consistency
 *
 * @param artifact - Single artifact to validate, or map of all artifacts
 * @param allArtifacts - Map of all artifacts in workspace (for reference validation)
 * @param options - Validation options
 * @returns Validation result with structured errors
 *
 * @example
 * ```ts
 * import { validateDependencies } from "@kodebase/artifacts";
 *
 * // Validate single artifact against all artifacts
 * const result = await validateDependencies(artifact, allArtifactsMap, {
 *   artifactId: "A.1.1"
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
 *
 * // Validate all artifacts (for pre-commit hook)
 * const allResult = await validateDependencies(allArtifactsMap);
 * ```
 */
export function validateDependencies(
  artifact: TAnyArtifact | Map<string, TAnyArtifact>,
  allArtifacts?: Map<string, TAnyArtifact>,
  options: ValidateDependenciesOptions = {},
): DependencyValidationResult {
  const errors: DependencyValidationError[] = [];
  const {
    checkCircular = true,
    checkCrossLevel = true,
    checkConsistency = true,
  } = options;

  // If artifact is a Map, validate all artifacts
  // If artifact is a single artifact, validate it against allArtifacts
  const artifactsToValidate =
    artifact instanceof Map ? artifact : (allArtifacts ?? new Map());

  if (artifactsToValidate.size === 0) {
    return {
      valid: true,
      errors: [],
    };
  }

  // Check circular dependencies
  if (checkCircular) {
    const circularIssues =
      ArtifactValidator.detectCircularDependencies(artifactsToValidate);
    errors.push(...formatCircularDependencyErrors(circularIssues));
  }

  // Check cross-level dependencies
  if (checkCrossLevel) {
    const crossLevelIssues =
      ArtifactValidator.detectCrossLevelDependencies(artifactsToValidate);
    errors.push(...formatCrossLevelDependencyErrors(crossLevelIssues));
  }

  // Check relationship consistency
  if (checkConsistency) {
    const consistencyIssues =
      ArtifactValidator.validateRelationshipConsistency(artifactsToValidate);
    errors.push(...formatRelationshipConsistencyErrors(consistencyIssues));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format circular dependency issues into user-friendly errors.
 *
 * @private
 */
function formatCircularDependencyErrors(
  issues: ReturnType<typeof ArtifactValidator.detectCircularDependencies>,
): DependencyValidationError[] {
  return issues.map((issue) => ({
    code: "CIRCULAR_DEPENDENCY",
    message: issue.message,
    artifactId: issue.cycle[0],
    suggestedFix: "Remove one of the blocking relationships to break the cycle",
  }));
}

/**
 * Format cross-level dependency issues into user-friendly errors.
 *
 * @private
 */
function formatCrossLevelDependencyErrors(
  issues: ReturnType<typeof ArtifactValidator.detectCrossLevelDependencies>,
): DependencyValidationError[] {
  return issues.map((issue) => ({
    code: "CROSS_LEVEL_DEPENDENCY",
    message: `${issue.sourceType} ${issue.sourceId} depends on ${issue.dependencyType} ${issue.dependencyId}`,
    artifactId: issue.sourceId,
    referencedId: issue.dependencyId,
    suggestedFix: `Only reference artifacts of the same type (${issue.sourceType}s should only depend on other ${issue.sourceType}s)`,
  }));
}

/**
 * Format relationship consistency issues into user-friendly errors.
 *
 * @private
 */
function formatRelationshipConsistencyErrors(
  issues: ReturnType<typeof ArtifactValidator.validateRelationshipConsistency>,
): DependencyValidationError[] {
  return issues.map((issue) => {
    if (issue.code === "RELATIONSHIP_UNKNOWN_ARTIFACT") {
      // Parse message: "'A.1.999' referenced by A.1.1 was not found."
      const match = issue.message.match(/'([^']+)' referenced by ([^ ]+)/);
      const referencedId = match?.[1];
      const artifactId = match?.[2];

      return {
        code: "UNKNOWN_ARTIFACT_REFERENCE",
        message: issue.message,
        artifactId,
        referencedId,
        suggestedFix: referencedId
          ? `Verify that artifact ${referencedId} exists or remove the reference`
          : "Verify the artifact reference is correct",
      };
    }

    // RELATIONSHIP_INCONSISTENT_PAIR
    // Parse message: "'A.1.1' lists 'A.1.2' in blocks but the reciprocal blocked_by entry is missing."
    const match = issue.message.match(/'([^']+)' lists '([^']+)' in (\w+)/);
    const artifactId = match?.[1];
    const referencedId = match?.[2];
    const field = match?.[3];

    return {
      code: "INCONSISTENT_RELATIONSHIP",
      message: issue.message,
      artifactId,
      referencedId,
      suggestedFix:
        field && artifactId && referencedId
          ? `Ensure ${field}/${field === "blocks" ? "blocked_by" : "blocks"} relationship is bidirectional between ${artifactId} and ${referencedId}`
          : "Ensure relationship is bidirectional",
    };
  });
}
