import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostMergeContext } from '../types';
import { CHookExitCode } from '../types';
import { PostMergeHook } from './post-merge';

describe('PostMergeHook', () => {
  let hook: PostMergeHook;
  let mockContext: PostMergeContext;
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
      hookType: 'post-merge',
      repoPath: '/tmp/test-repo',
      args: [],
      env: {},
      cwd: '/tmp/test-repo',
      isSquash: false,
      mergedBranch: 'A.1.5',
      mergeCommit: 'abc123def456',
    };

    hook = new PostMergeHook();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('shouldRun', () => {
    it('should run when on main branch', async () => {
      const mockGetCurrentBranch = vi.fn().mockResolvedValue('main');
      Object.defineProperty(hook, 'getCurrentBranch', {
        value: mockGetCurrentBranch,
        writable: true,
      });

      const result = await hook.shouldRun(mockContext);
      expect(result).toBe(true);
    });

    it('should run when on master branch', async () => {
      const mockGetCurrentBranch = vi.fn().mockResolvedValue('master');
      Object.defineProperty(hook, 'getCurrentBranch', {
        value: mockGetCurrentBranch,
        writable: true,
      });

      const result = await hook.shouldRun(mockContext);
      expect(result).toBe(true);
    });

    it('should not run when on feature branch', async () => {
      const mockGetCurrentBranch = vi
        .fn()
        .mockResolvedValue('feature/something');
      Object.defineProperty(hook, 'getCurrentBranch', {
        value: mockGetCurrentBranch,
        writable: true,
      });

      const result = await hook.shouldRun(mockContext);
      expect(result).toBe(false);
    });
  });

  describe('run', () => {
    it('should detect artifact merge and add completed event', async () => {
      const mockGetMergedBranch = vi.fn().mockResolvedValue('A.1.5');
      const mockStateTransition = vi.fn().mockResolvedValue(undefined);
      const mockCascadeAnalysis = vi.fn().mockResolvedValue({ cascaded: true });

      Object.defineProperty(hook, 'getMergedBranch', {
        value: mockGetMergedBranch,
        writable: true,
      });
      Object.defineProperty(hook, 'performStateTransition', {
        value: mockStateTransition,
        writable: true,
      });
      Object.defineProperty(hook, 'performCascadeAnalysis', {
        value: mockCascadeAnalysis,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.SUCCESS);
      expect(result.message).toContain('completed event added');
      expect(result.continue).toBe(true);
      expect(mockStateTransition).toHaveBeenCalledWith(
        'A.1.5',
        'completed',
        '/tmp/test-repo',
        expect.objectContaining({
          mergeCommit: 'abc123def456',
        }),
      );
      expect(mockCascadeAnalysis).toHaveBeenCalledWith(
        'A.1.5',
        '/tmp/test-repo',
      );
    });

    it('should skip non-artifact branches', async () => {
      const mockGetMergedBranch = vi
        .fn()
        .mockResolvedValue('feature/random-branch');
      const mockStateTransition = vi.fn();

      Object.defineProperty(hook, 'getMergedBranch', {
        value: mockGetMergedBranch,
        writable: true,
      });
      Object.defineProperty(hook, 'performStateTransition', {
        value: mockStateTransition,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.SUCCESS);
      expect(result.message).toContain('Not an artifact branch');
      expect(result.continue).toBe(true);
      expect(mockStateTransition).not.toHaveBeenCalled();
    });

    it('should handle errors when adding event', async () => {
      const mockGetMergedBranch = vi.fn().mockResolvedValue('A.1.5');
      const mockStateTransition = vi
        .fn()
        .mockRejectedValue(new Error('Event error'));
      const mockCascadeAnalysis = vi
        .fn()
        .mockResolvedValue({ cascaded: false });

      Object.defineProperty(hook, 'getMergedBranch', {
        value: mockGetMergedBranch,
        writable: true,
      });
      Object.defineProperty(hook, 'performStateTransition', {
        value: mockStateTransition,
        writable: true,
      });
      Object.defineProperty(hook, 'performCascadeAnalysis', {
        value: mockCascadeAnalysis,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.SUCCESS);
      expect(result.message).toContain('Failed to add completed event');
      expect(result.continue).toBe(true);
      expect(mockCascadeAnalysis).toHaveBeenCalled();
    });

    it('should handle cascade failures gracefully', async () => {
      const mockGetMergedBranch = vi.fn().mockResolvedValue('A.1.5');
      const mockStateTransition = vi.fn().mockResolvedValue(undefined);
      const mockCascadeAnalysis = vi
        .fn()
        .mockRejectedValue(new Error('Cascade error'));

      Object.defineProperty(hook, 'getMergedBranch', {
        value: mockGetMergedBranch,
        writable: true,
      });
      Object.defineProperty(hook, 'performStateTransition', {
        value: mockStateTransition,
        writable: true,
      });
      Object.defineProperty(hook, 'performCascadeAnalysis', {
        value: mockCascadeAnalysis,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.SUCCESS);
      expect(result.message).toContain('Cascade analysis failed');
      expect(result.continue).toBe(true);
    });

    it('should handle missing merged branch info', async () => {
      const mockGetMergedBranch = vi.fn().mockResolvedValue(null);

      Object.defineProperty(hook, 'getMergedBranch', {
        value: mockGetMergedBranch,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.SUCCESS);
      expect(result.message).toContain('Could not determine merged branch');
      expect(result.continue).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const mockGetMergedBranch = vi
        .fn()
        .mockRejectedValue(new Error('Git error'));

      Object.defineProperty(hook, 'getMergedBranch', {
        value: mockGetMergedBranch,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.ERROR);
      expect(result.message).toContain('Git operation failed');
      expect(result.continue).toBe(true); // Structured errors continue by default unless critical
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Post-merge hook error:',
        expect.any(Error),
      );
    });
  });

  describe('merge detection', () => {
    it('should extract branch name from merge commit message', () => {
      const extractBranchName = Reflect.get(
        hook,
        'extractBranchFromCommitMessage',
      ).bind(hook);

      expect(extractBranchName("Merge branch 'A.1.5'")).toBe('A.1.5');
      expect(extractBranchName("Merge branch 'A.1.5' into main")).toBe('A.1.5');
      expect(extractBranchName('Merge pull request #42 from org/A.1.5')).toBe(
        'A.1.5',
      );
      expect(extractBranchName('Random commit message')).toBeNull();
    });
  });
});
