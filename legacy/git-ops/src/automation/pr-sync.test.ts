/**
 * PR Sync tests
 */

import { CArtifactEvent, CEventTrigger } from '@kodebase/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRSync } from './pr-sync';

// Mock dependencies
vi.mock('../hooks/artifact-loader');
vi.mock('../branch');
vi.mock('../error-handling');
vi.mock('./pr-manager');

const mockArtifactLoader = {
  loadArtifact: vi.fn(),
  saveArtifact: vi.fn(),
  getGitActor: vi.fn(),
};

const mockBranchValidator = {
  validate: vi.fn(),
};

const mockPRManager = {
  getPRInfo: vi.fn(),
  updatePR: vi.fn(),
  listPRs: vi.fn(),
};

// Mock node:child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

describe('PRSync', () => {
  let prSync: PRSync;

  beforeEach(() => {
    vi.clearAllMocks();
    prSync = new PRSync();

    // Set up mocks
    (
      prSync as unknown as { artifactLoader: typeof mockArtifactLoader }
    ).artifactLoader = mockArtifactLoader;
    (
      prSync as unknown as { branchValidator: typeof mockBranchValidator }
    ).branchValidator = mockBranchValidator;
    (prSync as unknown as { prManager: typeof mockPRManager }).prManager =
      mockPRManager;
  });

  describe('validateSyncConfig', () => {
    it('should validate required fields', () => {
      const result = prSync.validateSyncConfig({
        artifactId: '',
        repoPath: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Artifact ID is required');
      expect(result.errors).toContain('Repository path is required');
    });

    it('should validate artifact ID format', () => {
      mockBranchValidator.validate.mockReturnValue({
        valid: false,
        error: 'Invalid format',
      });

      const result = prSync.validateSyncConfig({
        artifactId: 'invalid-id',
        repoPath: '/path/to/repo',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Invalid artifact ID format: Invalid format',
      );
    });

    it('should pass validation for valid config', () => {
      mockBranchValidator.validate.mockReturnValue({
        valid: true,
      });

      const result = prSync.validateSyncConfig({
        artifactId: 'A.1.2',
        repoPath: '/path/to/repo',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('syncArtifactToPR', () => {
    const mockArtifact = {
      metadata: {
        title: 'Test Artifact',
        events: [
          {
            event: CArtifactEvent.IN_REVIEW,
            timestamp: '2025-01-01T00:00:00Z',
            actor: 'Test User (test@example.com)',
            trigger: CEventTrigger.PR_CREATED,
          },
        ],
      },
    };

    it('should handle missing artifact', async () => {
      mockArtifactLoader.loadArtifact.mockResolvedValue(null);

      const result = await prSync.syncArtifactToPR({
        artifactId: 'A.1.2',
        repoPath: '/path/to/repo',
        prNumber: 123,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Artifact A.1.2 not found');
    });

    it('should handle missing PR', async () => {
      mockArtifactLoader.loadArtifact.mockResolvedValue(mockArtifact);
      mockPRManager.listPRs.mockResolvedValue([]);

      const result = await prSync.syncArtifactToPR({
        artifactId: 'A.1.2',
        repoPath: '/path/to/repo',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No PR found for artifact A.1.2');
    });

    it('should sync successfully when PR exists', async () => {
      mockArtifactLoader.loadArtifact.mockResolvedValue(mockArtifact);
      mockPRManager.listPRs.mockResolvedValue([{ number: 123 }]);
      mockPRManager.getPRInfo.mockResolvedValue({
        number: 123,
        url: 'https://github.com/test/repo/pull/123',
        state: 'open',
        isDraft: true,
      });

      const result = await prSync.syncArtifactToPR({
        artifactId: 'A.1.2',
        repoPath: '/path/to/repo',
      });

      expect(result.success).toBe(true);
      expect(result.prNumber).toBe(123);
      expect(result.actions).toContain('marked PR as ready for review');
    });
  });

  describe('getSyncStatus', () => {
    it('should return status for existing artifact', async () => {
      const mockArtifact = {
        metadata: {
          title: 'Test Artifact',
          events: [
            {
              event: CArtifactEvent.IN_PROGRESS,
              timestamp: '2025-01-01T00:00:00Z',
              actor: 'Test User (test@example.com)',
              trigger: CEventTrigger.BRANCH_CREATED,
            },
          ],
        },
      };

      mockArtifactLoader.loadArtifact.mockResolvedValue(mockArtifact);
      mockPRManager.listPRs.mockResolvedValue([{ number: 123 }]);
      mockPRManager.getPRInfo.mockResolvedValue({
        number: 123,
        url: 'https://github.com/test/repo/pull/123',
      });

      const result = await prSync.getSyncStatus('A.1.2', '/path/to/repo');

      expect(result.artifact).toBe(mockArtifact);
      expect(result.currentState).toBe('in_progress');
      expect(result.prNumber).toBe(123);
      expect(result.prUrl).toBe('https://github.com/test/repo/pull/123');
    });

    it('should handle missing artifact', async () => {
      mockArtifactLoader.loadArtifact.mockResolvedValue(null);

      const result = await prSync.getSyncStatus('A.1.2', '/path/to/repo');

      expect(result.artifact).toBeNull();
      expect(result.currentState).toBe('unknown');
      expect(result.prNumber).toBeNull();
      expect(result.prUrl).toBeNull();
    });
  });
});
