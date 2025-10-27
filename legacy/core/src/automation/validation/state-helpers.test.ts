import { describe, expect, it } from 'vitest';
import type { Artifact, Issue } from '../../data/types';
import { CArtifactEvent } from '../../data/types/constants';
import { createMockArtifact } from '../../test/metrics-fixtures';
import { createEvent } from '../events/builder';
import {
  canTransition,
  getValidTransitions,
  performTransition,
  StateTransitionError,
} from './state-helpers';

describe('State Helpers - Artifact-based API', () => {
  describe('canTransition(artifact, newState)', () => {
    it('should return true for valid transitions from current state', () => {
      // Create artifact in draft state
      const artifact = createMockArtifact({
        type: 'issue',
        events: [
          createEvent({
            event: CArtifactEvent.DRAFT,
            actor: 'test@example.com',
          }),
        ],
      });

      // Valid transitions from draft
      expect(canTransition(artifact, CArtifactEvent.READY)).toBe(true);
      expect(canTransition(artifact, CArtifactEvent.BLOCKED)).toBe(true);
      expect(canTransition(artifact, CArtifactEvent.CANCELLED)).toBe(true);
    });

    it('should return false for invalid transitions from current state', () => {
      // Create artifact in draft state
      const artifact = createMockArtifact({
        type: 'issue',
        events: [
          createEvent({
            event: CArtifactEvent.DRAFT,
            actor: 'test@example.com',
          }),
        ],
      });

      // Invalid transitions from draft
      expect(canTransition(artifact, CArtifactEvent.IN_PROGRESS)).toBe(false);
      expect(canTransition(artifact, CArtifactEvent.IN_REVIEW)).toBe(false);
      expect(canTransition(artifact, CArtifactEvent.COMPLETED)).toBe(false);
    });

    it('should work correctly for different artifact types', () => {
      const milestone = createMockArtifact({
        type: 'milestone',
        events: [
          createEvent({
            event: CArtifactEvent.READY,
            actor: 'test@example.com',
          }),
        ],
      });

      expect(canTransition(milestone, CArtifactEvent.IN_PROGRESS)).toBe(true);
      expect(canTransition(milestone, CArtifactEvent.COMPLETED)).toBe(false);
    });

    it('should return false for transitions from terminal states', () => {
      const artifact = createMockArtifact({
        type: 'issue',
        events: [
          createEvent({
            event: CArtifactEvent.DRAFT,
            actor: 'test@example.com',
          }),
          createEvent({
            event: CArtifactEvent.COMPLETED,
            actor: 'test@example.com',
          }),
        ],
      });

      expect(canTransition(artifact, CArtifactEvent.IN_REVIEW)).toBe(false);
      expect(canTransition(artifact, CArtifactEvent.CANCELLED)).toBe(false);
    });
  });

  describe('getValidTransitions(artifact)', () => {
    it('should return valid next states from current state', () => {
      const artifact = createMockArtifact({
        type: 'issue',
        events: [
          createEvent({
            event: CArtifactEvent.DRAFT,
            actor: 'test@example.com',
          }),
        ],
      });

      const validStates = getValidTransitions(artifact);
      expect(validStates).toContain(CArtifactEvent.READY);
      expect(validStates).toContain(CArtifactEvent.BLOCKED);
      expect(validStates).toContain(CArtifactEvent.CANCELLED);
      expect(validStates).not.toContain(CArtifactEvent.IN_PROGRESS);
      expect(validStates).not.toContain(CArtifactEvent.COMPLETED);
    });

    it('should return empty array for terminal states', () => {
      const artifact = createMockArtifact({
        type: 'issue',
        events: [
          createEvent({
            event: CArtifactEvent.COMPLETED,
            actor: 'test@example.com',
          }),
        ],
      });

      const validStates = getValidTransitions(artifact);
      expect(validStates).toEqual([]);
    });

    it('should handle different artifact types correctly', () => {
      const initiative = createMockArtifact({
        type: 'initiative',
        events: [
          createEvent({
            event: CArtifactEvent.IN_PROGRESS,
            actor: 'test@example.com',
          }),
        ],
      });

      const validStates = getValidTransitions(initiative);
      expect(validStates).toContain(CArtifactEvent.IN_REVIEW);
      expect(validStates).toContain(CArtifactEvent.CANCELLED);
    });
  });

  describe('performTransition(artifact, newState)', () => {
    it('should successfully transition to valid state and add event', () => {
      const artifact = createMockArtifact({
        type: 'issue',
        events: [
          createEvent({
            event: CArtifactEvent.DRAFT,
            actor: 'test@example.com',
          }),
        ],
      });

      const initialEventCount = artifact.metadata.events.length;

      performTransition(
        artifact,
        CArtifactEvent.READY,
        'developer@example.com',
      );

      // Check event was added
      expect(artifact.metadata.events.length).toBe(initialEventCount + 1);

      // Check latest event is correct
      const latestEvent =
        artifact.metadata.events[artifact.metadata.events.length - 1];
      expect(latestEvent?.event).toBe(CArtifactEvent.READY);
      expect(latestEvent?.actor).toBe('developer@example.com');
      expect(latestEvent?.trigger).toBeDefined();
    });

    it('should throw StateTransitionError for invalid transitions', () => {
      const artifact = createMockArtifact({
        type: 'issue',
        events: [
          createEvent({
            event: CArtifactEvent.DRAFT,
            actor: 'test@example.com',
          }),
        ],
      });

      expect(() => {
        performTransition(
          artifact,
          CArtifactEvent.COMPLETED,
          'developer@example.com',
        );
      }).toThrow(StateTransitionError);
    });

    it('should provide descriptive error message for invalid transitions', () => {
      const artifact = createMockArtifact({
        type: 'issue',
        events: [
          createEvent({
            event: CArtifactEvent.DRAFT,
            actor: 'test@example.com',
          }),
        ],
      });

      expect(() => {
        performTransition(
          artifact,
          CArtifactEvent.IN_PROGRESS,
          'developer@example.com',
        );
      }).toThrow(/Cannot transition from draft to in_progress/);
    });

    it('should prevent transitions from terminal states', () => {
      const artifact = createMockArtifact({
        type: 'issue',
        events: [
          createEvent({
            event: CArtifactEvent.COMPLETED,
            actor: 'test@example.com',
          }),
        ],
      });

      expect(() => {
        performTransition(
          artifact,
          CArtifactEvent.IN_REVIEW,
          'developer@example.com',
        );
      }).toThrow(StateTransitionError);
    });

    it('should require reason metadata for blocked state transitions', () => {
      const artifact = createMockArtifact({
        type: 'issue',
        events: [
          createEvent({
            event: CArtifactEvent.DRAFT,
            actor: 'test@example.com',
          }),
        ],
      });

      // Should throw if no reason provided
      expect(() => {
        performTransition(
          artifact,
          CArtifactEvent.BLOCKED,
          'developer@example.com',
        );
      }).toThrow(/Blocked state requires reason in metadata/);

      // Should succeed with reason
      expect(() => {
        performTransition(
          artifact,
          CArtifactEvent.BLOCKED,
          'developer@example.com',
          { reason: 'Waiting for design approval' },
        );
      }).not.toThrow();

      // Check that reason was added to event
      const latestEvent =
        artifact.metadata.events[artifact.metadata.events.length - 1];
      expect(latestEvent?.metadata?.reason).toBe('Waiting for design approval');
    });

    it('should accept additional metadata for events', () => {
      const artifact = createMockArtifact({
        type: 'issue',
        events: [
          createEvent({
            event: CArtifactEvent.READY,
            actor: 'test@example.com',
          }),
        ],
      });

      performTransition(
        artifact,
        CArtifactEvent.IN_PROGRESS,
        'developer@example.com',
        { branch: 'feature/auth' },
      );

      const latestEvent =
        artifact.metadata.events[artifact.metadata.events.length - 1];
      expect(latestEvent?.metadata?.branch).toBe('feature/auth');
    });

    it('should work with all artifact types', () => {
      const milestone = createMockArtifact({
        type: 'milestone',
        events: [
          createEvent({
            event: CArtifactEvent.READY,
            actor: 'test@example.com',
          }),
        ],
      });

      expect(() => {
        performTransition(
          milestone,
          CArtifactEvent.IN_PROGRESS,
          'manager@example.com',
        );
      }).not.toThrow();

      const latestEvent =
        milestone.metadata.events[milestone.metadata.events.length - 1];
      expect(latestEvent?.event).toBe(CArtifactEvent.IN_PROGRESS);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle artifacts with empty events array', () => {
      const artifact: Issue = {
        metadata: {
          title: 'Test Issue',
          priority: 'medium',
          estimation: 'S',
          created_by: 'test@example.com',
          assignee: 'test@example.com',
          schema_version: '0.2.0',
          relationships: { blocks: [], blocked_by: [] },
          events: [], // Empty events array
        },
        content: {
          summary: 'Test',
          acceptance_criteria: ['Test'],
        },
      };

      expect(() => canTransition(artifact, CArtifactEvent.READY)).toThrow();
      expect(() => getValidTransitions(artifact)).toThrow();
      expect(() =>
        performTransition(artifact, CArtifactEvent.READY, 'dev@example.com'),
      ).toThrow();
    });

    it('should handle artifacts with unknown type gracefully', () => {
      // Create artifact with unknown content structure
      const unknownArtifact = {
        metadata: {
          title: 'Unknown Type',
          priority: 'medium',
          estimation: 'S',
          created_by: 'test@example.com',
          assignee: 'test@example.com',
          schema_version: '0.2.0',
          relationships: { blocks: [], blocked_by: [] },
          events: [
            createEvent({
              event: CArtifactEvent.DRAFT,
              actor: 'test@example.com',
            }),
          ],
        },
        content: {
          unknown_field: 'unknown_value', // Doesn't match any known artifact type
        },
      } as unknown as Artifact;

      expect(() =>
        canTransition(unknownArtifact, CArtifactEvent.READY),
      ).toThrow(/Unknown artifact type/);
    });
  });
});
