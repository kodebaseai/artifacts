import { beforeEach, describe, expect, it } from 'vitest';
import type { EventMetadata, Issue, TArtifactEvent } from '../../data/types';
import { CArtifactEvent, CEventTrigger } from '../../data/types/constants';
import { CascadeEngine } from './engine';

// Mock data generators
function createMockEvent(event: string): EventMetadata {
  // Map event types to appropriate triggers
  const getTriggerForEvent = (eventType: string) => {
    switch (eventType) {
      case CArtifactEvent.DRAFT:
        return CEventTrigger.ARTIFACT_CREATED;
      case CArtifactEvent.READY:
        return CEventTrigger.DEPENDENCIES_MET;
      case CArtifactEvent.IN_PROGRESS:
        return CEventTrigger.BRANCH_CREATED;
      case CArtifactEvent.IN_REVIEW:
        return CEventTrigger.PR_READY;
      case CArtifactEvent.COMPLETED:
        return CEventTrigger.PR_MERGED;
      case CArtifactEvent.BLOCKED:
        return CEventTrigger.HAS_DEPENDENCIES;
      case CArtifactEvent.CANCELLED:
        return CEventTrigger.MANUAL;
      case CArtifactEvent.ARCHIVED:
        return CEventTrigger.DEPENDENCY_COMPLETED;
      default:
        return CEventTrigger.MANUAL;
    }
  };

  return {
    event: event as TArtifactEvent,
    timestamp: new Date().toISOString(),
    actor: 'test@example.com',
    trigger: getTriggerForEvent(event),
  };
}

function createMockIssue(id: string, status: string): Issue {
  return {
    metadata: {
      title: `Issue ${id}`,
      priority: 'medium',
      estimation: 'M',
      created_by: 'test@example.com',
      assignee: 'test@example.com',
      schema_version: '0.1.0',
      relationships: { blocks: [], blocked_by: [] },
      events: [
        createMockEvent(CArtifactEvent.DRAFT),
        ...(status !== CArtifactEvent.DRAFT ? [createMockEvent(status)] : []),
      ],
    },
    content: {
      summary: `Summary for ${id}`,
      acceptance_criteria: ['Test criterion'],
    },
  };
}

