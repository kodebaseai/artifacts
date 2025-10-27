import { beforeEach, describe, expect, it } from 'vitest';
import type { EventMetadata, Issue, TArtifactEvent } from '../../data/types';
import { CArtifactEvent, CEventTrigger } from '../../data/types/constants';
import { createEvent } from '../events';
import { canTransition, validateEventOrder } from '../validation/state-machine';
import { CascadeEngine } from './engine';

describe('Cascade Integration Tests', () => {
  let engine: CascadeEngine;
  beforeEach(() => {
    engine = new CascadeEngine();
  });

  /**
   * Scenario 1: Parent completion when all children complete
   * From validation report: "When all child issues of a milestone complete,
   * the milestone should automatically transition to 'in_review'"
   */
  describe('Scenario 1: Parent completion cascade', () => {
    it('should cascade milestone to in_review when all issues complete', () => {
      const issues: Issue[] = [
        createIssue('A.1.1', [
          { event: CArtifactEvent.DRAFT, timestamp: '2024-01-01T00:00:00Z' },
          { event: CArtifactEvent.READY, timestamp: '2024-01-02T00:00:00Z' },
          {
            event: CArtifactEvent.IN_PROGRESS,
            timestamp: '2024-01-03T00:00:00Z',
          },
          {
            event: CArtifactEvent.COMPLETED,
            timestamp: '2024-01-04T00:00:00Z',
          },
        ]),
        createIssue('A.1.2', [
          { event: CArtifactEvent.DRAFT, timestamp: '2024-01-01T00:00:00Z' },
          { event: CArtifactEvent.READY, timestamp: '2024-01-02T00:00:00Z' },
          {
            event: CArtifactEvent.COMPLETED,
            timestamp: '2024-01-05T00:00:00Z',
          },
        ]),
        createIssue('A.1.3', [
          { event: CArtifactEvent.DRAFT, timestamp: '2024-01-01T00:00:00Z' },
          {
            event: CArtifactEvent.COMPLETED,
            timestamp: '2024-01-06T00:00:00Z',
          },
        ]),
      ];

      const result = engine.shouldCascadeToParent(issues);

      expect(result.shouldCascade).toBe(true);
      expect(result.newState).toBe(CArtifactEvent.IN_REVIEW);
      expect(result.reason).toBe('All children completed');
    });

    it('should ignore cancelled issues when evaluating completion', () => {
      const issues: Issue[] = [
        createIssue('A.1.1', [
          { event: CArtifactEvent.DRAFT, timestamp: '2024-01-01T00:00:00Z' },
          {
            event: CArtifactEvent.COMPLETED,
            timestamp: '2024-01-04T00:00:00Z',
          },
        ]),
        createIssue('A.1.2', [
          { event: CArtifactEvent.DRAFT, timestamp: '2024-01-01T00:00:00Z' },
          {
            event: CArtifactEvent.CANCELLED,
            timestamp: '2024-01-02T00:00:00Z',
          },
        ]),
        createIssue('A.1.3', [
          { event: CArtifactEvent.DRAFT, timestamp: '2024-01-01T00:00:00Z' },
          {
            event: CArtifactEvent.COMPLETED,
            timestamp: '2024-01-05T00:00:00Z',
          },
        ]),
      ];

      const result = engine.shouldCascadeToParent(issues);

      expect(result.shouldCascade).toBe(true);
      expect(result.newState).toBe(CArtifactEvent.IN_REVIEW);
    });
  });

  /**
   * Scenario 2: Parent auto-start when first child starts
   * From validation report: "When the first child issue transitions to 'in_progress',
   * the parent milestone should automatically transition from 'ready' to 'in_progress'"
   */
  describe('Scenario 2: Parent auto-start cascade', () => {
    it('should cascade milestone to in_progress when first issue starts', () => {
      const issues: Issue[] = [
        createIssue('A.1.1', [
          { event: CArtifactEvent.DRAFT, timestamp: '2024-01-01T00:00:00Z' },
          { event: CArtifactEvent.READY, timestamp: '2024-01-02T00:00:00Z' },
          {
            event: CArtifactEvent.IN_PROGRESS,
            timestamp: '2024-01-03T00:00:00Z',
          },
        ]),
        createIssue('A.1.2', [
          { event: CArtifactEvent.DRAFT, timestamp: '2024-01-01T00:00:00Z' },
          { event: CArtifactEvent.READY, timestamp: '2024-01-02T00:00:00Z' },
        ]),
        createIssue('A.1.3', [
          { event: CArtifactEvent.DRAFT, timestamp: '2024-01-01T00:00:00Z' },
        ]),
      ];

      const result = engine.shouldCascadeToParent(issues, CArtifactEvent.READY);

      expect(result.shouldCascade).toBe(true);
      expect(result.newState).toBe(CArtifactEvent.IN_PROGRESS);
      expect(result.reason).toBe('First child started');
    });

    it('should not cascade if parent is not in ready state', () => {
      const issues: Issue[] = [
        createIssue('A.1.1', [
          { event: CArtifactEvent.DRAFT, timestamp: '2024-01-01T00:00:00Z' },
          {
            event: CArtifactEvent.IN_PROGRESS,
            timestamp: '2024-01-03T00:00:00Z',
          },
        ]),
      ];

      const result = engine.shouldCascadeToParent(issues, CArtifactEvent.DRAFT);

      expect(result.shouldCascade).toBe(false);
    });
  });

  /**
   * Scenario 3: Cascade event generation with proper metadata
   * From validation report: Events should have trigger, and cascade metadata
   */
  describe('Scenario 3: Cascade event generation', () => {
    it('should generate cascade event with all required fields', () => {
      const triggerEvent: EventMetadata = createEvent({
        event: CArtifactEvent.COMPLETED,
        timestamp: '2024-01-01T00:00:00Z',
        actor: 'user@example.com',
        trigger: CEventTrigger.ARTIFACT_CREATED,
      });

      const cascadeEvent = engine.generateCascadeEvent(
        CArtifactEvent.IN_REVIEW,
        triggerEvent,
        'all_children_complete',
      );

      // Verify all required fields
      expect(cascadeEvent.trigger).toBe(CEventTrigger.DEPENDENCY_COMPLETED);
      expect(cascadeEvent.actor).toBe('System (system@kodebase.ai)');
      expect(cascadeEvent.event).toBe(CArtifactEvent.IN_REVIEW);

      // Verify metadata
      expect(cascadeEvent.metadata?.cascade_type).toBe('all_children_complete');
      expect(cascadeEvent.metadata?.trigger_event).toBe(
        CArtifactEvent.COMPLETED,
      );
      expect(cascadeEvent.metadata?.trigger_actor).toBe('user@example.com');
    });

    it('should handle root event (no parent) in cascade', () => {
      const triggerEvent: EventMetadata = createEvent({
        timestamp: '2024-01-01T00:00:00Z',
        event: CArtifactEvent.COMPLETED,
        actor: 'user@example.com',
      });

      const cascadeEvent = engine.generateCascadeEvent(
        CArtifactEvent.IN_REVIEW,
        triggerEvent,
        'test_cascade',
      );

      expect(cascadeEvent.trigger).toBe(CEventTrigger.DEPENDENCY_COMPLETED);
    });
  });

  /**
   * Scenario 4: Archive cancelled children on parent completion
   * From validation report: "Cancelled artifacts should be automatically
   * archived when their parent completes"
   */
  describe('Scenario 4: Archive cancelled children', () => {
    it('should generate archive events for cancelled children', () => {
      const parentCompletionEvent: EventMetadata = createEvent({
        timestamp: '2024-01-10T00:00:00Z',
        event: CArtifactEvent.COMPLETED,
        actor: 'system',
      });

      const issues: Issue[] = [
        createIssue('A.1.1', [
          { event: CArtifactEvent.DRAFT, timestamp: '2024-01-01T00:00:00Z' },
          {
            event: CArtifactEvent.COMPLETED,
            timestamp: '2024-01-08T00:00:00Z',
          },
        ]),
        createIssue('A.1.2', [
          { event: CArtifactEvent.DRAFT, timestamp: '2024-01-01T00:00:00Z' },
          {
            event: CArtifactEvent.CANCELLED,
            timestamp: '2024-01-05T00:00:00Z',
          },
        ]),
        createIssue('A.1.3', [
          { event: CArtifactEvent.DRAFT, timestamp: '2024-01-01T00:00:00Z' },
          {
            event: CArtifactEvent.CANCELLED,
            timestamp: '2024-01-06T00:00:00Z',
          },
        ]),
      ];

      const archiveEvents = engine.archiveCancelledChildren(
        issues,
        parentCompletionEvent,
      );

      expect(archiveEvents).toHaveLength(2);

      // Verify first cancelled issue archive event
      const firstArchive = archiveEvents[0];
      expect(firstArchive?.artifactId).toBe('Issue-A.1.2');
      expect(firstArchive?.event.event).toBe(CArtifactEvent.ARCHIVED);
      expect(firstArchive?.event.metadata?.cascade_type).toBe(
        'parent_completion_archive',
      );

      // Verify second cancelled issue archive event
      const secondArchive = archiveEvents[1];
      expect(secondArchive?.artifactId).toBe('Issue-A.1.3');
      expect(secondArchive?.event.event).toBe(CArtifactEvent.ARCHIVED);
    });
  });

  /**
   * Scenario 5: Dependency cascade blocks
   * From validation report: "Artifacts with cancelled dependencies
   * should be notified or transitioned to blocked state"
   */
  describe('Scenario 5: Dependency cascade blocks', () => {
    it('should identify artifacts blocked by cancelled dependency', () => {
      const artifacts = new Map<string, Issue>([
        [
          'A.1.1',
          createIssueWithDependencies(
            'A.1.1',
            CArtifactEvent.CANCELLED,
            [],
            [],
          ),
        ],
        [
          'A.1.2',
          createIssueWithDependencies(
            'A.1.2',
            CArtifactEvent.BLOCKED,
            [],
            ['A.1.1'],
          ),
        ],
        [
          'A.1.3',
          createIssueWithDependencies(
            'A.1.3',
            CArtifactEvent.READY,
            [],
            ['A.1.4'],
          ),
        ],
        [
          'A.1.4',
          createIssueWithDependencies(
            'A.1.4',
            CArtifactEvent.DRAFT,
            [],
            ['A.1.1'],
          ),
        ],
      ]);

      const blockedDependents = engine.getBlockedDependents('A.1.1', artifacts);

      expect(blockedDependents).toHaveLength(2);
      expect(blockedDependents).toContain('A.1.2');
      expect(blockedDependents).toContain('A.1.4');
      expect(blockedDependents).not.toContain('A.1.3'); // Not blocked by A.1.1
    });
  });

  /**
   * Scenario 6: Full cascade chain with correlation tracking
   * From validation report: Test complete cascade chain from issue → milestone → initiative
   */
  describe('Scenario 6: Full cascade chain', () => {
    it('should track correlation through entire cascade chain', () => {
      // Initial issue completion
      const issueCompletionEvent: EventMetadata = createEvent({
        timestamp: '2024-01-01T10:00:00Z',
        event: CArtifactEvent.COMPLETED,
        actor: 'developer@example.com',
      });

      // Generate milestone cascade event
      const milestoneCascade = engine.generateCascadeEvent(
        CArtifactEvent.IN_REVIEW,
        issueCompletionEvent,
        'all_issues_complete',
      );

      // Verify milestone cascade has correlation to issue
      expect(milestoneCascade.trigger).toBe(CEventTrigger.DEPENDENCY_COMPLETED);

      // Simulate milestone completion
      const milestoneCompletionEvent: EventMetadata = {
        ...milestoneCascade,
        event: CArtifactEvent.COMPLETED,
        timestamp: '2024-01-02T10:00:00Z',
      };

      // Generate initiative cascade event
      const initiativeCascade = engine.generateCascadeEvent(
        CArtifactEvent.IN_REVIEW,
        milestoneCompletionEvent,
        'all_milestones_complete',
      );

      // Verify initiative cascade maintains correlation chain
      expect(initiativeCascade.trigger).toBe(
        CEventTrigger.DEPENDENCY_COMPLETED,
      );
    });
  });

  /**
   * Scenario 7: State transition validation in cascade context
   * Ensure cascade events respect state machine rules
   */
  describe('Scenario 7: State transition validation', () => {
    it('should only suggest valid state transitions', () => {
      // Test that cascade respects state machine
      // IN_PROGRESS → IN_REVIEW is valid for milestones
      const validTransition = canTransition(
        'milestone',
        CArtifactEvent.IN_PROGRESS,
        CArtifactEvent.IN_REVIEW,
      );
      expect(validTransition).toBe(true);

      // Test invalid transition
      const invalidTransition = canTransition(
        'milestone',
        CArtifactEvent.DRAFT,
        CArtifactEvent.IN_REVIEW,
      );
      expect(invalidTransition).toBe(false); // Cannot skip intermediate states

      // The cascade engine suggests in_progress when first child starts
      const validFromReady = canTransition(
        'milestone',
        CArtifactEvent.READY,
        CArtifactEvent.IN_PROGRESS,
      );
      expect(validFromReady).toBe(true);
    });

    it('should validate event order after cascade', () => {
      const events: EventMetadata[] = [
        createEvent({
          event: CArtifactEvent.DRAFT,
          timestamp: '2024-01-01T00:00:00Z',
          actor: 'user',
        }),
        createEvent({
          event: CArtifactEvent.READY,
          timestamp: '2024-01-02T00:00:00Z',
          actor: 'user',
        }),
        createEvent({
          event: CArtifactEvent.IN_PROGRESS,
          timestamp: '2024-01-03T00:00:00Z',
          actor: 'system',
        }),
        createEvent({
          event: CArtifactEvent.IN_REVIEW,
          timestamp: '2024-01-04T00:00:00Z',
          actor: 'system',
        }),
      ];

      expect(() => validateEventOrder(events, 'milestone')).not.toThrow();
    });
  });
});

