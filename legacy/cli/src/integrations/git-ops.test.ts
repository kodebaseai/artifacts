/**
 * Tests for Git-Ops Integration Module
 */

import { existsSync } from 'node:fs';
import { CLIBridge } from '@kodebase/git-ops';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ensureGitRepository,
  getCLIBridge,
  isGitRepository,
  resetCLIBridge,
  withGitOpsErrorHandling,
} from './git-ops';

// Mock fs module
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

// Mock CLIBridge
vi.mock('@kodebase/git-ops', () => ({
  CLIBridge: vi.fn().mockImplementation(() => ({
    executeCommand: vi.fn(),
  })),
  formatError: vi.fn().mockImplementation((message) => `Formatted: ${message}`),
}));

describe('Git-Ops Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCLIBridge();
  });

  describe('getCLIBridge', () => {
    it('should create a singleton instance of CLIBridge', () => {
      const bridge1 = getCLIBridge();
      const bridge2 = getCLIBridge();

      expect(bridge1).toBe(bridge2);
      expect(CLIBridge).toHaveBeenCalledTimes(1);
    });

    it('should pass configuration to CLIBridge', () => {
      const config = {
        repoRoot: '/test/repo',
        defaultTimeout: 60000,
      };

      getCLIBridge(config);

      expect(CLIBridge).toHaveBeenCalledWith(
        expect.objectContaining({
          repoRoot: '/test/repo',
          defaultTimeout: 60000,
        }),
      );
    });
  });

  describe('isGitRepository', () => {
    it('should return true when .git directory exists', () => {
      vi.mocked(existsSync).mockReturnValue(true);

      const result = isGitRepository('/test/repo');

      expect(result).toBe(true);
      expect(existsSync).toHaveBeenCalledWith('/test/repo/.git');
    });

    it('should return false when .git directory does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = isGitRepository('/test/repo');

      expect(result).toBe(false);
    });

    it('should use current working directory when no path provided', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const originalCwd = process.cwd();

      isGitRepository();

      expect(existsSync).toHaveBeenCalledWith(`${originalCwd}/.git`);
    });
  });

  describe('ensureGitRepository', () => {
    it('should not throw when in a git repository', () => {
      vi.mocked(existsSync).mockReturnValue(true);

      expect(() => ensureGitRepository('/test/repo')).not.toThrow();
    });

    it('should throw error when not in a git repository', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      expect(() => ensureGitRepository('/test/repo')).toThrow(
        'Not in a git repository. Please run this command from within a git repository.',
      );
    });
  });

  describe('withGitOpsErrorHandling', () => {
    it('should return result when operation succeeds', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withGitOpsErrorHandling(operation);

      expect(result).toBe('success');
    });

    it('should format structured errors from git-ops', async () => {
      const structuredError = {
        code: 'TEST_ERROR',
        message: 'Test error message',
        category: 'test',
      };
      const operation = vi.fn().mockRejectedValue(structuredError);

      await expect(
        withGitOpsErrorHandling(operation, 'Test context'),
      ).rejects.toThrow('Formatted: Test error message');
    });

    it('should handle generic errors', async () => {
      const error = new Error('Generic error');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(withGitOpsErrorHandling(operation)).rejects.toThrow(
        'Generic error',
      );
    });

    it('should add context to error messages when provided', async () => {
      const error = new Error('Original error');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(
        withGitOpsErrorHandling(operation, 'Operation failed'),
      ).rejects.toThrow('Operation failed: Original error');
    });
  });

  describe('resetCLIBridge', () => {
    it('should reset the CLIBridge instance', () => {
      // Create an instance
      getCLIBridge();
      expect(CLIBridge).toHaveBeenCalledTimes(1);

      // Reset
      resetCLIBridge();

      // Create again - should create a new instance
      getCLIBridge();
      expect(CLIBridge).toHaveBeenCalledTimes(2);
    });
  });
});
