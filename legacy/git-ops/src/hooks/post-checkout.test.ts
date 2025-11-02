import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostCheckoutContext } from '../types';
import { CHookExitCode } from '../types';
import { PostCheckoutHook } from './post-checkout';

describe('PostCheckoutHook', () => {
  let hook: PostCheckoutHook;
  let mockContext: PostCheckoutContext;
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
      hookType: 'post-checkout',
      repoPath: '/tmp/test-repo',
      args: [],
      env: {},
      cwd: '/tmp/test-repo',
      previousHead: '0000000000000000000000000000000000000000',
      newHead: 'abc123def456',
      isBranchCheckout: true,
    };

    hook = new PostCheckoutHook();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('shouldRun', () => {
    it('should run when checking out a branch', async () => {
      const result = await hook.shouldRun(mockContext);
      expect(result).toBe(true);
    });

    it('should not run when checking out a file', async () => {
      mockContext.isBranchCheckout = false;
      const result = await hook.shouldRun(mockContext);
      expect(result).toBe(false);
    });

    it('should not run when previousHead equals newHead', async () => {
      mockContext.previousHead = 'abc123def456';
      mockContext.newHead = 'abc123def456';
      const result = await hook.shouldRun(mockContext);
      expect(result).toBe(false);
    });
  });

  describe('run', () => {
    it('should detect artifact branch checkout', async () => {
      const mockBranchName = vi.fn().mockResolvedValue('A.1.5');
      const mockStateTransition = vi.fn().mockResolvedValue(undefined);
      const mockPrCreate = vi
        .fn()
        .mockResolvedValue({ url: 'https://github.com/org/repo/pull/42' });

      Object.defineProperty(hook, 'getBranchNameSafely', {
        value: mockBranchName,
        writable: true,
      });
      Object.defineProperty(hook, 'performStateTransition', {
        value: mockStateTransition,
        writable: true,
      });
      Object.defineProperty(hook, 'createDraftPR', {
        value: mockPrCreate,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.SUCCESS);
      expect(result.message).toContain('in_progress event added');
      expect(result.continue).toBe(true);
      expect(mockBranchName).toHaveBeenCalledWith('/tmp/test-repo');
      expect(mockStateTransition).toHaveBeenCalledWith(
        'A.1.5',
        'in_progress',
        '/tmp/test-repo',
      );
      expect(mockPrCreate).toHaveBeenCalledWith('A.1.5');
    });

    it('should skip non-artifact branches', async () => {
      const mockBranchName = vi.fn().mockResolvedValue('feature/random-branch');
      const mockStateTransition = vi.fn();
      const mockPrCreate = vi.fn();

      Object.defineProperty(hook, 'getBranchNameSafely', {
        value: mockBranchName,
        writable: true,
      });
      Object.defineProperty(hook, 'performStateTransition', {
        value: mockStateTransition,
        writable: true,
      });
      Object.defineProperty(hook, 'createDraftPR', {
        value: mockPrCreate,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.SUCCESS);
      expect(result.message).toContain('Not an artifact branch');
      expect(result.continue).toBe(true);
      expect(mockStateTransition).not.toHaveBeenCalled();
      expect(mockPrCreate).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockBranchName = vi.fn().mockRejectedValue(new Error('Git error'));
      Object.defineProperty(hook, 'getBranchNameSafely', {
        value: mockBranchName,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.SUCCESS); // Graceful degradation
      expect(result.message).toContain('Post-checkout hook failed');
      expect(result.continue).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Post-checkout hook error:',
        expect.any(Error),
      );
    });

    it('should continue if event add fails', async () => {
      const mockBranchName = vi.fn().mockResolvedValue('A.1.5');
      const mockStateTransition = vi
        .fn()
        .mockRejectedValue(new Error('Event error'));
      const mockPrCreate = vi
        .fn()
        .mockResolvedValue({ url: 'https://github.com/org/repo/pull/42' });

      Object.defineProperty(hook, 'getBranchNameSafely', {
        value: mockBranchName,
        writable: true,
      });
      Object.defineProperty(hook, 'performStateTransitionWithRetry', {
        value: mockStateTransition,
        writable: true,
      });
      Object.defineProperty(hook, 'createDraftPRWithRetry', {
        value: mockPrCreate,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.SUCCESS);
      expect(result.message).toContain('draft PR created');
      expect(result.continue).toBe(true);
      expect(mockPrCreate).toHaveBeenCalled();
    });

    it('should continue if PR creation fails', async () => {
      const mockBranchName = vi.fn().mockResolvedValue('A.1.5');
      const mockStateTransition = vi.fn().mockResolvedValue(undefined);
      const mockPrCreate = vi.fn().mockRejectedValue(new Error('PR error'));

      Object.defineProperty(hook, 'getBranchNameSafely', {
        value: mockBranchName,
        writable: true,
      });
      Object.defineProperty(hook, 'performStateTransitionWithRetry', {
        value: mockStateTransition,
        writable: true,
      });
      Object.defineProperty(hook, 'createDraftPRWithRetry', {
        value: mockPrCreate,
        writable: true,
      });

      const result = await hook.run(mockContext);

      expect(result.exitCode).toBe(CHookExitCode.SUCCESS);
      expect(result.message).toContain('in_progress event added');
      expect(result.continue).toBe(true);
      expect(mockStateTransition).toHaveBeenCalled();
    });
  });

  describe('integration helpers', () => {
    it('should validate artifact ID format', () => {
      const isArtifactBranch = Reflect.get(hook, 'isArtifactBranch').bind(hook);
      expect(isArtifactBranch('A.1.5')).toBe(true);
      expect(isArtifactBranch('B.23.11')).toBe(true);
      expect(isArtifactBranch('main')).toBe(false);
      expect(isArtifactBranch('feature/something')).toBe(false);
    });
  });
});
