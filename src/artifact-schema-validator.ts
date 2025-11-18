/**
 * Artifact schema validation with YAML line number tracking.
 *
 * Validates artifact YAML files against Zod schemas with enhanced error reporting
 * that includes line numbers from the source YAML file.
 *
 * @module artifact-schema-validator
 */

import fs from "node:fs/promises";
import type { TAnyArtifact } from "@kodebase/core";
import { ARTIFACT_EVENTS, ArtifactValidator, CArtifact } from "@kodebase/core";
import type { Document, ParsedNode } from "yaml";
import yaml, { LineCounter } from "yaml";

/**
 * Validation error with line number information from source YAML.
 */
export interface SchemaValidationError {
  /** Error code identifying the type of validation failure */
  code: string;
  /** Human-readable error message */
  message: string;
  /** JSON path to the field causing the error (e.g., "metadata.title") */
  field?: string;
  /** Line number in the YAML file where the error occurred */
  line?: number;
  /** Column number in the YAML file where the error occurred */
  column?: number;
  /** Suggested fix or action to resolve the error */
  suggestedFix?: string;
}

/**
 * Result of artifact schema validation.
 */
export interface SchemaValidationResult {
  /** Whether the artifact passed all validations */
  valid: boolean;
  /** Array of validation errors with line numbers */
  errors: SchemaValidationError[];
  /** The parsed artifact data (if parsing succeeded) */
  artifact?: TAnyArtifact;
}

/**
 * Options for artifact schema validation.
 */
export interface ArtifactSchemaValidationOptions {
  /** Artifact ID for context in error messages */
  artifactId?: string;
  /** Whether to validate event chronology (default: true) */
  validateEventOrder?: boolean;
  /** Whether to validate relationships are arrays (default: true) */
  validateRelationships?: boolean;
}

/**
 * Validates an artifact YAML file against the schema with line number tracking.
 *
 * Performs comprehensive validation including:
 * - Required fields (metadata.title, metadata.priority, content.summary)
 * - Valid state values from allowed event types
 * - Event history integrity (chronological order, valid event types)
 * - Relationship validation (blocks/blocked_by are arrays)
 * - Schema version compatibility check
 *
 * @param artifactPath - Absolute path to the artifact YAML file
 * @param options - Validation options
 * @returns Validation result with structured errors including line numbers
 *
 * @example
 * ```ts
 * import { validateArtifact } from "@kodebase/artifacts";
 *
 * const result = await validateArtifact(".kodebase/artifacts/A/A.1/A.1.1.yml", {
 *   artifactId: "A.1.1"
 * });
 *
 * if (!result.valid) {
 *   result.errors.forEach(err => {
 *     console.error(`Line ${err.line}: ${err.message}`);
 *     if (err.suggestedFix) {
 *       console.log(`  Fix: ${err.suggestedFix}`);
 *     }
 *   });
 * }
 * ```
 */
export async function validateArtifact(
  artifactPath: string,
  options: ArtifactSchemaValidationOptions = {},
): Promise<SchemaValidationResult> {
  const errors: SchemaValidationError[] = [];
  const {
    artifactId,
    validateEventOrder = true,
    validateRelationships = true,
  } = options;

  try {
    // Read YAML file content
    const content = await fs.readFile(artifactPath, "utf8");

    // Parse YAML with position tracking
    const doc = yaml.parseDocument(content, {
      keepSourceTokens: true,
      strict: true,
    });

    // Check for YAML syntax errors
    if (doc.errors.length > 0) {
      for (const error of doc.errors) {
        errors.push({
          code: "YAML_SYNTAX_ERROR",
          message: error.message,
          line: error.linePos?.[0].line,
          column: error.linePos?.[0].col,
          suggestedFix: "Fix YAML syntax errors",
        });
      }
      return { valid: false, errors };
    }

    // Convert to JavaScript object
    const artifact = doc.toJS() as TAnyArtifact;

    // Create LineCounter once for performance
    const lineCounter = createLineCounter(doc);

    // Validate against Zod schema
    try {
      ArtifactValidator.validateArtifact(artifact, undefined, { artifactId });
    } catch (error) {
      if (isArtifactValidationError(error)) {
        errors.push(
          ...formatSchemaErrors(
            error,
            doc,
            lineCounter,
            artifactId ?? artifactPath,
          ),
        );
      } else {
        throw error;
      }
    }

    // Additional validation: Event history chronology
    // Only run if no schema errors to avoid duplicate/confusing errors
    if (
      errors.length === 0 &&
      validateEventOrder &&
      artifact.metadata?.events
    ) {
      errors.push(...validateEventChronology(artifact, doc, lineCounter));
    }

    // Additional validation: Relationships are arrays
    if (
      errors.length === 0 &&
      validateRelationships &&
      artifact.metadata?.relationships
    ) {
      errors.push(...validateRelationshipArrays(artifact, doc, lineCounter));
    }

    // Additional validation: Schema version compatibility
    if (errors.length === 0 && artifact.metadata?.schema_version) {
      errors.push(...validateSchemaVersion(artifact, doc, lineCounter));
    }

    return {
      valid: errors.length === 0,
      errors,
      artifact,
    };
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return {
        valid: false,
        errors: [
          {
            code: "FILE_NOT_FOUND",
            message: `Artifact file not found: ${artifactPath}`,
            suggestedFix: "Verify the file path is correct",
          },
        ],
      };
    }

    // Unexpected error
    return {
      valid: false,
      errors: [
        {
          code: "VALIDATION_ERROR",
          message: `Unexpected validation error: ${(error as Error).message}`,
        },
      ],
    };
  }
}

