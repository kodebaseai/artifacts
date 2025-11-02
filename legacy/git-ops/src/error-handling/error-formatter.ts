/**
 * Error formatter with consistent formatting, debug mode, and color support
 */

import { execSync } from 'node:child_process';
import { platform } from 'node:os';
import { getErrorByCode } from './error-catalog';
import type {
  DebugInfo,
  ErrorFormatOptions,
  ErrorSeverity,
  FormattedError,
  StructuredError,
} from './types';

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
} as const;

/**
 * Color mapping for error severities
 */
const SEVERITY_COLORS: Record<ErrorSeverity, string> = {
  critical: COLORS.red,
  error: COLORS.red,
  warning: COLORS.yellow,
  info: COLORS.blue,
};

/**
 * Environment detection for debug mode
 */
function isDebugMode(): boolean {
  return !!(
    process.env.DEBUG ||
    process.env.KODEBASE_DEBUG ||
    process.env.KODEBASE_HOOKS_DEBUG ||
    process.argv.includes('--debug') ||
    process.argv.includes('--verbose')
  );
}

/**
 * Check if colors should be enabled
 */
function shouldUseColors(): boolean {
  return !!(
    process.env.FORCE_COLOR ||
    (!process.env.NO_COLOR && process.stdout.isTTY)
  );
}

/**
 * Apply color to text if colors are enabled
 */
function colorize(text: string, color: string, useColors: boolean): string {
  return useColors ? `${color}${text}${COLORS.reset}` : text;
}

/**
 * Collect environment information for debug mode
 */
function collectEnvironmentInfo(cwd: string): DebugInfo['environment'] {
  try {
    return {
      platform: platform(),
      nodeVersion: process.version,
      gitVersion: execSync('git --version', {
        encoding: 'utf-8',
        timeout: 2000,
      }).trim(),
      cwd,
    };
  } catch {
    return {
      platform: platform(),
      nodeVersion: process.version,
      cwd,
    };
  }
}

/**
 * Create debug information
 */
function createDebugInfo(
  operation: string,
  context: Record<string, unknown>,
  originalError?: Error,
  cwd?: string,
): DebugInfo {
  return {
    operation,
    context,
    stackTrace: originalError?.stack,
    timestamp: new Date().toISOString(),
    environment: cwd ? collectEnvironmentInfo(cwd) : undefined,
  };
}

/**
 * Format error actions into readable text
 */
function formatActions(
  actions: StructuredError['actions'],
  useColors: boolean,
  includeLinks: boolean,
): string {
  if (actions.length === 0) return '';

  const formattedActions = actions
    .map((action, index) => {
      let actionText = `${index + 1}. ${action.description}`;

      if (action.command) {
        const commandText = colorize(action.command, COLORS.cyan, useColors);
        actionText += `\n   ${colorize('→', COLORS.gray, useColors)} ${commandText}`;
      }

      if (includeLinks && action.link) {
        const linkText = colorize(action.link, COLORS.blue, useColors);
        actionText += `\n   ${colorize('ℹ', COLORS.blue, useColors)} ${linkText}`;
      }

      return actionText;
    })
    .join('\n\n');

  const header = colorize('How to fix:', COLORS.bright, useColors);
  return `\n${header}\n${formattedActions}`;
}

/**
 * Format debug information
 */
