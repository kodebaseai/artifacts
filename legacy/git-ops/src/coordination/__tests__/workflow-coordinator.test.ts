import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowCoordinator } from '../workflow-coordinator';
import type { ArtifactLoader } from '../../hooks/artifact-loader';
import type { SimpleGitClient } from '../../types/git-client';
import type { Artifact } from '@kodebase/core';
import type { GitContext } from '../../types/coordination';

describe('WorkflowCoordinator', () => {
  let coordinator: WorkflowCoordinator;
  let mockArtifactLoader: jest.Mocked<ArtifactLoader>;
  let mockGitClient: jest.Mocked<SimpleGitClient>;

  beforeEach(() => {
    mockArtifactLoader = {
      loadArtifact: vi.fn(),
      saveArtifact: vi.fn(),
    } as jest.Mocked<ArtifactLoader>;

    mockGitClient = {
      getContext: vi.fn(),
      getCurrentBranch: vi.fn(),
      getCurrentCommit: vi.fn(),
      getAuthor: vi.fn(),
      branchExists: vi.fn(),
      getBranchStatus: vi.fn(),
      getRepositoryStatus: vi.fn(),
    } as jest.Mocked<SimpleGitClient>;

    coordinator = new WorkflowCoordinator(mockArtifactLoader, mockGitClient);
  });

  describe('synchronizeStates', () => {
    it('should return synchronized result when states match', async () => {
      // Arrange
      const artifactId = 'A.1.5';
      const mockArtifact: Artifact = {
        metadata: {
          title: 'Test Issue',
          priority: 'medium',
          estimation: 'M',
          created_by: 'Test User (test@example.com)',
          assignee: 'Test User (test@example.com)',
          schema_version: '0.1.0',
          relationships: { blocks: [], blocked_by: [] },
          events: [
            {
              timestamp: '2025-01-01T00:00:00Z',
              event: 'in_progress',
              actor: 'Test User (test@example.com)',
              metadata: {},
            },
          ],
        },
        content: {
          summary: 'Test summary',
          acceptance_criteria: [],
        },
      };

      const gitContext: GitContext = {
        operation: 'checkout',
        branch: 'A.1.5',
        author: 'Test User (test@example.com)',
      };

      mockArtifactLoader.loadArtifact.mockResolvedValue(mockArtifact);

      // Act
      const result = await coordinator.synchronizeStates(
        artifactId,
        'in_progress',
        gitContext,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.synchronized).toBe(true);
      expect(result.artifactState).toBe('in_progress');
      expect(result.gitState).toBe('checkout');
    });

    it('should detect and resolve state mismatch', async () => {
      // Arrange
      const artifactId = 'A.1.5';
      const mockArtifact: Artifact = {
        metadata: {
          title: 'Test Issue',
          priority: 'medium',
          estimation: 'M',
          created_by: 'Test User (test@example.com)',
          assignee: 'Test User (test@example.com)',
          schema_version: '0.1.0',
          relationships: { blocks: [], blocked_by: [] },
          events: [
            {
              timestamp: '2025-01-01T00:00:00Z',
              event: 'ready',
              actor: 'Test User (test@example.com)',
              metadata: {},
            },
          ],
        },
        content: {
          summary: 'Test summary',
          acceptance_criteria: [],
        },
      };

      const gitContext: GitContext = {
        operation: 'checkout',
        branch: 'A.1.5',
        author: 'Test User (test@example.com)',
      };

      mockArtifactLoader.loadArtifact.mockResolvedValue(mockArtifact);

      // Act
      const result = await coordinator.synchronizeStates(
        artifactId,
        'in_progress',
        gitContext,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.conflictResolved).toBeDefined();
      expect(result.conflictResolved?.type).toBe('state_mismatch');
      expect(result.conflictResolved?.resolution).toBe(
        'artifact_state_prioritized',
      );
    });

    it('should handle artifacts with no events', async () => {
      // Arrange
      const artifactId = 'A.1.5';
      const mockArtifact: Artifact = {
        metadata: {
          title: 'Test Issue',
          priority: 'medium',
          estimation: 'M',
          created_by: 'Test User (test@example.com)',
          assignee: 'Test User (test@example.com)',
          schema_version: '0.1.0',
          relationships: { blocks: [], blocked_by: [] },
          events: [],
        },
        content: {
          summary: 'Test summary',
          acceptance_criteria: [],
        },
      };

      const gitContext: GitContext = {
        operation: 'none',
        branch: 'main',
        author: 'Test User (test@example.com)',
      };

      mockArtifactLoader.loadArtifact.mockResolvedValue(mockArtifact);

      // Act
      const result = await coordinator.synchronizeStates(
        artifactId,
        'draft',
        gitContext,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.artifactState).toBe('draft');
    });
  });
});
