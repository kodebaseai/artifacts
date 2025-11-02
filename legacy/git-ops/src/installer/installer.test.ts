import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstallOptions, UninstallOptions } from '../types';
import { HookInstaller } from './installer';

// Mock fs module
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
  chmodSync: vi.fn(),
}));

// Mock child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

describe('HookInstaller', () => {
  let installer: HookInstaller;
  let mockExistsSync: ReturnType<typeof vi.fn>;
  let mockReadFileSync: ReturnType<typeof vi.fn>;
  let mockWriteFileSync: ReturnType<typeof vi.fn>;
  let mockMkdirSync: ReturnType<typeof vi.fn>;
  let mockUnlinkSync: ReturnType<typeof vi.fn>;
  let mockChmodSync: ReturnType<typeof vi.fn>;
  let mockExecSync: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import mocked functions
    const fs = await import('node:fs');
    const cp = await import('node:child_process');

    mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>;
    mockReadFileSync = fs.readFileSync as ReturnType<typeof vi.fn>;
    mockWriteFileSync = fs.writeFileSync as ReturnType<typeof vi.fn>;
    mockMkdirSync = fs.mkdirSync as ReturnType<typeof vi.fn>;
    mockUnlinkSync = fs.unlinkSync as ReturnType<typeof vi.fn>;
    mockChmodSync = fs.chmodSync as ReturnType<typeof vi.fn>;
    mockExecSync = cp.execSync as ReturnType<typeof vi.fn>;

    // Set default return values
    mockWriteFileSync.mockReturnValue(undefined);
    mockMkdirSync.mockReturnValue(undefined);
    mockUnlinkSync.mockReturnValue(undefined);
    mockChmodSync.mockReturnValue(undefined);

    installer = new HookInstaller();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('install', () => {
    it('should install all hooks by default', async () => {
      const options: InstallOptions = {
        repoPath: '/test/repo',
      };

      // Clear any previous mock calls
      vi.clearAllMocks();

      // Mock git directory exists, but hooks don't exist yet
      mockExistsSync
        .mockReturnValueOnce(true) // .git exists
        .mockReturnValueOnce(true) // .git/hooks exists
        .mockReturnValueOnce(false) // post-checkout doesn't exist
        .mockReturnValueOnce(false) // pre-commit doesn't exist
        .mockReturnValueOnce(false) // pre-push doesn't exist
        .mockReturnValueOnce(false); // post-merge doesn't exist
      mockExecSync.mockReturnValue('true'); // core.hooksPath not set

      const result = await installer.install(options);

      expect(result.success).toBe(true);
      expect(result.installed).toHaveLength(4); // post-checkout, pre-commit, pre-push, post-merge
      expect(result.installed).toContain('post-checkout');
      expect(result.installed).toContain('pre-commit');
      expect(result.installed).toContain('pre-push');
      expect(result.installed).toContain('post-merge');

      // Should write hook files (no backups)
      expect(mockWriteFileSync).toHaveBeenCalledTimes(4);
      expect(mockChmodSync).toHaveBeenCalledTimes(4);
      expect(result.backups).toHaveLength(0);
    });

    it('should install specific hooks when provided', async () => {
      const options: InstallOptions = {
        repoPath: '/test/repo',
        hooks: ['pre-commit', 'post-checkout'],
      };

      vi.clearAllMocks();

      mockExistsSync
        .mockReturnValueOnce(true) // .git exists
        .mockReturnValueOnce(true) // .git/hooks exists
        .mockReturnValueOnce(false) // pre-commit doesn't exist
        .mockReturnValueOnce(false); // post-checkout doesn't exist
      mockExecSync.mockReturnValue('true');

      const result = await installer.install(options);

      expect(result.success).toBe(true);
      expect(result.installed).toHaveLength(2);
      expect(result.installed).toContain('pre-commit');
      expect(result.installed).toContain('post-checkout');
      expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
    });

    it('should fail if not a git repository', async () => {
      const options: InstallOptions = {
        repoPath: '/test/repo',
      };

      mockExistsSync.mockReturnValue(false);

      const result = await installer.install(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a git repository');
      expect(result.installed).toHaveLength(0);
    });

    it('should warn if core.hooksPath is set', async () => {
      const options: InstallOptions = {
        repoPath: '/test/repo',
      };

      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('/custom/hooks/path');
      mockReadFileSync.mockReturnValue('');

      const result = await installer.install(options);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain(
        'core.hooksPath is set to /custom/hooks/path',
      );
    });

    it('should create hooks directory if it does not exist', async () => {
      const options: InstallOptions = {
        repoPath: '/test/repo',
      };

      mockExistsSync
        .mockReturnValueOnce(true) // .git exists
        .mockReturnValueOnce(false); // .git/hooks does not exist
      mockExecSync.mockReturnValue('true');

      await installer.install(options);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        join('/test/repo', '.git', 'hooks'),
        { recursive: true },
      );
    });

    it('should backup existing hooks', async () => {
      const options: InstallOptions = {
        repoPath: '/test/repo',
        hooks: ['pre-commit'],
      };

      mockExistsSync
        .mockReturnValueOnce(true) // .git exists
        .mockReturnValueOnce(true) // .git/hooks exists
        .mockReturnValueOnce(true); // pre-commit hook exists
      mockExecSync.mockReturnValue('true');
      mockReadFileSync.mockReturnValue('#!/bin/bash\necho "existing hook"');

      const result = await installer.install(options);

      expect(result.success).toBe(true);
      expect(result.backups).toHaveLength(1);
      expect(result.backups[0]).toMatch(/pre-commit\.backup\.\d+/);
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.backup.'),
        '#!/bin/bash\necho "existing hook"',
      );
    });

    it('should not overwrite kodebase hooks', async () => {
      const options: InstallOptions = {
        repoPath: '/test/repo',
        hooks: ['pre-commit'],
      };

      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('true');
      mockReadFileSync.mockReturnValue(
        '#!/bin/bash\n# Generated by @kodebase/git-ops\necho "kodebase hook"',
      );

      const result = await installer.install(options);

      expect(result.success).toBe(true);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped).toContain('pre-commit');
      expect(result.warnings).toContain('pre-commit hook already installed');
    });

    it('should write correct hook content', async () => {
      const options: InstallOptions = {
        repoPath: '/test/repo',
        hooks: ['pre-commit'],
      };

      vi.clearAllMocks();

      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('true');
      mockReadFileSync.mockReturnValue('');

      await installer.install(options);

      expect(mockWriteFileSync).toHaveBeenCalled();
      // Find the call that writes the hook content (not backup)
      const hookWriteCall = mockWriteFileSync.mock.calls.find(
        (call) =>
          typeof call[1] === 'string' && call[1].includes('#!/bin/bash'),
      );

      expect(hookWriteCall).toBeDefined();
      const writtenContent = hookWriteCall?.[1] as string;
      expect(writtenContent).toContain('#!/bin/bash');
      expect(writtenContent).toContain('# Generated by @kodebase/git-ops');
      expect(writtenContent).toContain('npx @kodebase/git-ops run pre-commit');
    });

    it('should make hooks executable', async () => {
      const options: InstallOptions = {
        repoPath: '/test/repo',
        hooks: ['pre-commit'],
      };

      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('true');
      mockReadFileSync.mockReturnValue('');

      await installer.install(options);

      expect(mockChmodSync).toHaveBeenCalledWith(
        join('/test/repo', '.git', 'hooks', 'pre-commit'),
        0o755,
      );
    });
  });

  describe('uninstall', () => {
    it('should uninstall all hooks by default', async () => {
      const options: UninstallOptions = {
        repoPath: '/test/repo',
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        '#!/bin/bash\n# Generated by @kodebase/git-ops\necho "hook"',
      );

      const result = await installer.uninstall(options);

      expect(result.success).toBe(true);
      expect(result.uninstalled).toHaveLength(4);
      expect(mockUnlinkSync).toHaveBeenCalledTimes(4);
    });

    it('should uninstall specific hooks when provided', async () => {
      const options: UninstallOptions = {
        repoPath: '/test/repo',
        hooks: ['pre-commit'],
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        '#!/bin/bash\n# Generated by @kodebase/git-ops\necho "hook"',
      );

      const result = await installer.uninstall(options);

      expect(result.success).toBe(true);
      expect(result.uninstalled).toHaveLength(1);
      expect(result.uninstalled).toContain('pre-commit');
      expect(mockUnlinkSync).toHaveBeenCalledTimes(1);
    });

    it('should not uninstall non-kodebase hooks', async () => {
      const options: UninstallOptions = {
        repoPath: '/test/repo',
        hooks: ['pre-commit'],
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('#!/bin/bash\necho "custom hook"');

      const result = await installer.uninstall(options);

      expect(result.success).toBe(true);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped).toContain('pre-commit');
      expect(result.warnings).toContain('pre-commit is not a kodebase hook');
      expect(mockUnlinkSync).not.toHaveBeenCalled();
    });

    it('should restore backups if available', async () => {
      const options: UninstallOptions = {
        repoPath: '/test/repo',
        hooks: ['pre-commit'],
        restoreBackups: true,
      };

      mockExistsSync
        .mockReturnValueOnce(true) // .git exists
        .mockReturnValueOnce(true) // pre-commit exists
        .mockReturnValueOnce(true); // backup exists

      mockReadFileSync
        .mockReturnValueOnce(
          '#!/bin/bash\n# Generated by @kodebase/git-ops\necho "hook"',
        )
        .mockReturnValueOnce('#!/bin/bash\necho "original hook"');

      // Mock findLatestBackup
      mockExecSync.mockReturnValueOnce('pre-commit.backup.123456\n');

      const result = await installer.uninstall(options);

      expect(result.success).toBe(true);
      expect(result.restored).toHaveLength(1);
      expect(result.restored).toContain('pre-commit');
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        join('/test/repo', '.git', 'hooks', 'pre-commit'),
        '#!/bin/bash\necho "original hook"',
      );
    });

    it('should handle missing hooks gracefully', async () => {
      const options: UninstallOptions = {
        repoPath: '/test/repo',
        hooks: ['pre-commit'],
      };

      mockExistsSync
        .mockReturnValueOnce(true) // .git exists
        .mockReturnValueOnce(false); // pre-commit does not exist

      const result = await installer.uninstall(options);

      expect(result.success).toBe(true);
      expect(result.notFound).toHaveLength(1);
      expect(result.notFound).toContain('pre-commit');
    });
  });

  describe('status', () => {
    it('should report status of all hooks', async () => {
      mockExistsSync
        .mockReturnValueOnce(true) // .git exists
        .mockReturnValueOnce(true) // post-checkout exists
        .mockReturnValueOnce(true) // pre-commit exists
        .mockReturnValueOnce(true) // pre-push exists
        .mockReturnValueOnce(true); // post-merge exists

      mockReadFileSync
        .mockReturnValueOnce('#!/bin/bash\necho "custom hook"') // post-checkout
        .mockReturnValueOnce(
          '#!/bin/bash\n# Generated by @kodebase/git-ops\necho "hook"',
        ) // pre-commit
        .mockReturnValueOnce(
          '#!/bin/bash\n# Generated by @kodebase/git-ops\necho "hook"',
        ) // pre-push
        .mockReturnValueOnce(
          '#!/bin/bash\n# Generated by @kodebase/git-ops\necho "hook"',
        ); // post-merge

      const result = await installer.status('/test/repo');

      expect(result).toHaveLength(4);

      const preCommit = result.find((h) => h.name === 'pre-commit');
      expect(preCommit?.installed).toBe(true);
      expect(preCommit?.isKodebase).toBe(true);

      const postCheckout = result.find((h) => h.name === 'post-checkout');
      expect(postCheckout?.installed).toBe(true);
      expect(postCheckout?.isKodebase).toBe(false);
    });

    it('should handle missing hooks', async () => {
      mockExistsSync
        .mockReturnValueOnce(true) // .git exists
        .mockReturnValueOnce(false) // post-checkout does not exist
        .mockReturnValueOnce(false) // pre-commit does not exist
        .mockReturnValueOnce(false) // pre-push does not exist
        .mockReturnValueOnce(false); // post-merge does not exist

      const result = await installer.status('/test/repo');

      const preCommit = result.find((h) => h.name === 'pre-commit');
      expect(preCommit?.installed).toBe(false);
      expect(preCommit?.isKodebase).toBe(false);
    });
  });
});
