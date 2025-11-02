/**
 * Error handling types for @kodebase/git-ops
 */

/**
 * Error severity levels
 */
export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

/**
 * Error categories for classification
 */
export type ErrorCategory =
  | 'git_config'
  | 'git_repository'
  | 'network'
  | 'authentication'
  | 'permissions'
  | 'file_system'
  | 'artifact'
  | 'validation'
  | 'system'
  | 'unknown';

/**
 * Error types for differentiation
 */
export type ErrorType = 'user_error' | 'system_failure' | 'external_dependency';

/**
 * Structured error code format: CATEGORY_TYPE_NUMBER
 * Examples: GIT_CONFIG_001, NETWORK_AUTH_002, ARTIFACT_VALIDATION_003
 */
export type ErrorCode = string;

/**
 * Action that user can take to resolve the error
 */
export interface ErrorAction {
  /** Brief description of the action */
  description: string;
  /** Command to run (if applicable) */
  command?: string;
  /** Link to documentation */
  link?: string;
}

/**
 * Debug information for troubleshooting
 */
export interface DebugInfo {
  /** Operation that was being performed */
  operation: string;
  /** Context data (file paths, branch names, etc.) */
  context: Record<string, unknown>;
  /** Stack trace if available */
  stackTrace?: string;
  /** Timestamp when error occurred */
  timestamp: string;
  /** Environment information */
  environment?: {
    platform: string;
    nodeVersion: string;
    gitVersion?: string;
    cwd: string;
  };
}

/**
 * Structured error information
 */
export interface StructuredError {
  /** Unique error code for programmatic handling */
  code: ErrorCode;
  /** Error severity level */
  severity: ErrorSeverity;
  /** Error category for classification */
  category: ErrorCategory;
  /** Error type for differentiation */
  type: ErrorType;
  /** Human-readable error message */
  message: string;
  /** Brief description of what went wrong */
  description: string;
  /** Why this error matters (impact on workflow) */
  impact?: string;
  /** Suggested actions to resolve the error */
  actions: ErrorAction[];
  /** Debug information (only included in debug mode) */
  debug?: DebugInfo;
  /** Original error object (if any) */
  originalError?: Error;
}

/**
 * Error formatting options
 */
export interface ErrorFormatOptions {
  /** Whether to include debug information */
  debug?: boolean;
  /** Whether to use colors in output */
  colors?: boolean;
  /** Whether to include links to documentation */
  includeLinks?: boolean;
  /** Maximum width for formatting */
  maxWidth?: number;
}

/**
 * Result of error formatting
 */
export interface FormattedError {
  /** Formatted message for display */
  message: string;
  /** Exit code suggestion */
  exitCode: number;
  /** Whether operation should continue */
  shouldContinue: boolean;
}
