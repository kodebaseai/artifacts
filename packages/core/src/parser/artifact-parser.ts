import { parse as parseYamlDocument, YAMLParseError } from "yaml";
import type { ZodError } from "zod";

import {
  InitiativeSchema,
  IssueSchema,
  MilestoneSchema,
  type TInitiative,
  type TIssue,
  type TMilestone,
} from "../schemas/schemas.js";

/**
 * Represents a single validation issue from parsing an artifact.
 */
export type ArtifactParseIssue = {
  /** JSON path to the field with the issue */
  path: string;
  /** Human-readable error message */
  message: string;
  /** Zod error code (e.g., "invalid_type", "too_small") */
  code?: string;
};

/**
 * Category of parse error that occurred.
 */
export type ArtifactParseErrorKind = "yaml" | "schema" | "input";

/**
 * Detailed error information from a failed parse operation.
 */
export type ArtifactParseError = {
  /** Type of error that occurred */
  kind: ArtifactParseErrorKind;
  /** High-level error message */
  message: string;
  /** Specific validation issues (for schema errors) */
  issues?: ArtifactParseIssue[];
};

/**
 * Successful parse result containing the validated artifact data.
 */
export type ArtifactParseSuccess<T> = {
  success: true;
  data: T;
};

/**
 * Failed parse result containing error details.
 */
export type ArtifactParseFailure = {
  success: false;
  error: ArtifactParseError;
};

/**
 * Result type for all parse operations - either success with data or failure with error.
 */
export type ArtifactParseResult<T> =
  | ArtifactParseSuccess<T>
  | ArtifactParseFailure;

const ROOT_PATH = "(root)";

const yamlParseOptions = Object.freeze({
  prettyErrors: false,
});

function formatYamlError(err: unknown): string {
  if (err instanceof YAMLParseError) {
    const at =
      err.linePos && err.linePos.length > 0
        ? ` at line ${err.linePos[0].line}, column ${err.linePos[0].col}`
        : "";
    return `Invalid YAML${at}: ${err.message}`;
  }
  if (err instanceof Error) {
    return `Invalid YAML: ${err.message}`;
  }

  return "Invalid YAML content";
}

function ensurePlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeInput(
  input: unknown,
): ArtifactParseResult<Record<string, unknown>> {
  if (typeof input === "string") {
    const yamlResult = parseYaml(input);
    if (!yamlResult.success) {
      return yamlResult;
    }
    if (!ensurePlainObject(yamlResult.data)) {
      return {
        success: false,
        error: {
          kind: "yaml",
          message:
            "Parsed YAML must produce an object with metadata/content sections",
        },
      };
    }
    return { success: true, data: yamlResult.data };
  }

  if (!ensurePlainObject(input)) {
    return {
      success: false,
      error: {
        kind: "input",
        message:
          "Parser input must be a YAML string or an object matching the artifact schema",
      },
    };
  }

  return { success: true, data: input };
}

function formatZodIssuePath(path: ZodError["issues"][number]["path"]): string {
  if (path.length === 0) {
    return ROOT_PATH;
  }

  return path.reduce<string>((acc, segment) => {
    if (typeof segment === "number") {
      return `${acc}[${segment}]`;
    }
    const key =
      typeof segment === "symbol"
        ? (segment.description ?? "[symbol]")
        : String(segment);
    return acc ? `${acc}.${key}` : key;
  }, "");
}

function formatSchemaError(
  label: string,
  error: ZodError<unknown>,
): ArtifactParseError {
  const issues = error.issues.map((issue) => ({
    path: formatZodIssuePath(issue.path),
    message: issue.message,
    code: issue.code,
  }));
  const plural = issues.length === 1 ? "issue" : "issues";
  return {
    kind: "schema",
    message: `${label} validation failed (${issues.length} ${plural})`,
    issues,
  };
}

function parseWithSchema<T>(
  input: unknown,
  schemaLabel: string,
  parse: (value: unknown) => T,
): ArtifactParseResult<T> {
  const normalized = normalizeInput(input);
  if (!normalized.success) {
    return normalized;
  }

  try {
    const data = parse(normalized.data);
    return { success: true, data };
  } catch (err) {
    if (err && typeof err === "object" && "issues" in err) {
      return {
        success: false,
        error: formatSchemaError(schemaLabel, err as ZodError<unknown>),
      };
    }
    const message =
      err instanceof Error ? err.message : "Unknown validation failure";
    return {
      success: false,
      error: {
        kind: "schema",
        message: `${schemaLabel} validation failed: ${message}`,
      },
    };
  }
}

