/**
 * Enhanced error formatter for Zod validation errors
 * Transforms cryptic validation errors into helpful, actionable messages
 */

import { z } from 'zod';
import { CArtifactEvent, CEstimationSize, CPriority } from '../types/constants';

/**
 * Formatted validation error with actionable information
 */
export interface FormattedValidationError {
  path: string;
  message: string;
  expected: string;
  received: unknown;
  suggestion: string;
  code: z.ZodIssueCode;
}

/**
 * Map of known enum types to their valid values
 */
const ENUM_VALUE_MAP: Record<string, readonly string[]> = {
  priority: Object.values(CPriority),
  estimation: Object.values(CEstimationSize),
  event: Object.values(CArtifactEvent),
};

/**
 * Map of field paths to human-readable descriptions
 */
const FIELD_DESCRIPTIONS: Record<string, string> = {
  'metadata.priority': 'The priority level for this artifact',
  'metadata.estimation': 'The effort estimation size',
  'metadata.title': 'The human-readable title',
  'metadata.created_by': 'The creator of this artifact',
  'metadata.assignee': 'The person assigned to this artifact',
  'metadata.schema_version': 'The schema version number',
  'metadata.events': 'The event history log',
  'metadata.relationships.blocks': 'List of artifact IDs that this blocks',
  'metadata.relationships.blocked_by': 'List of artifact IDs blocking this',
  'content.vision': 'The strategic vision statement',
  'content.scope': 'The scope definition',
  'content.success_criteria': 'The measurable success criteria',
  'content.deliverables': 'The milestone deliverables',
  'content.validation': 'The validation criteria',
  'content.acceptance_criteria': 'The issue acceptance criteria',
  'content.summary': 'A brief summary of the artifact',
};

/**
 * Format a single Zod issue into an actionable error message
 */
function formatZodIssue(issue: z.ZodIssue): FormattedValidationError {
  const path = issue.path.join('.');
  const fieldDescription = FIELD_DESCRIPTIONS[path] || path;

  let message = '';
  let expected = '';
  let suggestion = '';

  switch (issue.code) {
    case z.ZodIssueCode.invalid_enum_value: {
      const enumKey = issue.path[issue.path.length - 1]?.toString();
      const validValues =
        (enumKey && ENUM_VALUE_MAP[enumKey]) || issue.options || [];
      message = `${fieldDescription} must be one of: ${validValues.join(', ')}`;
      expected = validValues.join(', ');
      suggestion = `Change the value to one of the valid options: ${validValues.join(', ')}`;
      if (issue.received) {
        message += ` (found: '${issue.received}')`;
      }
      break;
    }

    case z.ZodIssueCode.invalid_type:
      message = `${fieldDescription} must be ${issue.expected}`;
      expected = issue.expected;
      if (issue.received === 'undefined') {
        suggestion = `Add the required field '${path}' with a ${issue.expected} value`;
      } else {
        suggestion = `Change the type from ${issue.received} to ${issue.expected}`;
      }
      if (issue.received !== 'undefined') {
        message += ` (found: ${issue.received})`;
      }
      break;

    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        message = `${fieldDescription} must be at least ${issue.minimum} character${issue.minimum === 1 ? '' : 's'} long`;
        expected = `string with minimum length ${issue.minimum}`;
        suggestion = `Provide a more detailed value with at least ${issue.minimum} character${issue.minimum === 1 ? '' : 's'}`;
      } else if (issue.type === 'array') {
        message = `${fieldDescription} must have at least ${issue.minimum} item${issue.minimum === 1 ? '' : 's'}`;
        expected = `array with minimum ${issue.minimum} item${issue.minimum === 1 ? '' : 's'}`;
        suggestion = `Add at least ${issue.minimum} item${issue.minimum === 1 ? '' : 's'} to the list`;
      }
      break;

    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'datetime') {
        message = `${fieldDescription} must be in ISO 8601 format`;
        expected = 'ISO 8601 datetime (e.g., 2025-01-15T10:30:00Z)';
        suggestion = 'Use format: YYYY-MM-DDTHH:mm:ssZ';
      } else if (issue.validation === 'regex') {
        message = `${fieldDescription} has invalid format`;
        expected = 'Valid format matching pattern';
        if (
          path.includes('actor') ||
          path.includes('created_by') ||
          path.includes('assignee')
        ) {
          suggestion =
            'Use format: "Name (email@domain.com)" for humans or "agent.TYPE.SESSION@tenant.kodebase.ai" for AI agents';
        } else {
          suggestion = 'Check the required format for this field';
        }
      } else {
        message = `${fieldDescription} has invalid string format`;
        expected = `valid ${issue.validation} string`;
        suggestion = `Ensure the value is a valid ${issue.validation} string`;
      }
      break;

    case z.ZodIssueCode.unrecognized_keys:
      message = `Unknown field${issue.keys.length > 1 ? 's' : ''}: ${issue.keys.join(', ')}`;
      expected = 'Only recognized fields';
      suggestion = `Remove the unrecognized field${issue.keys.length > 1 ? 's' : ''}: ${issue.keys.join(', ')}`;
      break;

    default:
      message = issue.message;
      expected = 'Valid value';
      suggestion = 'Check the schema requirements for this field';
  }

  return {
    path: path || 'root',
    message,
    expected,
    received:
      issue.code === z.ZodIssueCode.invalid_enum_value
        ? issue.received
        : undefined,
    suggestion,
    code: issue.code,
  };
}

/**
 * Format Zod validation errors into developer-friendly messages
 */
export function formatValidationErrors(error: z.ZodError): string {
  const formattedErrors = error.errors.map(formatZodIssue);

  if (formattedErrors.length === 1) {
    const err = formattedErrors[0];
    if (!err) return 'Unknown validation error';
    return `${err.message}. ${err.suggestion}`;
  }

  // Multiple errors - format as a list
  const errorList = formattedErrors
    .map(
      (err, index) =>
        `  ${index + 1}. ${err?.path || 'unknown'}: ${err?.message || 'unknown error'}`,
    )
    .join('\n');

  const suggestions = formattedErrors
    .map(
      (err, index) =>
        `  ${index + 1}. ${err?.suggestion || 'Check the schema requirements'}`,
    )
    .join('\n');

  return `Multiple validation errors found:\n${errorList}\n\nSuggestions:\n${suggestions}`;
}

/**
 * Get detailed validation error information for debugging
 */
export function getValidationErrorDetails(
  error: z.ZodError,
): FormattedValidationError[] {
  return error.errors.map(formatZodIssue);
}
