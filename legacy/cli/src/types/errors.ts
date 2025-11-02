/**
 * Error types and interfaces for the Kodebase CLI
 *
 * This module defines custom error classes and types for comprehensive
 * error handling with helpful suggestions for users.
 */

export interface ErrorSuggestion {
  readonly action: string;
  readonly command?: string;
  readonly description: string;
}

export interface CLIErrorOptions {
  readonly cause?: Error;
  readonly suggestions?: readonly ErrorSuggestion[];
  readonly exitCode?: number;
  readonly showStackTrace?: boolean;
}

/**
 * Base class for all CLI errors with suggestion system
 */
export abstract class CLIError extends Error {
  public readonly suggestions: readonly ErrorSuggestion[];
  public readonly exitCode: number;
  public readonly showStackTrace: boolean;
  public readonly cause?: Error;

  constructor(message: string, options: CLIErrorOptions = {}) {
    super(message);
    this.name = this.constructor.name;
    this.suggestions = options.suggestions ?? [];
    this.exitCode = options.exitCode ?? 1;
    this.showStackTrace = options.showStackTrace ?? false;
    this.cause = options.cause;

    // Maintain proper stack trace for V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * File system related errors (file not found, permission denied, etc.)
 */
export class FileSystemError extends CLIError {
  constructor(
    message: string,
    filePath: string,
    options: CLIErrorOptions = {},
  ) {
    const suggestions: ErrorSuggestion[] = [
      {
        action: 'Check if the file exists',
        command: `ls -la "${filePath}"`,
        description: 'Verify the file exists and you have read permissions',
      },
      {
        action: 'Check current directory',
        command: 'pwd && ls -la',
        description: 'Make sure you are in the correct directory',
      },
      ...(options.suggestions ?? []),
    ];

    super(message, { ...options, suggestions });
  }
}

/**
 * Invalid artifact ID errors with smart suggestions
 */
export class InvalidArtifactIdError extends CLIError {
  constructor(artifactId: string, options: CLIErrorOptions = {}) {
    const message = `Invalid artifact ID: "${artifactId}"`;

    const suggestions: ErrorSuggestion[] = [
      {
        action: 'List available artifacts',
        command: 'kodebase list',
        description: 'See all available artifact IDs in your project',
      },
      {
        action: 'Check ID format',
        description:
          'Artifact IDs should follow the pattern: A.1.5 (Initiative.Milestone.Issue)',
      },
      ...(options.suggestions ?? []),
    ];

    super(message, { ...options, suggestions });
  }
}

/**
 * Validation errors for user input
 */
export class ValidationError extends CLIError {
  constructor(
    field: string,
    value: string,
    requirements: string,
    options: CLIErrorOptions = {},
  ) {
    const message = `Invalid ${field}: "${value}". ${requirements}`;
    super(message, options);
  }
}

/**
 * Git operation errors
 */
export class GitError extends CLIError {
  constructor(
    operation: string,
    message: string,
    options: CLIErrorOptions = {},
  ) {
    const fullMessage = `Git ${operation} failed: ${message}`;

    const suggestions: ErrorSuggestion[] = [
      {
        action: 'Check git status',
        command: 'git status',
        description: 'See current git repository state',
      },
      {
        action: 'Ensure you are in a git repository',
        command: 'git remote -v',
        description: 'Verify this is a git repository with remotes configured',
      },
      ...(options.suggestions ?? []),
    ];

    super(fullMessage, { ...options, suggestions });
  }
}

/**
 * Performance timeout errors
 */
export class PerformanceError extends CLIError {
  constructor(
    operation: string,
    duration: number,
    options: CLIErrorOptions = {},
  ) {
    const message = `Operation "${operation}" took ${duration}ms (exceeded 100ms limit)`;

    const suggestions: ErrorSuggestion[] = [
      {
        action: 'Check file system performance',
        description: 'Large artifact directories may cause slowdowns',
      },
      {
        action: 'Report performance issue',
        description: 'If this persists, please report it as a bug',
      },
      ...(options.suggestions ?? []),
    ];

    super(message, { ...options, suggestions, exitCode: 0 }); // Don't exit on perf warnings
  }
}