/**
 * Parse a YAML string into a JavaScript object without schema validation.
 *
 * @param input - YAML string to parse
 * @returns Parse result with either the parsed data or error details
 *
 * @example
 * ```ts
 * const result = parseYaml("key: value");
 * if (result.success) {
 *   console.log(result.data); // { key: "value" }
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export function parseYaml(input: string): ArtifactParseResult<unknown> {
  if (typeof input !== "string") {
    return {
      success: false,
      error: {
        kind: "input",
        message: "YAML input must be a string",
      },
    };
  }

  try {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      return {
        success: false,
        error: {
          kind: "yaml",
          message: "YAML input is empty",
        },
      };
    }

    const document = parseYamlDocument(trimmed, yamlParseOptions);
    return { success: true, data: document };
  } catch (err) {
    return {
      success: false,
      error: {
        kind: "yaml",
        message: formatYamlError(err),
      },
    };
  }
}

/**
 * Parse and validate an Initiative artifact from YAML string or object.
 *
 * @param input - YAML string or pre-parsed object to validate as initiative
 * @returns Parse result with either validated initiative data or error details
 *
 * @example
 * ```ts
 * const yaml = `
 * metadata:
 *   title: "Q1 Goals"
 *   priority: high
 *   estimation: XL
 *   created_by: "Ada Lovelace (ada@example.com)"
 * content:
 *   vision: "Deliver platform improvements"
 *   scopeIn: ["API", "Database"]
 *   scopeOut: ["UI redesign"]
 *   successCriteria: ["99.9% uptime"]
 * `;
 *
 * const result = parseInitiative(yaml);
 * if (result.success) {
 *   console.log(result.data.metadata.title); // "Q1 Goals"
 * } else {
 *   console.error(result.error.issues); // Validation errors
 * }
 * ```
 *
 * @see {@link parseMilestone}, {@link parseIssue}
 */
export function parseInitiative(
  input: string | Record<string, unknown>,
): ArtifactParseResult<TInitiative> {
  return parseWithSchema(input, "Initiative artifact", (value) =>
    InitiativeSchema.parse(value),
  );
}

/**
 * Parse and validate a Milestone artifact from YAML string or object.
 *
 * @param input - YAML string or pre-parsed object to validate as milestone
 * @returns Parse result with either validated milestone data or error details
 *
 * @example
 * ```ts
 * const yaml = `
 * metadata:
 *   title: "API v2 Launch"
 *   priority: high
 *   estimation: L
 *   created_by: "Grace Hopper (grace@example.com)"
 * content:
 *   summary: "Ship new REST API"
 *   deliverables: ["OpenAPI spec", "Client SDKs"]
 * `;
 *
 * const result = parseMilestone(yaml);
 * if (result.success) {
 *   console.log(result.data.content.deliverables);
 * }
 * ```
 *
 * @see {@link parseInitiative}, {@link parseIssue}
 */
export function parseMilestone(
  input: string | Record<string, unknown>,
): ArtifactParseResult<TMilestone> {
  return parseWithSchema(input, "Milestone artifact", (value) =>
    MilestoneSchema.parse(value),
  );
}

/**
 * Parse and validate an Issue artifact from YAML string or object.
 *
 * @param input - YAML string or pre-parsed object to validate as issue
 * @returns Parse result with either validated issue data or error details
 *
 * @example
 * ```ts
 * const yaml = `
 * metadata:
 *   title: "Add rate limiting"
 *   priority: medium
 *   estimation: M
 *   created_by: "Alan Turing (alan@example.com)"
 * content:
 *   summary: "Implement token bucket algorithm"
 *   acceptanceCriteria:
 *     - "Configurable limits"
 *     - "Graceful degradation"
 * `;
 *
 * const result = parseIssue(yaml);
 * if (result.success) {
 *   console.log(result.data.content.acceptanceCriteria);
 * }
 * ```
 *
 * @see {@link parseInitiative}, {@link parseMilestone}
 */
export function parseIssue(
  input: string | Record<string, unknown>,
): ArtifactParseResult<TIssue> {
  return parseWithSchema(input, "Issue artifact", (value) =>
    IssueSchema.parse(value),
  );
}

/**
 * Namespace containing all artifact parsing functions.
 *
 * Provides a convenient way to import all parsers together:
 * ```ts
 * import { ArtifactParser } from "@kodebase/core";
 * const result = ArtifactParser.parseInitiative(yaml);
 * ```
 */
export const ArtifactParser = {
  parseYaml,
  parseInitiative,
  parseMilestone,
  parseIssue,
} as const;
