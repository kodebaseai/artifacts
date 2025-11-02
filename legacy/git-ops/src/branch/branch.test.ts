import type { TArtifactEvent } from '@kodebase/core';
import type { SimpleGit } from 'simple-git';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleArtifactIds } from '../test/fixtures';
import type { BranchCleanupOptions, BranchCreateOptions } from '../types';
import { BranchCleaner, BranchCreator, BranchValidator } from './index';

// Helper to get mock function from partial mock
const getMockFn = (fn: unknown): ReturnType<typeof vi.fn> => {
  return fn as ReturnType<typeof vi.fn>;
};

describe('BranchValidator', () => {
  let validator: BranchValidator;

  beforeEach(() => {
    validator = new BranchValidator();
  });

  describe('validate', () => {
    it('should validate valid issue branch names', () => {
      sampleArtifactIds.valid.issue.forEach((id) => {
        const result = validator.validate(id);
        expect(result.valid).toBe(true);
        expect(result.artifactId).toBe(id);
        expect(result.artifactType).toBe('issue');
        expect(result.error).toBeUndefined();
      });
    });

    it('should validate valid milestone branch names', () => {
      sampleArtifactIds.valid.milestone.forEach((id) => {
        const result = validator.validate(id);
        expect(result.valid).toBe(true);
        expect(result.artifactId).toBe(id);
        expect(result.artifactType).toBe('milestone');
        expect(result.error).toBeUndefined();
      });
    });

    it('should validate valid initiative branch names', () => {
      sampleArtifactIds.valid.initiative.forEach((id) => {
        const result = validator.validate(id);
        expect(result.valid).toBe(true);
        expect(result.artifactId).toBe(id);
        expect(result.artifactType).toBe('initiative');
        expect(result.error).toBeUndefined();
      });
    });

    it('should validate valid nested artifact branch names', () => {
      sampleArtifactIds.valid.nested_artifact.forEach((id) => {
        const result = validator.validate(id);
        expect(result.valid).toBe(true);
        expect(result.artifactId).toBe(id);
        expect(result.artifactType).toBe('nested_artifact');
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid branch names', () => {
      sampleArtifactIds.invalid.forEach((id) => {
        const result = validator.validate(id);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.artifactId).toBeUndefined();
        expect(result.artifactType).toBeUndefined();
      });
    });

    it('should reject special branch names', () => {
      const specialBranches = ['main', 'master', 'develop', 'staging'];
      specialBranches.forEach((branch) => {
        const result = validator.validate(branch);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('special branch');
      });
    });

    it('should provide specific error messages', () => {
      const cases = [
        { input: 'a.1.5', expectedError: 'uppercase letters' },
        { input: 'A-1-5', expectedError: 'dots as separators' },
        { input: '1.2.3', expectedError: 'letter prefix' },
        { input: 'A.1.', expectedError: 'trailing dot' },
      ];

      cases.forEach(({ input, expectedError }) => {
        const result = validator.validate(input);
        expect(result.error).toContain(expectedError);
      });
    });
  });

  describe('extractArtifactInfo', () => {
    it('should extract artifact type from valid IDs', () => {
      expect(validator.extractArtifactInfo('A')).toEqual({
        type: 'initiative',
        parts: ['A'],
      });
      expect(validator.extractArtifactInfo('A.1')).toEqual({
        type: 'milestone',
        parts: ['A', '1'],
      });
      expect(validator.extractArtifactInfo('A.1.5')).toEqual({
        type: 'issue',
        parts: ['A', '1', '5'],
      });
      expect(validator.extractArtifactInfo('A.1.5.6')).toEqual({
        type: 'nested_artifact',
        parts: ['A', '1', '5', '6'],
      });
    });

    it('should return null for invalid IDs', () => {
      expect(validator.extractArtifactInfo('invalid')).toBeNull();
      expect(validator.extractArtifactInfo('')).toBeNull();
    });
  });
});

describe('BranchCreator', () => {
  let creator: BranchCreator;
  let mockGit: Partial<SimpleGit>;

  beforeEach(() => {
    mockGit = {
      checkIsRepo: vi.fn().mockResolvedValue(true),
      branch: vi.fn().mockResolvedValue({ all: ['main', 'A.1.4'] }),
      checkout: vi.fn().mockResolvedValue(undefined),
      push: vi.fn().mockResolvedValue(undefined),
      revparse: vi.fn().mockResolvedValue('abc123'),
    };
    creator = new BranchCreator(mockGit as SimpleGit);
  });

  describe('create', () => {
    it('should create a new branch with valid artifact ID', async () => {
      const options: BranchCreateOptions = {
        artifactId: 'A.1.5',
        baseBranch: 'main',
        checkout: true,
        push: true,
        track: true,
      };

      const result = await creator.create(options);

      expect(result.name).toBe('A.1.5');
      expect(result.artifactId).toBe('A.1.5');
      expect(result.existsLocal).toBe(true);
      expect(mockGit.checkout).toHaveBeenCalledWith(['-b', 'A.1.5', 'main']);
      expect(mockGit.push).toHaveBeenCalledWith([
        '--set-upstream',
        'origin',
        'A.1.5',
      ]);
    });

    it('should throw error for invalid artifact ID', async () => {
      const options: BranchCreateOptions = {
        artifactId: 'invalid-id',
      };

      await expect(creator.create(options)).rejects.toThrow(
        'Invalid artifact ID',
      );
    });

    it('should throw error if branch already exists', async () => {
      getMockFn(mockGit.branch).mockResolvedValue({ all: ['main', 'A.1.5'] });

      const options: BranchCreateOptions = {
        artifactId: 'A.1.5',
      };

      await expect(creator.create(options)).rejects.toThrow(
        'Branch A.1.5 already exists',
      );
    });

    it('should not checkout if checkout option is false', async () => {
      const options: BranchCreateOptions = {
        artifactId: 'A.1.5',
        checkout: false,
      };

      await creator.create(options);

      expect(mockGit.checkout).not.toHaveBeenCalled();
    });

    it('should not push if push option is false', async () => {
      const options: BranchCreateOptions = {
        artifactId: 'A.1.5',
        push: false,
      };

      await creator.create(options);

      expect(mockGit.push).not.toHaveBeenCalled();
    });

    it('should throw error if artifact status is completed', async () => {
      const options: BranchCreateOptions = {
        artifactId: 'A.1.5',
        artifactStatus: 'completed',
      };

      await expect(creator.create(options)).rejects.toThrow(
        'Cannot create branch for completed artifact A.1.5',
      );
    });

    it('should throw error if artifact status is archived', async () => {
      const options: BranchCreateOptions = {
        artifactId: 'A.1.5',
        artifactStatus: 'archived',
      };

      await expect(creator.create(options)).rejects.toThrow(
        'Cannot create branch for archived artifact A.1.5',
      );
    });

    it('should allow branch creation for non-completed/archived statuses', async () => {
      const statuses = [
        'draft',
        'ready',
        'blocked',
        'cancelled',
        'in_progress',
        'in_review',
      ];

      for (const status of statuses) {
        getMockFn(mockGit.branch).mockResolvedValue({ all: ['main'] }); // Reset mock

        const options: BranchCreateOptions = {
          artifactId: 'A.1.5',
          artifactStatus: status as TArtifactEvent,
          checkout: false,
        };

        const result = await creator.create(options);
        expect(result.name).toBe('A.1.5');
      }
    });
  });

  describe('exists', () => {
    it('should check if branch exists locally', async () => {
      getMockFn(mockGit.branch).mockResolvedValue({ all: ['main', 'A.1.5'] });

      const exists = await creator.exists('A.1.5');
      expect(exists).toBe(true);

      const notExists = await creator.exists('A.1.6');
      expect(notExists).toBe(false);
    });
  });
});

describe('BranchCleaner', () => {
  let cleaner: BranchCleaner;
  let mockGit: Partial<SimpleGit>;

  beforeEach(() => {
    mockGit = {
      checkIsRepo: vi.fn().mockResolvedValue(true),
      branch: vi.fn().mockResolvedValue({
        all: ['main', 'A.1.1', 'A.1.2', 'A.1.3'],
        current: 'main',
      }),
      deleteLocalBranch: vi.fn().mockResolvedValue(undefined),
      push: vi.fn().mockResolvedValue(undefined),
      raw: vi.fn().mockResolvedValue('A.1.1\nA.1.2\n'),
    };
    cleaner = new BranchCleaner(mockGit as SimpleGit);
  });

  describe('cleanup', () => {
    it('should delete merged branches', async () => {
      const options: BranchCleanupOptions = {
        deleteLocal: true,
        deleteRemote: true,
        mergedOnly: true,
        targetBranch: 'main',
      };

      const result = await cleaner.cleanup(options);

      expect(result.deleted).toContain('A.1.1');
      expect(result.deleted).toContain('A.1.2');
      expect(mockGit.deleteLocalBranch).toHaveBeenCalledWith('A.1.1', false);
      expect(mockGit.push).toHaveBeenCalledWith([
        'origin',
        '--delete',
        'A.1.1',
      ]);
    });

    it('should exclude specified branches', async () => {
      const options: BranchCleanupOptions = {
        deleteLocal: true,
        exclude: ['A.1.1'],
        mergedOnly: true,
      };

      const result = await cleaner.cleanup(options);

      expect(result.deleted).not.toContain('A.1.1');
      expect(result.skipped).toContain('A.1.1');
    });

    it('should force delete if force option is true', async () => {
      const options: BranchCleanupOptions = {
        deleteLocal: true,
        force: true,
        mergedOnly: false,
      };

      await cleaner.cleanup(options);

      expect(mockGit.deleteLocalBranch).toHaveBeenCalledWith('A.1.1', true);
    });

    it('should handle deletion errors gracefully', async () => {
      getMockFn(mockGit.deleteLocalBranch).mockRejectedValueOnce(
        new Error('Cannot delete'),
      );

      const options: BranchCleanupOptions = {
        deleteLocal: true,
      };

      const result = await cleaner.cleanup(options);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        branch: 'A.1.1',
        error: 'Cannot delete',
      });
    });

    it('should not delete protected branches', async () => {
      const options: BranchCleanupOptions = {
        deleteLocal: true,
      };

      const result = await cleaner.cleanup(options);

      expect(result.deleted).not.toContain('main');
      expect(result.skipped).toContain('main');
    });
  });

  describe('getMergedBranches', () => {
    it('should return list of merged branches', async () => {
      const merged = await cleaner.getMergedBranches('main');

      expect(merged).toEqual(['A.1.1', 'A.1.2']);
      expect(mockGit.raw).toHaveBeenCalledWith(['branch', '--merged', 'main']);
    });
  });
});