describe('CascadeEngine', () => {
  let engine: CascadeEngine;

  beforeEach(() => {
    engine = new CascadeEngine();
  });

  describe('shouldCascadeToParent', () => {
    it('should cascade when all children are completed', () => {
      const children = [
        createMockIssue('A.1.1', CArtifactEvent.COMPLETED),
        createMockIssue('A.1.2', CArtifactEvent.COMPLETED),
        createMockIssue('A.1.3', CArtifactEvent.COMPLETED),
      ];

      const result = engine.shouldCascadeToParent(children);

      expect(result.shouldCascade).toBe(true);
      expect(result.newState).toBe(CArtifactEvent.IN_REVIEW);
      expect(result.reason).toContain('All children completed');
    });

    it('should not cascade when some children are incomplete', () => {
      const children = [
        createMockIssue('A.1.1', CArtifactEvent.COMPLETED),
        createMockIssue('A.1.2', CArtifactEvent.IN_PROGRESS),
        createMockIssue('A.1.3', CArtifactEvent.COMPLETED),
      ];

      const result = engine.shouldCascadeToParent(children);

      expect(result.shouldCascade).toBe(false);
      expect(result.reason).toContain('incomplete children');
    });

    it('should cascade to in_progress when first child starts', () => {
      const children = [
        createMockIssue('A.1.1', CArtifactEvent.IN_PROGRESS),
        createMockIssue('A.1.2', CArtifactEvent.READY),
        createMockIssue('A.1.3', CArtifactEvent.DRAFT),
      ];

      const result = engine.shouldCascadeToParent(
        children,
        CArtifactEvent.READY,
      );

      expect(result.shouldCascade).toBe(true);
      expect(result.newState).toBe(CArtifactEvent.IN_PROGRESS);
      expect(result.reason).toContain('First child started');
    });

    it('should ignore cancelled children when checking completion', () => {
      const children = [
        createMockIssue('A.1.1', CArtifactEvent.COMPLETED),
        createMockIssue('A.1.2', CArtifactEvent.CANCELLED),
        createMockIssue('A.1.3', CArtifactEvent.COMPLETED),
      ];

      const result = engine.shouldCascadeToParent(children);

      expect(result.shouldCascade).toBe(true);
      expect(result.newState).toBe(CArtifactEvent.IN_REVIEW);
    });
  });

  describe('generateCascadeEvent', () => {
    it('should generate event with correlation ID', () => {
      const parentEvent = createMockEvent(CArtifactEvent.COMPLETED);
      const cascadeEvent = engine.generateCascadeEvent(
        CArtifactEvent.IN_REVIEW,
        parentEvent,
        'parent_completion_cascade',
      );

      expect(cascadeEvent.event).toBe(CArtifactEvent.IN_REVIEW);
      expect(cascadeEvent.metadata?.cascade_type).toBe(
        'parent_completion_cascade',
      );
      expect(cascadeEvent.actor).toBe('System (system@kodebase.ai)');
    });
  });

  describe('archiveCancelledChildren', () => {
    it('should return archive events for cancelled children', () => {
      const parentEvent = createMockEvent(CArtifactEvent.COMPLETED);
      const children = [
        createMockIssue('A.1.1', CArtifactEvent.COMPLETED),
        createMockIssue('A.1.2', CArtifactEvent.CANCELLED),
        createMockIssue('A.1.3', CArtifactEvent.CANCELLED),
      ];

      const archiveEvents = engine.archiveCancelledChildren(
        children,
        parentEvent,
      );

      expect(archiveEvents).toHaveLength(2);
      expect(archiveEvents[0]?.artifactId).toBe('Issue-A.1.2');
      expect(archiveEvents[0]?.event.event).toBe(CArtifactEvent.ARCHIVED);
      expect(archiveEvents[1]?.artifactId).toBe('Issue-A.1.3');
    });

    it('should not archive non-cancelled children', () => {
      const parentEvent = createMockEvent(CArtifactEvent.COMPLETED);
      const children = [
        createMockIssue('A.1.1', CArtifactEvent.COMPLETED),
        createMockIssue('A.1.2', CArtifactEvent.IN_PROGRESS),
      ];

      const archiveEvents = engine.archiveCancelledChildren(
        children,
        parentEvent,
      );

      expect(archiveEvents).toHaveLength(0);
    });
  });

  describe('getBlockedDependents', () => {
    it('should identify blocked artifacts when dependency is cancelled', () => {
      const artifacts = new Map([
        ['A.1.1', createMockIssue('A.1.1', CArtifactEvent.CANCELLED)],
        [
          'A.1.2',
          {
            ...createMockIssue('A.1.2', CArtifactEvent.BLOCKED),
            metadata: {
              ...createMockIssue('A.1.2', CArtifactEvent.BLOCKED).metadata,
              relationships: { blocks: [], blocked_by: ['A.1.1'] },
            },
          },
        ],
        [
          'A.1.3',
          {
            ...createMockIssue('A.1.3', CArtifactEvent.BLOCKED),
            metadata: {
              ...createMockIssue('A.1.3', CArtifactEvent.BLOCKED).metadata,
              relationships: { blocks: [], blocked_by: ['A.1.1', 'A.1.4'] },
            },
          },
        ],
      ]);

      const blockedDependents = engine.getBlockedDependents('A.1.1', artifacts);

      expect(blockedDependents).toHaveLength(2);
      expect(blockedDependents).toContain('A.1.2');
      expect(blockedDependents).toContain('A.1.3');
    });
  });

  describe('getCurrentState', () => {
    it('should get the current state from events', () => {
      const artifact = createMockIssue('A.1.1', CArtifactEvent.IN_PROGRESS);
      const state = engine.getCurrentState(artifact);

      expect(state).toBe(CArtifactEvent.IN_PROGRESS);
    });

    it('should return draft for artifact with only draft event', () => {
      const artifact = createMockIssue('A.1.1', CArtifactEvent.DRAFT);
      const state = engine.getCurrentState(artifact);

      expect(state).toBe(CArtifactEvent.DRAFT);
    });
  });
});