function formatDebugInfo(debug: DebugInfo, useColors: boolean): string {
  const sections: string[] = [];

  // Operation info
  sections.push(
    `${colorize('Operation:', COLORS.bright, useColors)} ${debug.operation}`,
  );
  sections.push(
    `${colorize('Timestamp:', COLORS.bright, useColors)} ${debug.timestamp}`,
  );

  // Context info
  if (Object.keys(debug.context).length > 0) {
    const contextText = Object.entries(debug.context)
      .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
      .join('\n');
    sections.push(
      `${colorize('Context:', COLORS.bright, useColors)}\n${contextText}`,
    );
  }

  // Environment info
  if (debug.environment) {
    const envText = Object.entries(debug.environment)
      .map(([key, value]) => `  ${key}: ${value}`)
      .join('\n');
    sections.push(
      `${colorize('Environment:', COLORS.bright, useColors)}\n${envText}`,
    );
  }

  // Stack trace (truncated for readability)
  if (debug.stackTrace) {
    const truncatedStack = debug.stackTrace.split('\n').slice(0, 10).join('\n');
    sections.push(
      `${colorize('Stack Trace:', COLORS.bright, useColors)}\n${colorize(truncatedStack, COLORS.gray, useColors)}`,
    );
  }

  const header = colorize('\nDebug Information:', COLORS.magenta, useColors);
  return `${header}\n${sections.join('\n\n')}`;
}

/**
 * Wrap text to specified width
 */
function wrapText(text: string, maxWidth: number): string {
  if (!maxWidth || maxWidth <= 0) return text;

  return text
    .split('\n')
    .map((line) => {
      if (line.length <= maxWidth) return line;

      const words = line.split(' ');
      const wrappedLines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        if ((currentLine + word).length <= maxWidth) {
          currentLine += (currentLine ? ' ' : '') + word;
        } else {
          if (currentLine) wrappedLines.push(currentLine);
          currentLine = word;
        }
      }

      if (currentLine) wrappedLines.push(currentLine);
      return wrappedLines.join('\n');
    })
    .join('\n');
}

/**
 * Main error formatter class
 */
export class ErrorFormatter {
  private readonly defaultOptions: Required<ErrorFormatOptions>;

  constructor(options: Partial<ErrorFormatOptions> = {}) {
    this.defaultOptions = {
      debug: options.debug ?? isDebugMode(),
      colors: options.colors ?? shouldUseColors(),
      includeLinks: options.includeLinks ?? true,
      maxWidth: options.maxWidth ?? 80,
    };
  }

  /**
   * Format a structured error for display
   */
  format(
    error: StructuredError,
    options: ErrorFormatOptions = {},
  ): FormattedError {
    const opts = { ...this.defaultOptions, ...options };

    const parts: string[] = [];

    // Error header with severity and code
    const severityIcon = this.getSeverityIcon(error.severity);
    const severityColor = SEVERITY_COLORS[error.severity];
    const header = colorize(
      `${severityIcon} ${error.severity.toUpperCase()}: ${error.message} [${error.code}]`,
      severityColor,
      opts.colors,
    );
    parts.push(header);

    // Description
    if (error.description) {
      parts.push(`\n${error.description}`);
    }

    // Impact (why this matters)
    if (error.impact) {
      const impactText = colorize('Impact:', COLORS.bright, opts.colors);
      parts.push(`\n${impactText} ${error.impact}`);
    }

    // Actions to resolve
    if (error.actions.length > 0) {
      parts.push(formatActions(error.actions, opts.colors, opts.includeLinks));
    }

    // Debug information
    if (opts.debug && error.debug) {
      parts.push(formatDebugInfo(error.debug, opts.colors));
    }

    const message = wrapText(parts.join(''), opts.maxWidth);

    return {
      message,
      exitCode: this.getExitCode(error.severity),
      shouldContinue: this.shouldContinue(error.severity, error.type),
    };
  }

