/**
 * Error handling system for @kodebase/git-ops
 *
 * Provides consistent error formatting, debug mode support, and actionable
 * error messages across all git operations and hooks.
 */

// Error catalog
export {
  ARTIFACT_CORRUPTED,
  ARTIFACT_NOT_FOUND,
  ERROR_CATALOG,
  GIT_CONFIG_MISSING,
  GITHUB_AUTH_REQUIRED,
  // Common error instances
  GITHUB_CLI_NOT_INSTALLED,
  getErrorByCode,
  getErrorsByCategory,
  HOOKS_PERMISSION_DENIED,
  INVALID_ARTIFACT_ID,
  INVALID_STATE_TRANSITION,
  NETWORK_TIMEOUT,
  NOT_GIT_REPOSITORY,
} from './error-catalog';
// Main formatter
export { ErrorFormatter } from './error-formatter';
// Types
export type {
  DebugInfo,
  ErrorAction,
  ErrorCategory,
  ErrorCode,
  ErrorFormatOptions,
  ErrorSeverity,
  ErrorType,
  FormattedError,
  StructuredError,
} from './types';

/**
 * Create a singleton instance of ErrorFormatter for easy use
 */
import { ErrorFormatter } from './error-formatter';
export const errorFormatter = new ErrorFormatter();

/**
 * Quick helper for formatting simple errors
 */
export function formatError(
  error: Error | string,
  operation: string,
  context?: Record<string, unknown>,
): string {
  const formatted = errorFormatter.formatSimple(
    error.toString(),
    operation,
    context,
  );
  return formatted.message;
}

/**
 * Quick helper for checking if operation should continue after error
 */
export function shouldContinueAfterError(
  error: Error | string,
  operation: string,
): boolean {
  const formatted = errorFormatter.formatSimple(error.toString(), operation);
  return formatted.shouldContinue;
}
