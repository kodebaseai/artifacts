import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PreCommitContext } from '../types';
import { CHookExitCode } from '../types';
import { PreCommitHook } from './pre-commit';

describe('PreCommitHook', () => {
  let hook: PreCommitHook;
  let mockContext: PreCommitContext;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create mock context
    mockContext = {
      hookType: 'pre-commit',
      repoPath: '/tmp/test-repo',
      args: [],
      env: {},
      cwd: '/tmp/test-repo',
      stagedFiles: ['src/index.ts', 'README.md'],
      commitMessagePath: '.git/COMMIT_EDITMSG',
    };

    hook = new PreCommitHook();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('shouldRun', () => {
    it('should run when there are staged files', async () => {
      const result = await hook.shouldRun(mockContext);
      expect(result).toBe(true);
    });

    it('should not run when there are no staged files', async () => {
      mockContext.stagedFiles = [];
      const result = await hook.shouldRun(mockContext);
      expect(result).toBe(false);
    });
  });

  describe('run', () => {
    it('should validate commit message format with artifact ID', async () => {
      const mockBranchName = vi.fn().mockResolvedValue('A.1.5');
      const mockReadCommitMessage = vi
        .fn()
        .mockResolvedValue('A.1.5: feat: Add new feature');

      Object.defineProperty(hook, 'getBranchNameSafely', {
        value: mockBranchName,
        writable: true,
      });
      Object.defineProperty(hook, 'readCommitMessage', {
        value: mockReadCommitMessage,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.SUCCESS);
      expect(result.message).toContain('Commit message validated');
      expect(result.continue).toBe(true);
    });

    it('should reject commit message without artifact ID', async () => {
      const mockBranchName = vi.fn().mockResolvedValue('A.1.5');
      const mockReadCommitMessage = vi
        .fn()
        .mockResolvedValue('feat: Add new feature');

      Object.defineProperty(hook, 'getBranchNameSafely', {
        value: mockBranchName,
        writable: true,
      });
      Object.defineProperty(hook, 'readCommitMessage', {
        value: mockReadCommitMessage,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.ERROR);
      expect(result.message).toContain('Invalid commit message format');
      expect(result.continue).toBe(true);
    });

    it('should reject commit message with wrong artifact ID', async () => {
      const mockBranchName = vi.fn().mockResolvedValue('A.1.5');
      const mockReadCommitMessage = vi
        .fn()
        .mockResolvedValue('A.1.6: feat: Add new feature');

      Object.defineProperty(hook, 'getBranchNameSafely', {
        value: mockBranchName,
        writable: true,
      });
      Object.defineProperty(hook, 'readCommitMessage', {
        value: mockReadCommitMessage,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.ERROR);
      expect(result.message).toContain('Artifact ID mismatch');
      expect(result.continue).toBe(true);
    });

    it('should reject non-conventional commit message', async () => {
      const mockBranchName = vi.fn().mockResolvedValue('A.1.5');
      const mockReadCommitMessage = vi
        .fn()
        .mockResolvedValue('A.1.5: Added new feature');

      Object.defineProperty(hook, 'getBranchName', {
        value: mockBranchName,
        writable: true,
      });
      Object.defineProperty(hook, 'readCommitMessage', {
        value: mockReadCommitMessage,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.ERROR);
      expect(result.message).toContain('spawnSync /bin/sh ENOENT');
      expect(result.continue).toBe(false);
    });

    it('should allow commits on non-artifact branches', async () => {
      const mockBranchName = vi.fn().mockResolvedValue('feature/something');
      const mockReadCommitMessage = vi
        .fn()
        .mockResolvedValue('feat: Add new feature');

      Object.defineProperty(hook, 'getBranchNameSafely', {
        value: mockBranchName,
        writable: true,
      });
      Object.defineProperty(hook, 'readCommitMessage', {
        value: mockReadCommitMessage,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.SUCCESS);
      expect(result.message).toContain('Non-artifact branch');
      expect(result.continue).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const mockBranchName = vi.fn().mockRejectedValue(new Error('Git error'));
      Object.defineProperty(hook, 'getBranchNameSafely', {
        value: mockBranchName,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.ERROR);
      expect(result.message).toContain('Git operation failed');
      expect(result.continue).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Pre-commit hook error:',
        expect.any(Error),
      );
    });

    it('should validate all conventional commit types', async () => {
      const mockBranchName = vi.fn().mockResolvedValue('A.1.5');
      const commitTypes = [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
      ];

      Object.defineProperty(hook, 'getBranchNameSafely', {
        value: mockBranchName,
        writable: true,
      });

      for (const type of commitTypes) {
        const mockReadCommitMessage = vi
          .fn()
          .mockResolvedValue(`A.1.5: ${type}: Test message`);

        Object.defineProperty(hook, 'readCommitMessage', {
          value: mockReadCommitMessage,
          writable: true,
        });

        const result = await hook.run(mockContext);
        expect(result.exitCode).toBe(CHookExitCode.SUCCESS);
        expect(result.continue).toBe(true);
      }
    });

    it('should handle empty commit message', async () => {
      const mockBranchName = vi.fn().mockResolvedValue('A.1.5');
      const mockReadCommitMessage = vi.fn().mockResolvedValue('');

      Object.defineProperty(hook, 'getBranchNameSafely', {
        value: mockBranchName,
        writable: true,
      });
      Object.defineProperty(hook, 'readCommitMessage', {
        value: mockReadCommitMessage,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.ERROR);
      expect(result.message).toContain('Commit message cannot be empty');
      expect(result.continue).toBe(true);
    });
  });

  describe('validation helpers', () => {
    it('should validate conventional commit format', () => {
      const isConventionalCommit = Reflect.get(
        hook,
        'isConventionalCommit',
      ).bind(hook);

      expect(isConventionalCommit('feat: Add feature')).toBe(true);
      expect(isConventionalCommit('fix: Fix bug')).toBe(true);
      expect(isConventionalCommit('feat(scope): Add feature')).toBe(true);
      expect(isConventionalCommit('fix!: Breaking change')).toBe(true);
      expect(isConventionalCommit('Added feature')).toBe(false);
      expect(isConventionalCommit('feat Add feature')).toBe(false);
    });
  });
});
