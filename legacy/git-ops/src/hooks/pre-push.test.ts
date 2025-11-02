import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrePushContext } from '../types';
import { CHookExitCode } from '../types';
import { PrePushHook } from './pre-push';

describe('PrePushHook', () => {
  let hook: PrePushHook;
  let mockContext: PrePushContext;
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
      hookType: 'pre-push',
      repoPath: '/tmp/test-repo',
      args: ['origin', 'https://github.com/test/repo.git'],
      env: {},
      cwd: '/tmp/test-repo',
      remoteName: 'origin',
      remoteUrl: 'https://github.com/test/repo.git',
      refs: [],
    };

    hook = new PrePushHook();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('shouldRun', () => {
    it('should run when there are refs to push', async () => {
      mockContext.refs = [
        {
          localRef: 'refs/heads/A.1.5',
          localSha: 'abc123',
          remoteRef: 'refs/heads/A.1.5',
          remoteSha: '000000',
        },
      ];

      const result = await hook.shouldRun(mockContext);
      expect(result).toBe(true);
    });

    it('should not run when there are no refs', async () => {
      mockContext.refs = [];
      const result = await hook.shouldRun(mockContext);
      expect(result).toBe(false);
    });
  });

  describe('run', () => {
    it('should allow push for valid artifact branch', async () => {
      mockContext.refs = [
        {
          localRef: 'refs/heads/A.1.5',
          localSha: 'abc123',
          remoteRef: 'refs/heads/A.1.5',
          remoteSha: '000000',
        },
      ];

      const mockGetArtifactStatus = vi.fn().mockResolvedValue('in_progress');
      const mockHasUncommittedChanges = vi.fn().mockResolvedValue(false);

      Object.defineProperty(hook, 'getArtifactStatus', {
        value: mockGetArtifactStatus,
        writable: true,
      });
      Object.defineProperty(hook, 'hasUncommittedChanges', {
        value: mockHasUncommittedChanges,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.SUCCESS);
      expect(result.message).toContain('Pre-push validation passed');
      expect(result.continue).toBe(true);
    });

    it('should block push for completed artifacts', async () => {
      mockContext.refs = [
        {
          localRef: 'refs/heads/A.1.5',
          localSha: 'abc123',
          remoteRef: 'refs/heads/A.1.5',
          remoteSha: '000000',
        },
      ];

      const mockGetArtifactStatus = vi.fn().mockResolvedValue('completed');
      const mockHasUncommittedChanges = vi.fn().mockResolvedValue(false);

      Object.defineProperty(hook, 'getArtifactStatus', {
        value: mockGetArtifactStatus,
        writable: true,
      });
      Object.defineProperty(hook, 'hasUncommittedChanges', {
        value: mockHasUncommittedChanges,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.ERROR);
      expect(result.message).toContain('Cannot push to completed artifact');
      expect(result.continue).toBe(false);
    });

    it('should block push for archived artifacts', async () => {
      mockContext.refs = [
        {
          localRef: 'refs/heads/A.1.5',
          localSha: 'abc123',
          remoteRef: 'refs/heads/A.1.5',
          remoteSha: '000000',
        },
      ];

      const mockGetArtifactStatus = vi.fn().mockResolvedValue('archived');
      const mockHasUncommittedChanges = vi.fn().mockResolvedValue(false);

      Object.defineProperty(hook, 'getArtifactStatus', {
        value: mockGetArtifactStatus,
        writable: true,
      });
      Object.defineProperty(hook, 'hasUncommittedChanges', {
        value: mockHasUncommittedChanges,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.ERROR);
      expect(result.message).toContain('Cannot push to archived artifact');
      expect(result.continue).toBe(false);
    });

    it('should warn about uncommitted changes', async () => {
      mockContext.refs = [
        {
          localRef: 'refs/heads/A.1.5',
          localSha: 'abc123',
          remoteRef: 'refs/heads/A.1.5',
          remoteSha: '000000',
        },
      ];

      const mockGetArtifactStatus = vi.fn().mockResolvedValue('in_progress');
      const mockHasUncommittedChanges = vi.fn().mockResolvedValue(true);

      Object.defineProperty(hook, 'getArtifactStatus', {
        value: mockGetArtifactStatus,
        writable: true,
      });
      Object.defineProperty(hook, 'hasUncommittedChanges', {
        value: mockHasUncommittedChanges,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.SUCCESS);
      expect(result.message).toContain('Warning: Uncommitted changes detected');
      expect(result.continue).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('uncommitted changes'),
      );
    });

    it('should allow push for non-artifact branches', async () => {
      mockContext.refs = [
        {
          localRef: 'refs/heads/feature/something',
          localSha: 'abc123',
          remoteRef: 'refs/heads/feature/something',
          remoteSha: '000000',
        },
      ];

      const mockHasUncommittedChanges = vi.fn().mockResolvedValue(false);
      Object.defineProperty(hook, 'hasUncommittedChanges', {
        value: mockHasUncommittedChanges,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.SUCCESS);
      expect(result.message).toBe('✅ Pre-push validation passed');
      expect(result.continue).toBe(true);
    });

    it('should handle multiple refs', async () => {
      mockContext.refs = [
        {
          localRef: 'refs/heads/A.1.5',
          localSha: 'abc123',
          remoteRef: 'refs/heads/A.1.5',
          remoteSha: '000000',
        },
        {
          localRef: 'refs/heads/A.1.6',
          localSha: 'def456',
          remoteRef: 'refs/heads/A.1.6',
          remoteSha: '000000',
        },
      ];

      const mockGetArtifactStatus = vi
        .fn()
        .mockResolvedValueOnce('in_progress')
        .mockResolvedValueOnce('ready');
      const mockHasUncommittedChanges = vi.fn().mockResolvedValue(false);

      Object.defineProperty(hook, 'getArtifactStatus', {
        value: mockGetArtifactStatus,
        writable: true,
      });
      Object.defineProperty(hook, 'hasUncommittedChanges', {
        value: mockHasUncommittedChanges,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.SUCCESS);
      expect(result.continue).toBe(true);
      expect(mockGetArtifactStatus).toHaveBeenCalledTimes(2);
    });

    it('should handle missing artifact', async () => {
      mockContext.refs = [
        {
          localRef: 'refs/heads/A.1.5',
          localSha: 'abc123',
          remoteRef: 'refs/heads/A.1.5',
          remoteSha: '000000',
        },
      ];

      const mockGetArtifactStatus = vi.fn().mockResolvedValue(null);
      const mockHasUncommittedChanges = vi.fn().mockResolvedValue(false);

      Object.defineProperty(hook, 'getArtifactStatus', {
        value: mockGetArtifactStatus,
        writable: true,
      });
      Object.defineProperty(hook, 'hasUncommittedChanges', {
        value: mockHasUncommittedChanges,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.SUCCESS);
      expect(result.message).toContain('Artifact not found');
      expect(result.continue).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockContext.refs = [
        {
          localRef: 'refs/heads/A.1.5',
          localSha: 'abc123',
          remoteRef: 'refs/heads/A.1.5',
          remoteSha: '000000',
        },
      ];

      const mockGetArtifactStatus = vi
        .fn()
        .mockRejectedValue(new Error('Git error'));

      Object.defineProperty(hook, 'getArtifactStatus', {
        value: mockGetArtifactStatus,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.ERROR);
      expect(result.message).toContain('Git operation failed');
      expect(result.continue).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Pre-push hook error:',
        expect.any(Error),
      );
    });
  });

  describe('ref parsing', () => {
    it('should extract branch name from ref', () => {
      const extractBranchName = Reflect.get(hook, 'extractBranchFromRef').bind(
        hook,
      );

      expect(extractBranchName('refs/heads/A.1.5')).toBe('A.1.5');
      expect(extractBranchName('refs/heads/feature/test')).toBe('feature/test');
      expect(extractBranchName('refs/tags/v1.0.0')).toBeNull();
      expect(extractBranchName('invalid-ref')).toBeNull();
    });
  });
});