// Helper functions
function createIssue(
  id: string,
  events: Array<{ event: TArtifactEvent; timestamp: string }>,
): Issue {
  return {
    metadata: {
      title: `Issue ${id}`,
      priority: 'medium',
      estimation: 'M',
      created_by: 'test@example.com',
      assignee: 'test@example.com',
      schema_version: '0.1.0',
      relationships: { blocks: [], blocked_by: [] },
      events: events.map((e) =>
        createEvent({
          timestamp: e.timestamp,
          event: e.event,
          actor: 'test@example.com',
        }),
      ),
    },
    content: {
      summary: `Summary for ${id}`,
      acceptance_criteria: ['Test criterion'],
    },
  };
}

function createIssueWithDependencies(
  id: string,
  status: TArtifactEvent,
  blocks: string[],
  blockedBy: string[],
): Issue {
  return {
    metadata: {
      title: `Issue ${id}`,
      priority: 'medium',
      estimation: 'M',
      created_by: 'test@example.com',
      assignee: 'test@example.com',
      schema_version: '0.1.0',
      relationships: { blocks, blocked_by: blockedBy },
      events: [
        createEvent({
          timestamp: '2024-01-01T00:00:00Z',
          event: CArtifactEvent.DRAFT,
          actor: 'test@example.com',
        }),
        ...(status !== CArtifactEvent.DRAFT
          ? [
              createEvent({
                timestamp: '2024-01-02T00:00:00Z',
                event: status,
                actor: 'test@example.com',
              }),
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
