import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PRCreateOptions, PRUpdateOptions } from '../types';
import { PRManager } from './pr-manager';

// Mock child_process at the module level
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

describe('PRManager', () => {
  let manager: PRManager;
  let mockExecSync: ReturnType<typeof vi.fn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked execSync
    const cp = await import('node:child_process');
    mockExecSync = cp.execSync as ReturnType<typeof vi.fn>;

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    manager = new PRManager();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.resetModules();
  });

  describe('createDraftPR', () => {
    it('should create a draft PR with artifact ID in title', async () => {
      const options: PRCreateOptions = {
        branch: 'A.1.5',
        title: 'Implement feature',
        body: 'Feature implementation',
        draft: true,
        repoPath: '/test/repo',
      };

      mockExecSync.mockReturnValueOnce('https://github.com/org/repo/pull/42'); // PR URL

      const result = await manager.createDraftPR(options);

      expect(result.success).toBe(true);
      expect(result.prUrl).toBe('https://github.com/org/repo/pull/42');
      expect(result.prNumber).toBe(42);

      // Verify gh command was called with correct arguments
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('gh pr create'),
        expect.any(Object),
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--draft'),
        expect.any(Object),
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--title "A.1.5: Implement feature"'),
        expect.any(Object),
      );
    });

    it('should create regular PR when draft is false', async () => {
      const options: PRCreateOptions = {
        branch: 'A.1.5',
        title: 'Implement feature',
        draft: false,
        repoPath: '/test/repo',
      };

      mockExecSync.mockReturnValueOnce('https://github.com/org/repo/pull/43');

      await manager.createDraftPR(options);

      const ghCommand = mockExecSync.mock.calls[0][0];
      expect(ghCommand).not.toContain('--draft');
    });

    it('should use current branch if not specified', async () => {
      const options: PRCreateOptions = {
        title: 'Implement feature',
        repoPath: '/test/repo',
      };

      mockExecSync.mockReturnValueOnce('A.1.6'); // Current branch
      mockExecSync.mockReturnValueOnce('https://github.com/org/repo/pull/44');

      const result = await manager.createDraftPR(options);

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--title \"A.1.6: Implement feature\"'),
        expect.any(Object),
      );
    });

    it('should handle errors gracefully', async () => {
      const options: PRCreateOptions = {
        branch: 'A.1.5',
        title: 'Implement feature',
        repoPath: '/test/repo',
      };

      mockExecSync.mockImplementationOnce(() => {
        throw new Error('GitHub API error');
      });

      const result = await manager.createDraftPR(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('GitHub API error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should include assignees if provided', async () => {
      const options: PRCreateOptions = {
        branch: 'A.1.5',
        title: 'Implement feature',
        assignees: ['user1', 'user2'],
        repoPath: '/test/repo',
      };

      mockExecSync.mockReturnValueOnce('https://github.com/org/repo/pull/45');

      await manager.createDraftPR(options);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--assignee user1,user2'),
        expect.any(Object),
      );
    });

    it('should include reviewers if provided', async () => {
      const options: PRCreateOptions = {
        branch: 'A.1.5',
        title: 'Implement feature',
        reviewers: ['reviewer1', 'reviewer2'],
        repoPath: '/test/repo',
      };

      mockExecSync.mockReturnValueOnce('https://github.com/org/repo/pull/46');

      await manager.createDraftPR(options);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--reviewer reviewer1,reviewer2'),
        expect.any(Object),
      );
    });

    it('should extract PR number from URL', async () => {
      const testCases = [
        { url: 'https://github.com/org/repo/pull/123', expected: 123 },
        {
          url: 'https://gitlab.com/org/repo/-/merge_requests/456',
          expected: 456,
        },
        { url: 'https://github.com/org/repo/pull/789/files', expected: 789 },
      ];

      for (const { url, expected } of testCases) {
        mockExecSync.mockReturnValueOnce(url);

        const result = await manager.createDraftPR({
          branch: 'A.1.5',
          title: 'Test',
          repoPath: '/test/repo',
        });

        expect(result.prNumber).toBe(expected);
      }
    });
  });

  describe('updatePR', () => {
    it('should update PR title', async () => {
      const options: PRUpdateOptions = {
        prNumber: 42,
        title: 'Updated title',
        repoPath: '/test/repo',
      };

      mockExecSync.mockReturnValueOnce(''); // Success

      const result = await manager.updatePR(options);

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'gh pr edit 42 --title "Updated title"',
        expect.any(Object),
      );
    });

    it('should update PR body', async () => {
      const options: PRUpdateOptions = {
        prNumber: 42,
        body: 'Updated description',
        repoPath: '/test/repo',
      };

      mockExecSync.mockReturnValueOnce('');

      await manager.updatePR(options);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--body "Updated description"'),
        expect.any(Object),
      );
    });

    it('should mark PR as ready', async () => {
      const options: PRUpdateOptions = {
        prNumber: 42,
        ready: true,
        repoPath: '/test/repo',
      };

      mockExecSync.mockReturnValueOnce('');

      await manager.updatePR(options);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--ready'),
        expect.any(Object),
      );
    });

    it('should handle update errors', async () => {
      const options: PRUpdateOptions = {
        prNumber: 42,
        title: 'Updated',
        repoPath: '/test/repo',
      };

      mockExecSync.mockImplementationOnce(() => {
        throw new Error('PR not found');
      });

      const result = await manager.updatePR(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('PR not found');
    });

    it('should update multiple fields at once', async () => {
      const options: PRUpdateOptions = {
        prNumber: 42,
        title: 'New Title',
        body: 'New Body',
        ready: true,
        repoPath: '/test/repo',
      };

      mockExecSync.mockReturnValueOnce('');

      await manager.updatePR(options);

      const command = mockExecSync.mock.calls[0][0];
      expect(command).toContain('--title "New Title"');
      expect(command).toContain('--body "New Body"');
      expect(command).toContain('--ready');
    });
  });

  describe('mergePR', () => {
    it('should merge PR with default method', async () => {
      mockExecSync.mockReturnValueOnce(''); // Success

      const result = await manager.mergePR(42, '/test/repo');

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'gh pr merge 42 --merge',
        expect.any(Object),
      );
    });

    it('should merge PR with squash method', async () => {
      mockExecSync.mockReturnValueOnce('');

      await manager.mergePR(42, '/test/repo', { method: 'squash' });

      expect(mockExecSync).toHaveBeenCalledWith(
        'gh pr merge 42 --squash',
        expect.any(Object),
      );
    });

    it('should merge PR with rebase method', async () => {
      mockExecSync.mockReturnValueOnce('');

      await manager.mergePR(42, '/test/repo', { method: 'rebase' });

      expect(mockExecSync).toHaveBeenCalledWith(
        'gh pr merge 42 --rebase',
        expect.any(Object),
      );
    });

    it('should delete branch after merge if requested', async () => {
      mockExecSync.mockReturnValueOnce('');

      await manager.mergePR(42, '/test/repo', { deleteBranch: true });

      expect(mockExecSync).toHaveBeenCalledWith(
        'gh pr merge 42 --merge --delete-branch',
        expect.any(Object),
      );
    });

    it('should handle merge errors', async () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Merge conflict');
      });

      const result = await manager.mergePR(42, '/test/repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Merge conflict');
    });
  });

  describe('getPRInfo', () => {
    it('should get PR information', async () => {
      const prInfo = {
        number: 42,
        title: 'A.1.5: Implement feature',
        state: 'OPEN',
        url: 'https://github.com/org/repo/pull/42',
        author: 'user1',
        isDraft: true,
      };

      mockExecSync.mockReturnValueOnce(JSON.stringify(prInfo));

      const result = await manager.getPRInfo(42, '/test/repo');

      expect(result).toEqual(prInfo);
      expect(mockExecSync).toHaveBeenCalledWith(
        'gh pr view 42 --json number,title,state,url,author,isDraft',
        expect.any(Object),
      );
    });

    it('should handle PR not found', async () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('no pull requests found');
      });

      const result = await manager.getPRInfo(42, '/test/repo');

      expect(result).toBeNull();
    });
  });

  describe('listPRs', () => {
    it('should list PRs for a branch', async () => {
      const prs = [
        { number: 42, title: 'A.1.5: Feature', state: 'OPEN' },
        { number: 43, title: 'A.1.5: Fix', state: 'MERGED' },
      ];

      mockExecSync.mockReturnValueOnce(JSON.stringify(prs));

      const result = await manager.listPRs('/test/repo', { branch: 'A.1.5' });

      expect(result).toEqual(prs);
      expect(mockExecSync).toHaveBeenCalledWith(
        'gh pr list --head A.1.5 --json number,title,state,url,author,isDraft',
        expect.any(Object),
      );
    });

    it('should list PRs with specific state', async () => {
      mockExecSync.mockReturnValueOnce('[]');

      await manager.listPRs('/test/repo', { state: 'open' });

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--state open'),
        expect.any(Object),
      );
    });

    it('should list all PRs if no filters', async () => {
      mockExecSync.mockReturnValueOnce('[]');

      await manager.listPRs('/test/repo');

      expect(mockExecSync).toHaveBeenCalledWith(
        'gh pr list --json number,title,state,url,author,isDraft',
        expect.any(Object),
      );
    });
  });
});
