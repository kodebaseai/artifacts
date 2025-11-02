/**
 * Error formatting utilities for user-friendly error messages.
 *
 * Provides CLI-friendly error output, Zod error conversion, and generic error wrapping
 * with artifact context and actionable suggestions.
 */

import type {
  ValidationError,
  ValidationWarning,
} from "./validation-service.js";

/**
 * Custom error class with artifact context and suggested fixes.
 *
 * Extends native Error with additional fields for better error handling.
 */
export class ArtifactError extends Error {
  /** Error code identifying the type of error */
  readonly code: string;
  /** Artifact ID where the error occurred */
  readonly artifactId?: string;
  /** Field path where the error occurred (e.g., "metadata.title") */
  readonly field?: string;
  /** Actionable suggestion to fix the error */
  readonly suggestion?: string;

  constructor(options: {
    code: string;
    message: string;
    artifactId?: string;
    field?: string;
    suggestion?: string;
    cause?: Error;
  }) {
    super(options.message, { cause: options.cause });
    this.name = "ArtifactError";
    this.code = options.code;
    this.artifactId = options.artifactId;
    this.field = options.field;
    this.suggestion = options.suggestion;

    // Maintains proper stack trace for where our error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ArtifactError);
    }
  }

  /**
   * Format error as user-friendly string with all context.
   */
  toString(): string {
    const parts: string[] = [`${this.name}: ${this.message}`];

    if (this.artifactId) {
      parts.push(`  Artifact: ${this.artifactId}`);
    }

    if (this.field) {
      parts.push(`  Field: ${this.field}`);
    }

    if (this.suggestion) {
      parts.push(`  Suggestion: ${this.suggestion}`);
    }

    return parts.join("\n");
  }
}

/**
 * Options for formatting validation errors.
 */
export interface FormatValidationErrorsOptions {
  /** Include color output (requires terminal support) */
  useColors?: boolean;
  /** Include artifact ID in output */
  includeArtifactId?: boolean;
  /** Indent level for nested errors */
  indent?: string;
}

/**
 * Format validation errors as CLI-friendly output.
 *
 * Converts an array of ValidationError objects into a human-readable string
 * suitable for terminal output, with error codes, field paths, and suggestions.
 *
 * @param errors - Array of validation errors to format
 * @param artifactId - Optional artifact ID to include in output
 * @param options - Formatting options
 * @returns Formatted error string ready for CLI output
 *
 * @example
 * ```ts
 * const errors: ValidationError[] = [
 *   {
 *     code: "RELATIONSHIP_INVALID_ID",
 *     message: "'invalid' is not a valid artifact ID",
 *     field: "metadata.relationships.blocks[0]",
 *     suggestedFix: "Use valid artifact ID format (e.g., A, A.1, A.1.1)"
 *   }
 * ];
 *
 * const output = formatValidationErrors(errors, "A.1.1");
 * console.error(output);
 * // ❌ Validation failed for artifact A.1.1
 * //
 * //   RELATIONSHIP_INVALID_ID (metadata.relationships.blocks[0]):
 * //     'invalid' is not a valid artifact ID
 * //     💡 Fix: Use valid artifact ID format (e.g., A, A.1, A.1.1)
 * ```
 */
export function formatValidationErrors(
  errors: ValidationError[],
  artifactId?: string,
  options: FormatValidationErrorsOptions = {},
): string {
  const { indent = "  " } = options;

  if (errors.length === 0) {
    return "";
  }

  const lines: string[] = [];

  // Header
  if (artifactId) {
    lines.push(`❌ Validation failed for artifact ${artifactId}`);
  } else {
    lines.push("❌ Validation failed");
  }
  lines.push(""); // Empty line

  // Format each error
  for (const error of errors) {
    const fieldInfo = error.field ? ` (${error.field})` : "";
    lines.push(`${indent}${error.code}${fieldInfo}:`);
    lines.push(`${indent}${indent}${error.message}`);

    if (error.suggestedFix) {
      lines.push(`${indent}${indent}💡 Fix: ${error.suggestedFix}`);
    }

    lines.push(""); // Empty line between errors
  }

  return lines.join("\n");
}

/**
 * Format validation warnings as CLI-friendly output.
 *
 * Similar to formatValidationErrors but for non-blocking warnings.
 *
 * @param warnings - Array of validation warnings to format
 * @param artifactId - Optional artifact ID to include in output
 * @param options - Formatting options
 * @returns Formatted warning string ready for CLI output
 */
export function formatValidationWarnings(
  warnings: ValidationWarning[],
  artifactId?: string,
  options: FormatValidationErrorsOptions = {},
): string {
  const { indent = "  " } = options;

  if (warnings.length === 0) {
    return "";
  }

  const lines: string[] = [];

  // Header
  if (artifactId) {
    lines.push(`⚠️  Warnings for artifact ${artifactId}`);
  } else {
    lines.push("⚠️  Warnings");
  }
  lines.push(""); // Empty line

  // Format each warning
  for (const warning of warnings) {
    const fieldInfo = warning.field ? ` (${warning.field})` : "";
    lines.push(`${indent}${warning.code}${fieldInfo}:`);
    lines.push(`${indent}${indent}${warning.message}`);
    lines.push(""); // Empty line between warnings
  }

  return lines.join("\n");
}

