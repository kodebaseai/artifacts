/**
 * Error formatting utilities for validation issues.
 *
 * Transforms technical Zod validation errors into user-friendly messages with:
 * - Clear explanations of what went wrong
 * - Contextual hints for each field
 * - Actionable suggestions for fixing issues
 *
 * @module error-formatter
 */

import type * as z from "zod";
import type { ZodError } from "zod";

type ZodIssue = z.core.$ZodIssue;

import { CArtifactEvent, CEstimationSize, CPriority } from "../constants.js";
import type { ArtifactParseIssue } from "../parser/artifact-parser.js";

/**
 * User-friendly representation of a validation issue.
 *
 * Includes the field path, a clear reason for the failure, and an
 * optional suggestion for how to fix it.
 */
export type FormattedValidationIssue = {
  /** JSON path to the field with the issue (e.g., "metadata.title") */
  path: string;
  /** Clear explanation of why validation failed */
  reason: string;
  /** Optional actionable suggestion for fixing the issue */
  suggestion?: string;
};

const PATH_HINTS: Record<string, string> = {
  "metadata.title": "Provide a concise, descriptive title (3-100 characters).",
  "metadata.priority":
    "Allowed values: low, medium, high, critical — pick the most accurate priority.",
  "metadata.estimation": "Use t-shirt sizing (XS/S/M/L/XL) to estimate effort.",
  "metadata.created_by":
    'Use format "Name (email@domain.com)" or an allowed agent identifier.',
  "metadata.assignee":
    'Use format "Name (email@domain.com)" to assign the artifact.',
  "metadata.schema_version":
    "Use the semantic version matching the schema definition (e.g., 0.0.1).",
  "metadata.events":
    "Events are logged chronologically; include at least the initial draft state.",
  "metadata.relationships.blocks":
    "List sibling artifacts that depend on this one completing.",
  "metadata.relationships.blocked_by":
    "List sibling artifacts required before this can start.",
  "content.summary":
    "Explain the artifact goal in a sentence or two, focusing on the outcome.",
  "content.acceptance_criteria":
    "List testable statements describing the definition of done.",
  "content.deliverables":
    "List concrete outputs expected when the milestone completes.",
  "content.validation":
    "Document review/validation steps used to confirm success.",
  "content.vision":
    "Explain the overarching vision or north star for the initiative.",
  "content.scope.in":
    "In-scope items describe what this initiative explicitly covers.",
  "content.scope.out":
    "Out-of-scope items describe exclusions to avoid scope creep.",
  "content.success_criteria":
    "List measurable signals that prove the initiative succeeded.",
  "delivery_summary.next":
    "Explain the next action or owner once the milestone completes.",
  "delivery_summary.delivered":
    "List the concrete deliverables shipped with the milestone.",
  "implementation_notes.result":
    "Summarise the tangible outputs produced during implementation.",
};

const ENUM_VALUE_TIPS: Record<string, readonly string[]> = {
  priority: Object.values(CPriority),
  estimation: Object.values(CEstimationSize),
  event: Object.values(CArtifactEvent),
};

function normaliseToStrings(
  value: readonly unknown[] | false | undefined,
): string[] {
  if (!value) {
    return [];
  }
  return [...value].map((entry) => {
    if (typeof entry === "symbol") {
      return entry.description ?? entry.toString();
    }
    return String(entry);
  });
}

