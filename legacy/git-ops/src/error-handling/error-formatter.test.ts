/**
 * Tests for error formatter functionality
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  GIT_CONFIG_MISSING,
  GITHUB_CLI_NOT_INSTALLED,
  INVALID_ARTIFACT_ID,
} from './error-catalog';
import { ErrorFormatter } from './error-formatter';
import type { StructuredError } from './types';

// Function to check for ANSI color codes
function hasAnsiColorCodes(text: string): boolean {
  return text.includes('\u001b[');
}

describe('ErrorFormatter', () => {
  let formatter: ErrorFormatter;

  beforeEach(() => {
    formatter = new ErrorFormatter({ debug: true });
    // Reset environment variables
    delete process.env.DEBUG;
    delete process.env.KODEBASE_DEBUG;
    delete process.env.KODEBASE_HOOKS_DEBUG;
    delete process.env.NO_COLOR;
    delete process.env.FORCE_COLOR;

    // Mock process.argv
    process.argv = ['node', 'test'];
  });

  describe('format', () => {
    it('should format a basic structured error', () => {
      const error: StructuredError = {
        code: 'TEST_ERROR_001',
        severity: 'error',
        category: 'validation',
        type: 'user_error',
        message: 'Test error',
        description: 'This is a test error for validation',
        actions: [
          {
            description: 'Fix the test',
            command: 'npm test',
          },
        ],
      };

      const result = formatter.format(error, { colors: false });

      expect(result.message).toContain('❌ ERROR: Test error [TEST_ERROR_001]');
      expect(result.message).toContain('This is a test error for validation');
      expect(result.message).toContain('How to fix:');
      expect(result.message).toContain('1. Fix the test');
      expect(result.message).toContain('→ npm test');
      expect(result.exitCode).toBe(1);
      expect(result.shouldContinue).toBe(true);
    });

    it('should format error with impact and multiple actions', () => {
      const error: StructuredError = {
        code: 'TEST_ERROR_002',
        severity: 'warning',
        category: 'network',
        type: 'external_dependency',
        message: 'Network timeout',
        description: 'Connection to external service failed',
        impact: 'Some features may be unavailable',
        actions: [
          {
            description: 'Check internet connection',
            command: 'ping google.com',
          },
          {
            description: 'Retry the operation',
          },
          {
            description: 'Check service status',
            link: 'https://status.example.com',
          },
        ],
      };

      const result = formatter.format(error, {
        colors: false,
        includeLinks: true,
      });

      expect(result.message).toContain(
        '⚠️ WARNING: Network timeout [TEST_ERROR_002]',
      );
      expect(result.message).toContain(
        'Impact: Some features may be unavailable',
      );
      expect(result.message).toContain('1. Check internet connection');
      expect(result.message).toContain('2. Retry the operation');
      expect(result.message).toContain('3. Check service status');
      expect(result.message).toContain('ℹ https://status.example.com');
      expect(result.exitCode).toBe(0);
      expect(result.shouldContinue).toBe(true);
    });

    it('should include debug information when enabled', () => {
      const error: StructuredError = {
        code: 'TEST_ERROR_003',
        severity: 'error',
        category: 'git_config',
        type: 'user_error',
        message: 'Git config missing',
        description: 'Required git configuration is missing',
        actions: [],
        debug: {
          operation: 'test-operation',
          context: {
            repoPath: '/test/repo',
            configKey: 'user.name',
          },
          timestamp: '2025-01-15T10:30:00Z',
          environment: {
            platform: 'darwin',
            nodeVersion: 'v20.0.0',
            gitVersion: 'git version 2.39.0',
            cwd: '/test/repo',
          },
          stackTrace: 'Error: Test stack trace\n    at test.js:1:1',
        },
      };

      const result = formatter.format(error, { debug: true, colors: false });

      expect(result.message).toContain('Debug Information:');
      expect(result.message).toContain('Operation: test-operation');
      expect(result.message).toContain('Timestamp: 2025-01-15T10:30:00Z');
      expect(result.message).toContain('Context:');
      expect(result.message).toContain('repoPath: "/test/repo"');
      expect(result.message).toContain('Environment:');
      expect(result.message).toContain('platform: darwin');
      expect(result.message).toContain('Stack Trace:');
      expect(result.message).toContain('Error: Test stack trace');
    });

    it('should not include debug information when disabled', () => {
      const error: StructuredError = {
        code: 'TEST_ERROR_004',
        severity: 'error',
        category: 'git_config',
        type: 'user_error',
        message: 'Git config missing',
        description: 'Required git configuration is missing',
        actions: [],
        debug: {
          operation: 'test-operation',
          context: { repoPath: '/test/repo' },
          timestamp: '2025-01-15T10:30:00Z',
        },
      };

      const result = formatter.format(error, { debug: false, colors: false });

      expect(result.message).not.toContain('Debug Information:');
      expect(result.message).not.toContain('Operation: test-operation');
    });

    it('should handle critical errors correctly', () => {
      const error: StructuredError = {
        code: 'TEST_CRITICAL_001',
        severity: 'critical',
        category: 'system',
        type: 'system_failure',
        message: 'System failure',
        description: 'Critical system component failed',
        actions: [],
      };

      const result = formatter.format(error);

      expect(result.message).toContain('💥 CRITICAL: System failure');
      expect(result.exitCode).toBe(2);
      expect(result.shouldContinue).toBe(false);
    });

    it('should handle info level messages', () => {
      const error: StructuredError = {
        code: 'TEST_INFO_001',
        severity: 'info',
        category: 'validation',
        type: 'user_error',
        message: 'Information',
        description: 'This is just information',
        actions: [],
      };

      const result = formatter.format(error);

      expect(result.message).toContain('ℹ️ INFO: Information');
      expect(result.exitCode).toBe(0);
      expect(result.shouldContinue).toBe(true);
    });

    it('should wrap text to specified width', () => {
      const error: StructuredError = {
        code: 'TEST_WRAP_001',
        severity: 'error',
        category: 'validation',
        type: 'user_error',
        message: 'Very long error message that should be wrapped',
        description:
          'This is a very long description that should be wrapped when the maxWidth option is set to a small value like 40 characters',
        actions: [],
      };

      const result = formatter.format(error, { maxWidth: 40, colors: false });

      const lines = result.message.split('\n');
      const hasWrappedLines = lines.some(
        (line) => line.length <= 40 && line.length > 20,
      );
      expect(hasWrappedLines).toBe(true);
    });
  });

  describe('createStructuredError', () => {
    it('should create structured error from Error object', () => {
      const originalError = new Error('Unique test error 12345');
      originalError.stack =
        'Error: Unique test error 12345\n    at test.js:1:1';

      const result = formatter.createStructuredError(
        originalError,
        'test-operation',
        { testContext: 'value' },
        '/test/cwd',
      );

      expect(result.code).toContain('UNKNOWN_999');
      expect(result.message).toContain('error');
      expect(result.description).toBe(
        'An unexpected error occurred during test-operation',
      );
      expect(result.originalError).toBe(originalError);
      // Debug information should be present since debug mode is enabled
      expect(result.debug).toBeDefined();
      expect(result.debug?.operation).toBe('test-operation');
      expect(result.debug?.context).toEqual({ testContext: 'value' });
    });

    it('should create structured error from string', () => {
      const result = formatter.createStructuredError(
        'String error message',
        'test-operation',
        { testContext: 'value' },
      );

      expect(result.code).toContain('UNKNOWN_999');
      expect(result.message).toContain('error');
      expect(result.originalError).toBeUndefined();
    });

    it('should match known GitHub CLI error', () => {
      const result = formatter.createStructuredError(
        'gh: command not found',
        'test-operation',
      );

      expect(result.code).toBe('NETWORK_EXTERNAL_001');
      expect(result.message).toBe('GitHub CLI not installed');
      expect(result.category).toBe('network');
      expect(result.type).toBe('external_dependency');
    });

    it('should match known Git config error', () => {
      const result = formatter.createStructuredError(
        'Please tell me who you are: user.name',
        'test-operation',
      );

      expect(result.code).toBe('GIT_CONFIG_001');
      expect(result.message).toBe('Git configuration missing');
      expect(result.category).toBe('git_config');
    });

    it('should match known authentication error', () => {
      const result = formatter.createStructuredError(
        'HTTP 401: Unauthorized',
        'test-operation',
      );

      expect(result.code).toBe('NETWORK_AUTH_001');
      expect(result.message).toBe('GitHub authentication required');
      expect(result.category).toBe('authentication');
    });

    it('should categorize permission errors', () => {
      const result = formatter.createStructuredError(
        'Permission denied accessing file',
        'test-operation',
      );

      expect(result.category).toBe('permissions');
      expect(result.severity).toBe('error');
      expect(result.type).toBe('system_failure');
    });

    it('should categorize network errors', () => {
      const result = formatter.createStructuredError(
        'Network timeout occurred',
        'test-operation',
      );

      expect(result.category).toBe('network');
      expect(result.severity).toBe('warning');
      expect(result.type).toBe('external_dependency');
    });

    it('should categorize git errors', () => {
      const result = formatter.createStructuredError(
        'Git operation failed',
        'test-operation',
      );

      expect(result.category).toBe('git_repository');
      expect(result.severity).toBe('error');
      expect(result.type).toBe('user_error');
    });
  });

  describe('formatSimple', () => {
    it('should format simple error message', () => {
      const result = formatter.formatSimple('Simple error', 'test-operation', {
        context: 'test',
      });

      expect(result.message).toContain('Simple error');
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
      expect(typeof result.shouldContinue).toBe('boolean');
    });
  });

  describe('debug mode detection', () => {
    it('should detect DEBUG environment variable', () => {
      process.env.DEBUG = '1';
      const formatter = new ErrorFormatter();

      const error: StructuredError = {
        code: 'TEST_001',
        severity: 'error',
        category: 'validation',
        type: 'user_error',
        message: 'Test',
        description: 'Test',
        actions: [],
        debug: {
          operation: 'test',
          context: {},
          timestamp: '2025-01-15T10:30:00Z',
        },
      };

      const result = formatter.format(error);
      expect(result.message).toContain('Debug Information:');
    });

    it('should detect KODEBASE_DEBUG environment variable', () => {
      process.env.KODEBASE_DEBUG = 'true';
      const formatter = new ErrorFormatter();

      const error: StructuredError = {
        code: 'TEST_001',
        severity: 'error',
        category: 'validation',
        type: 'user_error',
        message: 'Test',
        description: 'Test',
        actions: [],
        debug: {
          operation: 'test',
          context: {},
          timestamp: '2025-01-15T10:30:00Z',
        },
      };

      const result = formatter.format(error);
      expect(result.message).toContain('Debug Information:');
    });

    it('should detect --debug command line argument', () => {
      process.argv = ['node', 'test', '--debug'];
      const formatter = new ErrorFormatter();

      const error: StructuredError = {
        code: 'TEST_001',
        severity: 'error',
        category: 'validation',
        type: 'user_error',
        message: 'Test',
        description: 'Test',
        actions: [],
        debug: {
          operation: 'test',
          context: {},
          timestamp: '2025-01-15T10:30:00Z',
        },
      };

      const result = formatter.format(error);
      expect(result.message).toContain('Debug Information:');
    });
  });

  describe('color handling', () => {
    it('should not use colors when disabled', () => {
      const error: StructuredError = {
        code: 'TEST_001',
        severity: 'error',
        category: 'validation',
        type: 'user_error',
        message: 'Test error',
        description: 'Test description',
        actions: [],
      };

      const result = formatter.format(error, { colors: false });

      // Should not contain ANSI color codes
      expect(hasAnsiColorCodes(result.message)).toBe(false);
    });

    it('should respect NO_COLOR environment variable', () => {
      process.env.NO_COLOR = '1';
      const formatter = new ErrorFormatter();

      const error: StructuredError = {
        code: 'TEST_001',
        severity: 'error',
        category: 'validation',
        type: 'user_error',
        message: 'Test error',
        description: 'Test description',
        actions: [],
      };

      const result = formatter.format(error);
      expect(hasAnsiColorCodes(result.message)).toBe(false);
    });
  });

  describe('error catalog integration', () => {
    it('should use predefined error from catalog', () => {
      const result = formatter.format(GITHUB_CLI_NOT_INSTALLED, {
        colors: false,
      });

      expect(result.message).toContain('GitHub CLI not installed');
      expect(result.message).toContain('brew install gh');
      expect(result.message).toContain('https://cli.github.com/');
    });

    it('should use predefined artifact validation error', () => {
      const result = formatter.format(INVALID_ARTIFACT_ID, { colors: false });

      expect(result.message).toContain('Invalid artifact ID format');
      expect(result.message).toContain('git checkout -b A.1.5');
    });

    it('should use predefined git config error', () => {
      const result = formatter.format(GIT_CONFIG_MISSING, { colors: false });

      expect(result.message).toContain('Git configuration missing');
      expect(result.message).toContain('git config user.name');
      expect(result.message).toContain('git config user.email');
    });
  });
});