  /**
   * Create a structured error from a raw error with automatic categorization
   */
  createStructuredError(
    rawError: Error | string,
    operation: string,
    context: Record<string, unknown> = {},
    cwd?: string,
  ): StructuredError {
    const message = typeof rawError === 'string' ? rawError : rawError.message;
    const originalError = typeof rawError === 'string' ? undefined : rawError;

    // Try to match against known error patterns
    const knownError = this.matchKnownError(message);
    if (knownError) {
      return {
        ...knownError,
        debug: this.defaultOptions.debug
          ? createDebugInfo(operation, context, originalError, cwd)
          : undefined,
        originalError,
      };
    }

    // Categorize unknown errors
    const categorized = this.categorizeError(message);

    return {
      code: `${categorized.category.toUpperCase()}_UNKNOWN_999`,
      severity: categorized.severity,
      category: categorized.category,
      type: categorized.type,
      message: categorized.message,
      description: `An unexpected error occurred during ${operation}`,
      impact: 'Operation may have failed or completed with limitations',
      actions: [
        {
          description: 'Check the error details and try again',
        },
        {
          description: 'If the problem persists, check documentation',
          link: 'https://docs.kodebase.ai/git-ops/troubleshooting',
        },
      ],
      debug: this.defaultOptions.debug
        ? createDebugInfo(operation, context, originalError, cwd)
        : undefined,
      originalError,
    };
  }

  /**
   * Quick format for simple error messages
   */
  formatSimple(
    message: string,
    operation: string,
    context: Record<string, unknown> = {},
  ): FormattedError {
    const structuredError = this.createStructuredError(
      message,
      operation,
      context,
    );
    return this.format(structuredError);
  }

  private getSeverityIcon(severity: ErrorSeverity): string {
    switch (severity) {
      case 'critical':
        return '💥';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
    }
  }

  private getExitCode(severity: ErrorSeverity): number {
    switch (severity) {
      case 'critical':
        return 2;
      case 'error':
        return 1;
      case 'warning':
        return 0;
      case 'info':
        return 0;
    }
  }

  private shouldContinue(
    severity: ErrorSeverity,
    type: StructuredError['type'],
  ): boolean {
    // Critical errors and system failures should stop execution
    if (severity === 'critical') return false;
    if (type === 'system_failure' && severity === 'error') return false;

    // User errors and external dependencies can continue with warnings
    return true;
  }

  private matchKnownError(message: string): StructuredError | null {
    const lowerMessage = message.toLowerCase();

    // GitHub CLI patterns
    if (
      lowerMessage.includes('command not found') &&
      lowerMessage.includes('gh')
    ) {
      return getErrorByCode('NETWORK_EXTERNAL_001') || null;
    }
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
      return getErrorByCode('NETWORK_AUTH_001') || null;
    }

    // Git configuration patterns
    if (
      lowerMessage.includes('user.name') ||
      lowerMessage.includes('user.email')
    ) {
      return getErrorByCode('GIT_CONFIG_001') || null;
    }
    if (lowerMessage.includes('not a git repository')) {
      return getErrorByCode('GIT_REPO_001') || null;
    }

    // Permission patterns
    if (
      lowerMessage.includes('permission denied') ||
      lowerMessage.includes('eacces')
    ) {
      return getErrorByCode('PERMISSIONS_FILE_001') || null;
    }

    // Network patterns
    if (lowerMessage.includes('timeout') || lowerMessage.includes('network')) {
      return getErrorByCode('NETWORK_CONNECTION_001') || null;
    }

    return null;
  }

  private categorizeError(message: string): {
    category: StructuredError['category'];
    severity: ErrorSeverity;
    type: StructuredError['type'];
    message: string;
  } {
    const lowerMessage = message.toLowerCase();

    // Network issues
    if (lowerMessage.includes('network') || lowerMessage.includes('timeout')) {
      return {
        category: 'network',
        severity: 'warning',
        type: 'external_dependency',
        message: 'Network operation failed',
      };
    }

    // Permission issues
    if (
      lowerMessage.includes('permission') ||
      lowerMessage.includes('eacces')
    ) {
      return {
        category: 'permissions',
        severity: 'error',
        type: 'system_failure',
        message: 'Permission denied',
      };
    }

    // Git issues
    if (lowerMessage.includes('git')) {
      return {
        category: 'git_repository',
        severity: 'error',
        type: 'user_error',
        message: 'Git operation failed',
      };
    }

    // Default categorization
    return {
      category: 'unknown',
      severity: 'error',
      type: 'system_failure',
      message: message || 'Unknown error occurred',
    };
  }
}
