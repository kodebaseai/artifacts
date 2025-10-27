import { beforeEach, describe, expect, it } from 'vitest';
import type {
  Artifact,
  Issue,
  Milestone,
  TArtifactEvent,
} from '../../data/types';
import { CArtifactEvent, CEventTrigger } from '../../data/types/constants';
import { CompletionCascadeAnalyzer } from './completion-analyzer';

// Test utilities - following the existing query test patterns
function createMockIssue(
  id: string,
  status: string,
  blockedBy: string[] = [],
): Issue & { id: string } {
  return {
    id,
    metadata: {
      title: `Issue ${id}`,
      priority: 'medium',
      estimation: 'M',
      created_by: 'test@example.com',
      assignee: 'test@example.com',
      schema_version: '0.2.0',
      relationships: {
        blocks: [],
        blocked_by: blockedBy,
      },
      events: [
        {
          timestamp: '2025-01-01T00:00:00Z',
          event: CArtifactEvent.DRAFT,
          actor: 'test@example.com',
          trigger: CEventTrigger.ARTIFACT_CREATED,
        },
        ...(status !== CArtifactEvent.DRAFT
          ? [
              {
                timestamp: '2025-01-02T00:00:00Z',
                event: status as TArtifactEvent,
                actor: 'test@example.com',
                trigger: CEventTrigger.ARTIFACT_CREATED,
              },
            ]
          : []),
      ],
    },
    content: {
      summary: `Summary for ${id}`,
      acceptance_criteria: ['Test criterion'],
    },
  };
}

function createMockMilestone(
  id: string,
  status: string,
): Milestone & { id: string } {
  return {
    id,
    metadata: {
      title: `Milestone ${id}`,
      priority: 'high',
      estimation: 'L',
      created_by: 'test@example.com',
      assignee: 'test@example.com',
      schema_version: '0.2.0',
      relationships: { blocks: [], blocked_by: [] },
      events: [
        {
          timestamp: '2025-01-01T00:00:00Z',
          event: CArtifactEvent.DRAFT,
          actor: 'test@example.com',
          trigger: CEventTrigger.ARTIFACT_CREATED,
        },
        ...(status !== CArtifactEvent.DRAFT
          ? [
              {
                timestamp: '2025-01-02T00:00:00Z',
                event: status as TArtifactEvent,
                actor: 'test@example.com',
                trigger: CEventTrigger.ARTIFACT_CREATED,
              },
            ]
          : []),
      ],
    },
    content: {
      summary: `Summary for ${id}`,
      deliverables: ['Test deliverable'],
      validation: ['Test validation'],
    },
  };
}