/**
 * Validates that events are in chronological order.
 *
 * @private
 */
function validateEventChronology(
  artifact: TAnyArtifact,
  doc: Document.Parsed,
  lineCounter: LineCounter,
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];
  const events = artifact.metadata.events;

  if (!events || events.length === 0) {
    return errors;
  }

  // Check chronological order
  for (let i = 1; i < events.length; i++) {
    const prevEvent = events[i - 1];
    const currEvent = events[i];

    if (!prevEvent || !currEvent) continue;

    const prevTimestamp = new Date(prevEvent.timestamp);
    const currTimestamp = new Date(currEvent.timestamp);

    if (currTimestamp < prevTimestamp) {
      const position = findFieldPosition(
        doc,
        ["metadata", "events", i, "timestamp"],
        lineCounter,
      );

      errors.push({
        code: "EVENT_ORDER_INVALID",
        message: `Event at index ${i} has timestamp ${currEvent.timestamp} which is before the previous event timestamp ${prevEvent.timestamp}`,
        field: `metadata.events[${i}].timestamp`,
        line: position?.line,
        column: position?.column,
        suggestedFix:
          "Events must be in chronological order (oldest to newest)",
      });
    }
  }

  // Validate event types are valid
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (!event) continue;

    if (!ARTIFACT_EVENTS.includes(event.event as never)) {
      const position = findFieldPosition(
        doc,
        ["metadata", "events", i, "event"],
        lineCounter,
      );

      errors.push({
        code: "EVENT_TYPE_INVALID",
        message: `Invalid event type: ${event.event}`,
        field: `metadata.events[${i}].event`,
        line: position?.line,
        column: position?.column,
        suggestedFix: `Valid event types: ${ARTIFACT_EVENTS.join(", ")}`,
      });
    }
  }

  return errors;
}

/**
 * Validates that relationship fields are arrays.
 *
 * @private
 */
function validateRelationshipArrays(
  artifact: TAnyArtifact,
  doc: Document.Parsed,
  lineCounter: LineCounter,
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];
  const relationships = artifact.metadata.relationships;

  if (!relationships) {
    return errors;
  }

  // Check blocks is an array
  if ("blocks" in relationships && !Array.isArray(relationships.blocks)) {
    const position = findFieldPosition(
      doc,
      ["metadata", "relationships", "blocks"],
      lineCounter,
    );

    errors.push({
      code: "RELATIONSHIP_NOT_ARRAY",
      message: "Field 'blocks' must be an array",
      field: "metadata.relationships.blocks",
      line: position?.line,
      column: position?.column,
      suggestedFix: "Use array format: blocks: [A.1, A.2]",
    });
  }

  // Check blocked_by is an array
  if (
    "blocked_by" in relationships &&
    !Array.isArray(relationships.blocked_by)
  ) {
    const position = findFieldPosition(
      doc,
      ["metadata", "relationships", "blocked_by"],
      lineCounter,
    );

    errors.push({
      code: "RELATIONSHIP_NOT_ARRAY",
      message: "Field 'blocked_by' must be an array",
      field: "metadata.relationships.blocked_by",
      line: position?.line,
      column: position?.column,
      suggestedFix: "Use array format: blocked_by: [A.1, A.2]",
    });
  }

  return errors;
}

/**
 * Validates schema version compatibility.
 *
 * @private
 */
function validateSchemaVersion(
  artifact: TAnyArtifact,
  doc: Document.Parsed,
  lineCounter: LineCounter,
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];
  const version = artifact.metadata.schema_version;

  // Basic semver validation
  const semverRegex = /^\d+\.\d+\.\d+$/;
  if (!semverRegex.test(version)) {
    const position = findFieldPosition(
      doc,
      ["metadata", "schema_version"],
      lineCounter,
    );

    errors.push({
      code: "SCHEMA_VERSION_INVALID",
      message: `Invalid schema version format: ${version}`,
      field: "metadata.schema_version",
      line: position?.line,
      column: position?.column,
      suggestedFix: "Use semantic version format (e.g., 0.0.1)",
    });
  }

  return errors;
}