/**
 * Zod-like error issue for schema validation.
 */
export interface SchemaErrorIssue {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Path to the field (array of strings) */
  path?: (string | number)[];
  /** Expected value/type */
  expected?: string;
  /** Received value/type */
  received?: string;
}

/**
 * Convert Zod schema error to ValidationError format.
 *
 * Extracts field paths, expected/received values, and creates actionable
 * error messages from Zod validation failures.
 *
 * @param issues - Array of Zod error issues
 * @param artifactId - Optional artifact ID for context
 * @returns Array of ValidationError objects
 *
 * @example
 * ```ts
 * const zodIssues = [
 *   {
 *     code: "invalid_type",
 *     message: "Expected string, received number",
 *     path: ["metadata", "title"],
 *     expected: "string",
 *     received: "number"
 *   }
 * ];
 *
 * const errors = formatSchemaError(zodIssues, "A.1.1");
 * // [{
 * //   code: "SCHEMA_ERROR",
 * //   message: "metadata.title: Expected string, received number",
 * //   field: "metadata.title",
 * //   suggestedFix: "Provide a valid string value"
 * // }]
 * ```
 */
export function formatSchemaError(
  issues: SchemaErrorIssue[],
  artifactId?: string,
): ValidationError[] {
  return issues.map((issue) => {
    const field = issue.path ? issue.path.join(".") : undefined;
    const fieldPrefix = field ? `${field}: ` : "";

    let message = `${fieldPrefix}${issue.message}`;

    // Add expected vs received if available
    if (issue.expected && issue.received) {
      message = `${fieldPrefix}Expected ${issue.expected}, received ${issue.received}`;
    }

    return {
      code: issue.code.toUpperCase() || "SCHEMA_ERROR",
      message,
      field,
      suggestedFix: suggestSchemaFix(issue, artifactId),
    };
  });
}

/**
 * Suggest fix for schema validation errors.
 */
function suggestSchemaFix(
  issue: SchemaErrorIssue,
  artifactId?: string,
): string | undefined {
  const code = issue.code.toLowerCase();
  const field = issue.path ? issue.path.join(".") : undefined;

  if (code.includes("required") || code.includes("missing")) {
    return field ? `Add required field ${field}` : "Add all required fields";
  }

  if (code.includes("invalid_type")) {
    if (issue.expected) {
      return `Provide a valid ${issue.expected} value`;
    }
    return "Provide a value of the correct type";
  }

  if (code.includes("invalid_enum")) {
    return issue.expected
      ? `Use one of: ${issue.expected}`
      : "Use a valid enum value";
  }

  if (code.includes("too_small")) {
    return "Provide more items or a larger value";
  }

  if (code.includes("too_big")) {
    return "Provide fewer items or a smaller value";
  }

  if (artifactId && field) {
    return `Check ${field} in artifact ${artifactId}`;
  }

  return undefined;
}

/**
 * Options for creating user-friendly errors.
 */
export interface CreateUserFriendlyErrorOptions {
  /** Error code to use */
  code?: string;
  /** Artifact ID for context */
  artifactId?: string;
  /** Field path for context */
  field?: string;
  /** Suggested fix */
  suggestion?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Create user-friendly error from any error object.
 *
 * Wraps unknown errors gracefully with artifact context and suggestions.
 * Prevents crashes from unexpected error types.
 *
 * @param error - Original error (can be any type)
 * @param options - Additional context and suggestions
 * @returns ArtifactError with user-friendly formatting
 *
 * @example
 * ```ts
 * try {
 *   await dangerousOperation();
 * } catch (error) {
 *   throw createUserFriendlyError(error, {
 *     code: "OPERATION_FAILED",
 *     artifactId: "A.1.1",
 *     suggestion: "Check file permissions and try again"
 *   });
 * }
 * ```
 */
export function createUserFriendlyError(
  error: unknown,
  options: CreateUserFriendlyErrorOptions = {},
): ArtifactError {
  const { code = "UNKNOWN_ERROR", artifactId, field, suggestion } = options;

  // Extract message from error
  let message = "An unexpected error occurred";
  let cause: Error | undefined;

  if (error instanceof Error) {
    message = error.message;
    cause = error;
  } else if (typeof error === "string") {
    message = error;
  } else if (error && typeof error === "object") {
    // Try to extract message from object
    const errorObj = error as Record<string, unknown>;
    if (typeof errorObj.message === "string") {
      message = errorObj.message;
    } else {
      message = JSON.stringify(error);
    }
  }

  return new ArtifactError({
    code,
    message,
    artifactId,
    field,
    suggestion,
    cause,
  });
}