describe('CompletionCascadeAnalyzer', () => {
  let analyzer: CompletionCascadeAnalyzer;

  beforeEach(() => {
    analyzer = new CompletionCascadeAnalyzer();
  });

  describe('Performance Requirement (<1 second)', () => {
    it('should analyze complex dependency tree in under 1 second', () => {
      // Create a complex scenario with 50 artifacts
      const artifacts = new Map<string, Artifact>();

      // Create 10 milestones with 5 issues each
      for (let m = 1; m <= 10; m++) {
        const milestoneId = `A.${m}`;
        artifacts.set(
          milestoneId,
          createMockMilestone(milestoneId, CArtifactEvent.IN_PROGRESS),
        );

        for (let i = 1; i <= 5; i++) {
          const issueId = `A.${m}.${i}`;
          const status =
            i === 1 ? CArtifactEvent.COMPLETED : CArtifactEvent.IN_PROGRESS;
          artifacts.set(issueId, createMockIssue(issueId, status));
        }
      }

      const startTime = performance.now();
      const result = analyzer.analyzeFullCascade(artifacts);
      const endTime = performance.now();

      const analysisTime = endTime - startTime;

      expect(analysisTime).toBeLessThan(1000); // Less than 1 second
      expect(result.performanceMs).toBeLessThan(1000);
      expect(result.totalArtifacts).toBe(60); // 10 milestones + 50 issues
    });
  });

  describe('analyzeCompletionCascade', () => {
    it('should identify artifacts unblocked by completion', () => {
      const artifacts = new Map<string, Artifact>([
        ['A.1.1', createMockIssue('A.1.1', CArtifactEvent.IN_PROGRESS)],
        ['A.1.2', createMockIssue('A.1.2', CArtifactEvent.BLOCKED, ['A.1.1'])],
        ['A.1.3', createMockIssue('A.1.3', CArtifactEvent.BLOCKED, ['A.1.1'])],
      ]);

      const result = analyzer.analyzeCompletionCascade('A.1.1', artifacts);

      expect(result.hasCascades).toBe(true);
      expect(result.unblocked).toHaveLength(2);
      expect(result.unblocked[0]?.id).toBe('A.1.2');
      expect(result.unblocked[0]?.newState).toBe(CArtifactEvent.READY);
      expect(result.unblocked[1]?.id).toBe('A.1.3');
      expect(result.analysisTimeMs).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial blockers correctly', () => {
      const artifacts = new Map<string, Artifact>([
        ['A.1.1', createMockIssue('A.1.1', CArtifactEvent.IN_PROGRESS)],
        ['A.1.2', createMockIssue('A.1.2', CArtifactEvent.IN_PROGRESS)],
        [
          'A.1.3',
          createMockIssue('A.1.3', CArtifactEvent.BLOCKED, ['A.1.1', 'A.1.2']),
        ],
      ]);

      const result = analyzer.analyzeCompletionCascade('A.1.1', artifacts);

      expect(result.hasCascades).toBe(false); // A.1.3 still blocked by A.1.2
      expect(result.unblocked).toHaveLength(0);
    });

    it('should handle non-existent artifacts gracefully', () => {
      const artifacts = new Map<string, Artifact>();

      const result = analyzer.analyzeCompletionCascade('A.1.1', artifacts);

      expect(result.hasCascades).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not found');
    });

    it('should detect circular dependencies', () => {
      const artifacts = new Map<string, Artifact>();

      // Create circular dependency: A.1.1 -> A.1.2 -> A.1.1
      const issue1 = createMockIssue('A.1.1', CArtifactEvent.READY);
      issue1.metadata.relationships.blocks = ['A.1.2'];
      issue1.metadata.relationships.blocked_by = ['A.1.2'];

      const issue2 = createMockIssue('A.1.2', CArtifactEvent.READY);
      issue2.metadata.relationships.blocks = ['A.1.1'];
      issue2.metadata.relationships.blocked_by = ['A.1.1'];

      artifacts.set('A.1.1', issue1);
      artifacts.set('A.1.2', issue2);

      const result = analyzer.analyzeFullCascade(artifacts);

      expect(result.circularDependencies).toContain('A.1.1');
      expect(result.totalArtifacts).toBe(2);
    });
  });

  describe('getCompletionRecommendations', () => {
    it('should identify artifacts ready to start', () => {
      const artifacts = new Map<string, Artifact>([
        ['A.1.1', createMockIssue('A.1.1', CArtifactEvent.READY)],
        ['A.1.2', createMockIssue('A.1.2', CArtifactEvent.READY)],
        ['A.1.3', createMockIssue('A.1.3', CArtifactEvent.IN_PROGRESS)],
      ]);

      const result = analyzer.getCompletionRecommendations(artifacts);

      expect(result.readyToStart).toHaveLength(2);
      expect(result.readyToStart).toContain('A.1.1');
      expect(result.readyToStart).toContain('A.1.2');
      expect(result.analysisTimeMs).toBeGreaterThan(0);
    });

    it('should show blocked artifacts with blocker states', () => {
      const artifacts = new Map<string, Artifact>([
        ['A.1.1', createMockIssue('A.1.1', CArtifactEvent.IN_PROGRESS)],
        ['A.1.2', createMockIssue('A.1.2', CArtifactEvent.COMPLETED)],
        [
          'A.1.3',
          createMockIssue('A.1.3', CArtifactEvent.BLOCKED, ['A.1.1', 'A.1.2']),
        ],
      ]);

      const result = analyzer.getCompletionRecommendations(artifacts);

      expect(result.blocked).toHaveLength(1);
      expect(result.blocked[0]?.id).toBe('A.1.3');
      expect(result.blocked[0]?.blockedBy).toEqual(['A.1.1', 'A.1.2']);
      expect(result.blocked[0]?.blockerStates['A.1.1']).toBe(
        CArtifactEvent.IN_PROGRESS,
      );
      expect(result.blocked[0]?.blockerStates['A.1.2']).toBe(
        CArtifactEvent.COMPLETED,
      );
    });
  });

  describe('Structured CLI output', () => {
    it('should return machine-readable results', () => {
      const artifacts = new Map<string, Artifact>([
        ['A.1.1', createMockIssue('A.1.1', CArtifactEvent.IN_PROGRESS)],
        ['A.1.2', createMockIssue('A.1.2', CArtifactEvent.BLOCKED, ['A.1.1'])],
      ]);

      const result = analyzer.analyzeCompletionCascade('A.1.1', artifacts);

      // Verify structure is CLI-friendly
      expect(typeof result.hasCascades).toBe('boolean');
      expect(Array.isArray(result.unblocked)).toBe(true);
      expect(Array.isArray(result.autoCompleted)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(typeof result.analysisTimeMs).toBe('number');

      // Verify unblocked artifacts have all required fields
      if (result.unblocked.length > 0) {
        const unblocked = result.unblocked[0];
        expect(typeof unblocked?.id).toBe('string');
        expect(typeof unblocked?.currentState).toBe('string');
        expect(typeof unblocked?.newState).toBe('string');
        expect(typeof unblocked?.reason).toBe('string');
      }
    });
  });

  describe('Integration with existing query system', () => {
    it('should work with the existing ArtifactQuery system', () => {
      const artifacts = new Map<string, Artifact>([
        ['A.1.1', createMockIssue('A.1.1', CArtifactEvent.READY)],
        ['A.1.2', createMockIssue('A.1.2', CArtifactEvent.BLOCKED, ['A.1.1'])],
        ['A.1.3', createMockIssue('A.1.3', CArtifactEvent.IN_PROGRESS)],
      ]);

      const result = analyzer.getCompletionRecommendations(artifacts);

      // Should find ready artifacts
      expect(result.readyToStart).toContain('A.1.1');

      // Should find blocked artifacts
      expect(result.blocked).toHaveLength(1);
      expect(result.blocked[0]?.id).toBe('A.1.2');
    });
  });

  describe('Multi-level cascade handling', () => {
    it('should handle complex dependencies with multiple levels', () => {
      const artifacts = new Map<string, Artifact>([
        ['A.1.1', createMockIssue('A.1.1', CArtifactEvent.READY)],
        ['A.1.2', createMockIssue('A.1.2', CArtifactEvent.BLOCKED, ['A.1.1'])],
        ['A.1.3', createMockIssue('A.1.3', CArtifactEvent.BLOCKED, ['A.1.2'])],
        ['A.1.4', createMockIssue('A.1.4', CArtifactEvent.BLOCKED, ['A.1.3'])],
      ]);

      // Completing A.1.1 should only unblock A.1.2 directly
      const result = analyzer.analyzeCompletionCascade('A.1.1', artifacts);

      expect(result.hasCascades).toBe(true);
      expect(result.unblocked).toHaveLength(1);
      expect(result.unblocked[0]?.id).toBe('A.1.2');
    });
  });
});