/**
 * Format schema validation errors with line number information.
 *
 * @private
 */
function formatSchemaErrors(
  error: ArtifactValidationError,
  doc: Document.Parsed,
  lineCounter: LineCounter,
  context: string,
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  if (error.issues) {
    for (const issue of error.issues) {
      const path = issue.path?.split(".") ?? [];
      const position = findFieldPosition(doc, path, lineCounter);

      errors.push({
        code: issue.code ?? "SCHEMA_ERROR",
        message: issue.message,
        field: issue.path,
        line: position?.line,
        column: position?.column,
        suggestedFix: suggestSchemaFix(issue),
      });
    }
  } else {
    errors.push({
      code: error.kind,
      message: error.message,
      suggestedFix: `Verify artifact ${context} structure matches expected schema`,
    });
  }

  return errors;
}

/**
 * Create a LineCounter for a YAML document by indexing newlines.
 *
 * @private
 */
function createLineCounter(doc: Document.Parsed): LineCounter {
  const lineCounter = new LineCounter();
  const docString = doc.toString();
  lineCounter.addNewLine(0);
  for (let i = 0; i < docString.length; i++) {
    if (docString[i] === "\n") {
      lineCounter.addNewLine(i + 1);
    }
  }
  return lineCounter;
}

/**
 * Find the line and column position of a field in the YAML document.
 *
 * @private
 */
function findFieldPosition(
  doc: Document.Parsed,
  path: (string | number)[],
  lineCounter: LineCounter,
): { line: number; column: number } | undefined {
  let current: ParsedNode | Document.Parsed | null = doc;

  for (const segment of path) {
    if (!current) {
      return undefined;
    }

    if (typeof segment === "number") {
      // Array index
      if (
        current &&
        typeof current === "object" &&
        "items" in current &&
        Array.isArray(current.items)
      ) {
        current = current.items[segment] as ParsedNode;
      } else {
        return undefined;
      }
    } else {
      // Object key
      if (
        current &&
        typeof current === "object" &&
        "contents" in current &&
        current.contents &&
        typeof current.contents === "object" &&
        "items" in current.contents &&
        Array.isArray(current.contents.items)
      ) {
        const pair = current.contents.items.find(
          (item: unknown) =>
            item &&
            typeof item === "object" &&
            "key" in item &&
            item.key &&
            typeof item.key === "object" &&
            "value" in item.key &&
            item.key.value === segment,
        );
        if (pair && typeof pair === "object" && "value" in pair && pair.value) {
          current = pair.value as ParsedNode;
        } else {
          return undefined;
        }
      } else if (
        current &&
        typeof current === "object" &&
        "items" in current &&
        Array.isArray(current.items)
      ) {
        const pair = current.items.find(
          (item: unknown) =>
            item &&
            typeof item === "object" &&
            "key" in item &&
            item.key &&
            typeof item.key === "object" &&
            "value" in item.key &&
            item.key.value === segment,
        );
        if (pair && typeof pair === "object" && "value" in pair && pair.value) {
          current = pair.value as ParsedNode;
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    }
  }

  // Extract line and column from the node's range
  if (current && typeof current === "object" && "range" in current) {
    const range = current.range as [number, number, number] | undefined;
    if (range) {
      const pos = lineCounter.linePos(range[0]);
      return {
        line: pos.line,
        column: pos.col,
      };
    }
  }

  return undefined;
}

/**
 * Suggest fixes for schema validation errors.
 *
 * @private
 */
function suggestSchemaFix(issue: ArtifactValidationIssue): string | undefined {
  const field = issue.path?.split(".").pop();
  const code = issue.code ?? "";

  if (code.includes("MISSING") || code === "invalid_type") {
    return `Add required field ${field ?? "to artifact"}`;
  }

  if (code.includes("INVALID_ID")) {
    return "Use valid artifact ID format (e.g., A, A.1, A.1.1)";
  }

  if (code.includes("WRONG_TYPE")) {
    return issue.message.includes(CArtifact.INITIATIVE)
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

  if (code === "too_small") {
    return "Provide at least one item";
  }

  if (code === "invalid_string") {
    return "Check the format and allowed values";
  }

  return undefined;
}

/**
 * Type guard for ArtifactValidationError.
 *
 * @private
 */
function isArtifactValidationError(
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
 * Type guard for Node.js errors with code property.
 *
 * @private
 */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

/**
 * ArtifactValidationError interface (from @kodebase/core).
 *
 * @private
 */
interface ArtifactValidationError extends Error {
  name: "ArtifactValidationError";
  kind: string;
  issues?: ArtifactValidationIssue[];
}

/**
 * ArtifactValidationIssue interface (from @kodebase/core).
 *
 * @private
 */
interface ArtifactValidationIssue {
  code?: string;
  message: string;
  path?: string;
}