function formatPath(path: ReadonlyArray<PropertyKey>): string {
  if (path.length === 0) {
    return "(root)";
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

function getPathHint(path: string): string | undefined {
  if (PATH_HINTS[path]) {
    return PATH_HINTS[path];
  }

  // Provide a more general hint when sub-paths match
  const entry = Object.entries(PATH_HINTS).find(
    ([key]) => path.startsWith(`${key}.`) || path.startsWith(`${key}[`),
  );
  return entry?.[1];
}

function buildSuggestion(issue: ZodIssue, path: string): string | undefined {
  switch (issue.code) {
    case "invalid_type":
      if ((issue as { input?: unknown }).input === undefined) {
        return `Add the required field '${path}' with a value that matches the schema.`;
      }
      return "Change the value type to match what the schema expects.";

    case "invalid_value": {
      const enumKey = issue.path[issue.path.length - 1];
      const enumOptions =
        typeof enumKey === "string" ? ENUM_VALUE_TIPS[enumKey] : undefined;
      const options = enumOptions ?? normaliseToStrings(issue.values);
      if (options.length > 0) {
        return `Choose one of the allowed values: ${options.join(", ")}.`;
      }
      return getPathHint(path);
    }

    case "invalid_format":
      if (issue.format === "datetime") {
        return "Use ISO 8601 format, e.g. 2025-10-30T14:37:00Z.";
      }
      if (issue.pattern) {
        return `Ensure the value matches the required format: ${issue.pattern}`;
      }
      return getPathHint(path);

    case "too_small":
      if (issue.origin === "string") {
        return `Provide at least ${issue.minimum} character${
          issue.minimum === 1 ? "" : "s"
        } for '${path}'.`;
      }
      if (issue.origin === "array" || issue.origin === "set") {
        return `Add at least ${issue.minimum} item${
          issue.minimum === 1 ? "" : "s"
        } to '${path}'.`;
      }
      if (issue.minimum !== undefined) {
        return `Ensure '${path}' meets the minimum requirement of ${issue.minimum}.`;
      }
      return getPathHint(path);

    case "too_big":
      if (issue.origin === "string") {
        return `Reduce the value to at most ${issue.maximum} character${
          issue.maximum === 1 ? "" : "s"
        }.`;
      }
      if (issue.origin === "array" || issue.origin === "set") {
        return `Remove extra entries so '${path}' has at most ${issue.maximum}.`;
      }
      if (issue.maximum !== undefined) {
        return `Ensure '${path}' does not exceed ${issue.maximum}.`;
      }
      return getPathHint(path);

    case "unrecognized_keys": {
      const keys = normaliseToStrings(issue.keys);
      if (keys.length === 0) {
        return "Remove the unrecognised field.";
      }
      return `Remove the unrecognised field${
        keys.length > 1 ? "s" : ""
      }: ${keys.join(", ")}.`;
    }

    case "not_multiple_of":
      return `Adjust '${path}' so it is a multiple of ${issue.divisor}.`;

    default:
      return getPathHint(path);
  }
}

function buildReason(issue: ZodIssue, path: string): string {
  const baseHint = getPathHint(path);

  switch (issue.code) {
    case "invalid_type":
      if (issue.message) {
        return issue.message;
      }
      if ((issue as { input?: unknown }).input === undefined) {
        return `${path} is required.`;
      }
      return `${path} has an invalid type.`;

    case "invalid_value": {
      const enumKey = issue.path[issue.path.length - 1];
      const enumOptions =
        typeof enumKey === "string" ? ENUM_VALUE_TIPS[enumKey] : undefined;
      const options = enumOptions ?? normaliseToStrings(issue.values);
      if (options.length > 0) {
        return `${path} must be one of: ${options.join(", ")}.`;
      }
      return issue.message || `${path} has an invalid value.`;
    }

    case "too_small":
      if (issue.origin === "string") {
        return `${path} must be at least ${issue.minimum} character${
          issue.minimum === 1 ? "" : "s"
        } long.`;
      }
      if (issue.origin === "array" || issue.origin === "set") {
        return `${path} must include at least ${issue.minimum} item${
          issue.minimum === 1 ? "" : "s"
        }.`;
      }
      if (issue.minimum !== undefined) {
        return `${path} must meet the minimum requirement of ${issue.minimum}.`;
      }
      return baseHint ?? issue.message;

    case "invalid_format":
      if (issue.format === "datetime") {
        return `${path} must be a valid ISO 8601 datetime.`;
      }
      if (issue.pattern) {
        return `${path} has an invalid format.`;
      }
      return issue.message || `${path} has an invalid format.`;

    case "unrecognized_keys": {
      const keys = normaliseToStrings(issue.keys);
      if (keys.length === 0) {
        return `Unrecognised field at ${path}.`;
      }
      return `Unrecognised field${keys.length > 1 ? "s" : ""} at ${
        keys.length === 1 ? keys[0] : path
      }.`;
    }

    case "too_big":
      if (issue.origin === "string") {
        return `${path} must be at most ${issue.maximum} character${
          issue.maximum === 1 ? "" : "s"
        } long.`;
      }
      if (issue.origin === "array" || issue.origin === "set") {
        return `${path} must include no more than ${issue.maximum} item${
          issue.maximum === 1 ? "" : "s"
        }.`;
      }
      if (issue.maximum !== undefined) {
        return `${path} must not exceed ${issue.maximum}.`;
      }
      return baseHint ?? issue.message;

    case "not_multiple_of":
      return `${path} must be a multiple of ${issue.divisor}.`;

    case "invalid_union":
      return `${path} is invalid in one or more union branches.`;

    default:
      return baseHint ?? issue.message ?? `${path} is invalid.`;
  }
}

/**
 * Format a single Zod validation issue into a user-friendly message.
 *
 * Transforms technical Zod error codes into clear explanations with
 * field-specific hints and actionable suggestions.
 *
 * @param issue - Zod validation issue to format
 * @returns Formatted validation issue with path, reason, and suggestion
 *
 * @example
 * ```ts
 * import { formatZodIssue } from "@kodebase/core";
 *
 * const zodIssue = {
 *   code: "invalid_type",
 *   path: ["metadata", "title"],
 *   message: "Required"
 * };
 *
 * const formatted = formatZodIssue(zodIssue);
 * // {
 * //   path: "metadata.title",
 * //   reason: "metadata.title is required.",
 * //   suggestion: "Add the required field 'metadata.title' with a value that matches the schema."
 * // }
 * ```
 */
export function formatZodIssue(issue: ZodIssue): FormattedValidationIssue {
  const path = formatPath(issue.path);
  return {
    path,
    reason: buildReason(issue, path),
    suggestion: buildSuggestion(issue, path),
  };
}

/**
 * Format all issues from a Zod validation error.
 *
 * Convenience function that maps all issues in a ZodError to formatted
 * validation issues with user-friendly messages.
 *
 * @param error - Zod validation error containing multiple issues
 * @returns Array of formatted validation issues
 *
 * @example
 * ```ts
 * import { formatZodError } from "@kodebase/core";
 *
 * try {
 *   schema.parse(data);
 * } catch (error) {
 *   if (error instanceof ZodError) {
 *     const formatted = formatZodError(error);
 *     formatted.forEach(issue => {
 *       console.log(`${issue.path}: ${issue.reason}`);
 *       if (issue.suggestion) console.log(`  Hint: ${issue.suggestion}`);
 *     });
 *   }
 * }
 * ```
 */
export function formatZodError(error: ZodError): FormattedValidationIssue[] {
  return error.issues.map(formatZodIssue);
}

/**
 * Format parser validation issues into user-friendly messages.
 *
 * Converts parser-level validation issues (from YAML parsing) into
 * formatted issues with contextual hints.
 *
 * @param issues - Array of parse issues from artifact parser
 * @returns Array of formatted validation issues
 *
 * @example
 * ```ts
 * import { parseInitiative, formatParseIssues } from "@kodebase/core";
 *
 * const result = parseInitiative(yaml);
 * if (!result.success && result.error.issues) {
 *   const formatted = formatParseIssues(result.error.issues);
 *   formatted.forEach(issue => {
 *     console.error(`${issue.path}: ${issue.reason}`);
 *   });
 * }
 * ```
 */
export function formatParseIssues(
  issues: readonly ArtifactParseIssue[],
): FormattedValidationIssue[] {
  return issues.map((issue) => {
    const hint = getPathHint(issue.path);
    return {
      path: issue.path,
      reason: issue.message,
      suggestion: hint,
    };
  });
}

/**
 * Format multiple validation issues into a single summary string.
 *
 * Creates a formatted multi-line string suitable for CLI output or error messages.
 * Single issues are formatted inline, multiple issues are numbered and bulleted.
 *
 * @param issues - Array of formatted validation issues
 * @returns Formatted summary string (or "No validation issues found." if empty)
 *
 * @example
 * ```ts
 * import { formatIssuesSummary } from "@kodebase/core";
 *
 * const issues = [
 *   { path: "metadata.title", reason: "Title is required.", suggestion: "Add a title" },
 *   { path: "metadata.priority", reason: "Invalid priority value." }
 * ];
 *
 * console.log(formatIssuesSummary(issues));
 * // Validation failed with 2 issues:
 * // - 1. metadata.title: Title is required. (Hint: Add a title)
 * // - 2. metadata.priority: Invalid priority value.
 * ```
 */
export function formatIssuesSummary(
  issues: readonly FormattedValidationIssue[],
): string {
  if (issues.length === 0) {
    return "No validation issues found.";
  }

  if (issues.length === 1) {
    const single = issues[0];
    if (!single) {
      return "Validation failed.";
    }
    const suggestion = single.suggestion ? ` ${single.suggestion}` : "";
    return `${single.path}: ${single.reason}${suggestion}`;
  }

  const lines = issues.map((issue, index) => {
    const suggestion = issue.suggestion ? ` (Hint: ${issue.suggestion})` : "";
    return `${index + 1}. ${issue.path}: ${issue.reason}${suggestion}`;
  });

  return `Validation failed with ${issues.length} issues:\n${lines
    .map((line) => `- ${line}`)
    .join("\n")}`;
}
