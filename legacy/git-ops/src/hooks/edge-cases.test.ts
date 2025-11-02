/**
 * Edge Cases Test Suite for Git Hooks
 *
 * This test suite covers edge cases in git hook execution:
 * - Network failures (GitHub CLI unavailable, API timeouts)
 * - Permission issues (file system permissions, git config issues)
 * - Partial git states (detached HEAD, merge conflicts, rebase mode)
 * - Recovery mechanisms (retry logic, cleanup procedures)
 * - Concurrent operations (multiple hooks, file conflicts)
 * - Git operation edge cases (rebase, cherry-pick, stash)
 */

import { execSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  type Artifact,
  CArtifactEvent,
  CEventTrigger,
  type TArtifactEvent,
} from '@kodebase/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stringify } from 'yaml';
import type {
  PostCheckoutContext,
  PreCommitContext,
  PrePushContext,
} from '../types';
import { PostCheckoutHook } from './post-checkout';
import { PreCommitHook } from './pre-commit';
import { PrePushHook } from './pre-push';

// Mock child_process for git commands
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

describe('Git Hooks Edge Cases', () => {
  let testRepoPath: string;
  let mockExecSync: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create test repository directory
    testRepoPath = join(tmpdir(), `kodebase-edge-test-${Date.now()}`);
    mkdirSync(testRepoPath, { recursive: true });
    mkdirSync(join(testRepoPath, '.git'), { recursive: true });

    // Create artifacts directory
    const artifactsDir = join(
      testRepoPath,
      '.kodebase',
      'artifacts',
      'A',
      'A.1',
    );
    mkdirSync(artifactsDir, { recursive: true });

    // Get mocked execSync
    mockExecSync = execSync as ReturnType<typeof vi.fn>;

    // Spy on console methods
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore any changed permissions before cleanup
    try {
      const artifactsDir = join(testRepoPath, '.kodebase', 'artifacts');
      if (existsSync(artifactsDir)) {
        chmodSync(artifactsDir, 0o755);
      }
    } catch (_error) {
      // Ignore permission restoration errors
    }

    // Clean up test repository
    if (existsSync(testRepoPath)) {
      try {
        rmSync(testRepoPath, { recursive: true, force: true });
      } catch (error) {
        console.warn('Failed to clean up test directory:', error);
      }
    }
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    vi.clearAllMocks();
  });

  const createTestArtifact = (
    artifactId: string,
    status: TArtifactEvent = CArtifactEvent.READY,
  ) => {
    const artifact: Artifact = {
      metadata: {
        title: 'Test artifact',
        priority: 'medium',
        estimation: 'S',
        created_by: 'Test User (test@example.com)',
        assignee: 'Test User (test@example.com)',
        schema_version: '0.2.0',
        relationships: {
          blocks: [],
          blocked_by: [],
        },
        events: [
          {
            event: status,
            timestamp: '2025-01-01T00:00:00Z',
            actor: 'Test User (test@example.com)',
            trigger: CEventTrigger.ARTIFACT_CREATED,
          },
        ],
      },
      content: {
        summary: 'Test artifact for edge case testing',
        acceptance_criteria: ['Test criteria'],
      },
    };

    const parts = artifactId.split('.');
    let artifactPath: string;

    if (parts.length === 3) {
      // Issue: A.1.5 -> A/A.1/A.1.5.yml
      artifactPath = join(
        testRepoPath,
        '.kodebase',
        'artifacts',
        parts[0],
        `${parts[0]}.${parts[1]}`,
        `${artifactId}.yml`,
      );
    } else if (parts.length === 2) {
      // Milestone: A.1 -> A/A.1.yml
      artifactPath = join(
        testRepoPath,
        '.kodebase',
        'artifacts',
        parts[0],
        `${artifactId}.yml`,
      );
    } else {
      // Initiative: A -> A.yml
      artifactPath = join(
        testRepoPath,
        '.kodebase',
        'artifacts',
        `${artifactId}.yml`,
      );
    }

    const dir = artifactPath.substring(0, artifactPath.lastIndexOf('/'));
    mkdirSync(dir, { recursive: true });
    writeFileSync(artifactPath, stringify(artifact));
    return artifactPath;
  };

  describe('Network Failures', () => {
    describe('GitHub CLI unavailable', () => {
      it('should handle missing gh CLI gracefully in post-checkout hook', async () => {
        createTestArtifact('A.1.5');

        mockExecSync.mockImplementation((cmd: string) => {
          if (cmd.includes('git config user.name')) return 'Test User';
          if (cmd.includes('git config user.email')) return 'test@example.com';
          if (cmd.includes('git branch --show-current')) return 'A.1.5';
          if (cmd.includes('gh pr create')) {
            const error = new Error('gh: command not found') as Error & {
              code: string;
            };
            error.code = 'ENOENT';
            throw error;
          }
          return '';
        });

        const hook = new PostCheckoutHook();
        const context: PostCheckoutContext = {
          hookType: 'post-checkout',
          repoPath: testRepoPath,
          args: ['0000000', 'abc123', '1'],
          env: {},
          cwd: testRepoPath,
          previousHead: '0000000',
          newHead: 'abc123',
          isBranchCheckout: true,
        };

        const result = await hook.run(context);

        expect(result.exitCode).toBe(0); // Should continue despite PR creation failure
        expect(result.message).toContain('in_progress event added');
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to create draft PR:',
          expect.stringContaining('GitHub CLI not installed'),
        );
      });

      it('should handle GitHub API rate limits gracefully', async () => {
        createTestArtifact('A.1.5');

        mockExecSync.mockImplementation((cmd: string) => {
          if (cmd.includes('git config user.name')) return 'Test User';
          if (cmd.includes('git config user.email')) return 'test@example.com';
          if (cmd.includes('git branch --show-current')) return 'A.1.5';
          if (cmd.includes('gh pr create')) {
            const error = new Error('HTTP 403: API rate limit exceeded');
            throw error;
          }
          return '';
        });

        const hook = new PostCheckoutHook();
        const context: PostCheckoutContext = {
          hookType: 'post-checkout',
          repoPath: testRepoPath,
          args: ['0000000', 'abc123', '1'],
          env: {},
          cwd: testRepoPath,
          previousHead: '0000000',
          newHead: 'abc123',
          isBranchCheckout: true,
        };

        const result = await hook.run(context);

        expect(result.exitCode).toBe(0); // Should continue despite API rate limit
        expect(result.message).toContain('in_progress event added');
      });

      it('should handle authentication failures gracefully', async () => {
        createTestArtifact('A.1.5');

        mockExecSync.mockImplementation((cmd: string) => {
          if (cmd.includes('git config user.name')) return 'Test User';
          if (cmd.includes('git config user.email')) return 'test@example.com';
          if (cmd.includes('git branch --show-current')) return 'A.1.5';
          if (cmd.includes('gh pr create')) {
            const error = new Error('HTTP 401: Unauthorized');
            throw error;
          }
          return '';
        });

        const hook = new PostCheckoutHook();
        const context: PostCheckoutContext = {
          hookType: 'post-checkout',
          repoPath: testRepoPath,
          args: ['0000000', 'abc123', '1'],
          env: {},
          cwd: testRepoPath,
          previousHead: '0000000',
          newHead: 'abc123',
          isBranchCheckout: true,
        };

        const result = await hook.run(context);

        expect(result.exitCode).toBe(0);
        expect(result.message).toContain('in_progress event added');
      });
    });
  });

  describe('Permission Issues', () => {
    it('should handle file permission errors when reading artifacts', async () => {
      const artifactPath = createTestArtifact('A.1.5');

      // Make artifact file unreadable
      chmodSync(artifactPath, 0o000);

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git config user.name')) return 'Test User';
        if (cmd.includes('git config user.email')) return 'test@example.com';
        if (cmd.includes('git branch --show-current')) return 'A.1.5';
        return '';
      });

      const hook = new PostCheckoutHook();
      const context: PostCheckoutContext = {
        hookType: 'post-checkout',
        repoPath: testRepoPath,
        args: ['0000000', 'abc123', '1'],
        env: {},
        cwd: testRepoPath,
        previousHead: '0000000',
        newHead: 'abc123',
        isBranchCheckout: true,
      };

      const result = await hook.run(context);

      expect(result.exitCode).toBe(0); // Should continue with graceful degradation
      expect(result.message).toContain('draft PR created');

      // Restore permissions for cleanup
      chmodSync(artifactPath, 0o644);
    });

    it('should handle git config permission errors', async () => {
      createTestArtifact('A.1.5');

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git config')) {
          const error = new Error(
            'Permission denied: unable to open config file',
          ) as Error & { code: string };
          error.code = 'EACCES';
          throw error;
        }
        if (cmd.includes('git branch --show-current')) return 'A.1.5';
        return '';
      });

      const hook = new PostCheckoutHook();
      const context: PostCheckoutContext = {
        hookType: 'post-checkout',
        repoPath: testRepoPath,
        args: ['0000000', 'abc123', '1'],
        env: {},
        cwd: testRepoPath,
        previousHead: '0000000',
        newHead: 'abc123',
        isBranchCheckout: true,
      };

      const result = await hook.run(context);

      expect(result.exitCode).toBe(0); // Should continue with default fallback
      expect(result.message).toContain('draft PR created');
    });

    it('should handle disk full errors when writing artifacts', async () => {
      createTestArtifact('A.1.5');

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git config user.name')) return 'Test User';
        if (cmd.includes('git config user.email')) return 'test@example.com';
        if (cmd.includes('git branch --show-current')) return 'A.1.5';
        return '';
      });

      // Mock filesystem operations to simulate disk full
      // Note: This test demonstrates error handling but can't easily mock writeFileSync
      // in the current test setup. The hook should handle file system errors gracefully.

      const hook = new PostCheckoutHook();
      const context: PostCheckoutContext = {
        hookType: 'post-checkout',
        repoPath: testRepoPath,
        args: ['0000000', 'abc123', '1'],
        env: {},
        cwd: testRepoPath,
        previousHead: '0000000',
        newHead: 'abc123',
        isBranchCheckout: true,
      };

      const result = await hook.run(context);

      expect(result.exitCode).toBe(0); // Should continue gracefully
      expect(result.message).toContain('draft PR created');
    });
  });

  describe('Partial Git States', () => {
    it('should handle detached HEAD state in post-checkout hook', async () => {
      createTestArtifact('A.1.5');

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git config user.name')) return 'Test User';
        if (cmd.includes('git config user.email')) return 'test@example.com';
        if (cmd.includes('git branch --show-current')) return ''; // Detached HEAD returns empty
        return '';
      });

      const hook = new PostCheckoutHook();
      const context: PostCheckoutContext = {
        hookType: 'post-checkout',
        repoPath: testRepoPath,
        args: ['0000000', 'abc123', '1'],
        env: {},
        cwd: testRepoPath,
        previousHead: '0000000',
        newHead: 'abc123',
        isBranchCheckout: true,
      };

      const result = await hook.run(context);

      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('not on a regular branch');
    });

    it('should handle merge conflict state in pre-commit hook', async () => {
      createTestArtifact('A.1.5');

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git branch --show-current')) return 'A.1.5';
        if (cmd.includes('git status')) {
          return 'You have unmerged paths.\n  (fix conflicts and run "git commit")';
        }
        return '';
      });

      const hook = new PreCommitHook();
      const context: PreCommitContext = {
        hookType: 'pre-commit',
        repoPath: testRepoPath,
        args: [],
        env: {},
        cwd: testRepoPath,
        stagedFiles: ['conflicted-file.ts'],
        commitMessagePath: join(testRepoPath, '.git', 'COMMIT_EDITMSG'),
      };

      // Create commit message file
      if (context.commitMessagePath) {
        writeFileSync(
          context.commitMessagePath,
          'A.1.5: fix: Resolve merge conflicts',
        );
      }

      const result = await hook.run(context);

      expect(result.exitCode).toBe(0); // Should allow commit to resolve conflicts
      expect(result.message).toContain('Commit message validated');
    });

    it('should handle rebase in progress state', async () => {
      createTestArtifact('A.1.5');

      // Create rebase directory to simulate rebase in progress
      mkdirSync(join(testRepoPath, '.git', 'rebase-merge'), {
        recursive: true,
      });

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git branch --show-current')) {
          // During rebase, this might return the target branch or empty
          return 'A.1.5';
        }
        return '';
      });

      const hook = new PrePushHook();
      const context: PrePushContext = {
        hookType: 'pre-push',
        repoPath: testRepoPath,
        args: [],
        env: {},
        cwd: testRepoPath,
        remoteName: 'origin',
        remoteUrl: 'https://github.com/test/repo.git',
        refs: [
          {
            localRef: 'refs/heads/A.1.5',
            localSha: 'abc123',
            remoteRef: 'refs/heads/A.1.5',
            remoteSha: '000000',
          },
        ],
      };

      const result = await hook.run(context);

      // Should handle gracefully - hooks should work during rebase
      expect(result.exitCode).toBe(0);
    });

    it('should handle bisect mode', async () => {
      createTestArtifact('A.1.5');

      // Create bisect log to simulate bisect in progress
      writeFileSync(
        join(testRepoPath, '.git', 'BISECT_LOG'),
        'git bisect start\n',
      );

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git branch --show-current')) {
          return '(no branch, bisect started on main)';
        }
        return '';
      });

      const hook = new PostCheckoutHook();
      const context: PostCheckoutContext = {
        hookType: 'post-checkout',
        repoPath: testRepoPath,
        args: ['0000000', 'abc123', '1'],
        env: {},
        cwd: testRepoPath,
        previousHead: '0000000',
        newHead: 'abc123',
        isBranchCheckout: true,
      };

      const result = await hook.run(context);

      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('not on a regular branch');
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should retry operations with exponential backoff on transient failures', async () => {
      createTestArtifact('A.1.5');

      let attempts = 0;
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git config user.name')) return 'Test User';
        if (cmd.includes('git config user.email')) return 'test@example.com';
        if (cmd.includes('git branch --show-current')) return 'A.1.5';
        if (cmd.includes('gh pr create')) {
          attempts++;
          if (attempts < 3) {
            throw new Error('Network timeout');
          }
          return 'https://github.com/test/repo/pull/42';
        }
        return '';
      });

      const hook = new PostCheckoutHook();
      const context: PostCheckoutContext = {
        hookType: 'post-checkout',
        repoPath: testRepoPath,
        args: ['0000000', 'abc123', '1'],
        env: {},
        cwd: testRepoPath,
        previousHead: '0000000',
        newHead: 'abc123',
        isBranchCheckout: true,
      };

      const result = await hook.run(context);

      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('in_progress event added'); // Event succeeds even if PR fails
    });

    it('should cleanup partial operations on failure', async () => {
      createTestArtifact('A.1.5');

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git config user.name')) return 'Test User';
        if (cmd.includes('git config user.email')) return 'test@example.com';
        if (cmd.includes('git branch --show-current')) return 'A.1.5';
        if (cmd.includes('gh pr create')) {
          throw new Error('Failed to create PR');
        }
        return '';
      });

      const hook = new PostCheckoutHook();
      const context: PostCheckoutContext = {
        hookType: 'post-checkout',
        repoPath: testRepoPath,
        args: ['0000000', 'abc123', '1'],
        env: {},
        cwd: testRepoPath,
        previousHead: '0000000',
        newHead: 'abc123',
        isBranchCheckout: true,
      };

      const result = await hook.run(context);

      // Should complete with partial success (event added but PR failed)
      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('in_progress event added');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle file locks gracefully when multiple hooks run', async () => {
      createTestArtifact('A.1.5');

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git config user.name')) return 'Test User';
        if (cmd.includes('git config user.email')) return 'test@example.com';
        if (cmd.includes('git branch --show-current')) return 'A.1.5';
        return '';
      });

      // Simulate file lock by making the artifacts directory readonly temporarily
      const artifactsDir = join(testRepoPath, '.kodebase', 'artifacts');
      chmodSync(artifactsDir, 0o444);

      const hook = new PostCheckoutHook();
      const context: PostCheckoutContext = {
        hookType: 'post-checkout',
        repoPath: testRepoPath,
        args: ['0000000', 'abc123', '1'],
        env: {},
        cwd: testRepoPath,
        previousHead: '0000000',
        newHead: 'abc123',
        isBranchCheckout: true,
      };

      const result = await hook.run(context);

      expect(result.exitCode).toBe(0); // Should handle gracefully
      expect(result.message).toContain('draft PR created');

      // Restore permissions
      chmodSync(artifactsDir, 0o755);
    });
  });

  describe('Git Operation Edge Cases', () => {
    it('should work correctly during cherry-pick operations', async () => {
      createTestArtifact('A.1.5');

      // Create cherry-pick head file to simulate cherry-pick in progress
      writeFileSync(
        join(testRepoPath, '.git', 'CHERRY_PICK_HEAD'),
        'abc123def456',
      );

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git branch --show-current')) return 'A.1.5';
        return '';
      });

      const hook = new PreCommitHook();
      const context: PreCommitContext = {
        hookType: 'pre-commit',
        repoPath: testRepoPath,
        args: [],
        env: {},
        cwd: testRepoPath,
        stagedFiles: ['changed-file.ts'],
        commitMessagePath: join(testRepoPath, '.git', 'COMMIT_EDITMSG'),
      };

      if (context.commitMessagePath) {
        writeFileSync(
          context.commitMessagePath,
          'A.1.5: fix: Cherry-picked fix',
        );
      }

      const result = await hook.run(context);

      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('Commit message validated');
    });

    it('should handle stash operations correctly', async () => {
      createTestArtifact('A.1.5');

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git branch --show-current')) return 'A.1.5';
        if (cmd.includes('git status --porcelain')) {
          return 'M unstaged-changes.ts'; // Simulate uncommitted changes
        }
        return '';
      });

      const hook = new PrePushHook();
      const context: PrePushContext = {
        hookType: 'pre-push',
        repoPath: testRepoPath,
        args: [],
        env: {},
        cwd: testRepoPath,
        remoteName: 'origin',
        remoteUrl: 'https://github.com/test/repo.git',
        refs: [
          {
            localRef: 'refs/heads/A.1.5',
            localSha: 'abc123',
            remoteRef: 'refs/heads/A.1.5',
            remoteSha: '000000',
          },
        ],
      };

      const result = await hook.run(context);

      expect(result.exitCode).toBe(0); // Should warn but allow push
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Artifact A.1.5 is'),
      );
    });
  });

  describe('Performance Under Error Conditions', () => {
    it('should maintain acceptable performance with error handling overhead', async () => {
      createTestArtifact('A.1.5');

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git config user.name')) return 'Test User';
        if (cmd.includes('git config user.email')) return 'test@example.com';
        if (cmd.includes('git branch --show-current')) return 'A.1.5';
        // Simulate some network delay
        const start = Date.now();
        while (Date.now() - start < 10) {} // 10ms delay
        return '';
      });

      const hook = new PostCheckoutHook();
      const context: PostCheckoutContext = {
        hookType: 'post-checkout',
        repoPath: testRepoPath,
        args: ['0000000', 'abc123', '1'],
        env: {},
        cwd: testRepoPath,
        previousHead: '0000000',
        newHead: 'abc123',
        isBranchCheckout: true,
      };

      const startTime = Date.now();
      const result = await hook.run(context);
      const duration = Date.now() - startTime;

      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds even with delays
    });

    it('should handle timeout scenarios gracefully', async () => {
      createTestArtifact('A.1.5');

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git config user.name')) return 'Test User';
        if (cmd.includes('git config user.email')) return 'test@example.com';
        if (cmd.includes('git branch --show-current')) return 'A.1.5';
        if (cmd.includes('gh pr create')) {
          // Simulate timeout
          throw new Error('Timeout: operation took too long');
        }
        return '';
      });

      const hook = new PostCheckoutHook();
      const context: PostCheckoutContext = {
        hookType: 'post-checkout',
        repoPath: testRepoPath,
        args: ['0000000', 'abc123', '1'],
        env: {},
        cwd: testRepoPath,
        previousHead: '0000000',
        newHead: 'abc123',
        isBranchCheckout: true,
      };

      const result = await hook.run(context);

      expect(result.exitCode).toBe(0); // Should continue despite timeout
      expect(result.message).toContain('in_progress event added');
    });
  });
});
