import { describe, expect, it } from 'vitest';
import type { EventMetadata } from '../../data/types';
import { CArtifactEvent, CEventTrigger } from '../../data/types/constants';
import {
  canTransition,
  getValidTransitions,
  StateTransitionError,
  validateEventOrder,
} from './state-machine';

describe('State Machine Validation', () => {
  describe('canTransition', () => {
    describe('Issue transitions', () => {
      it('should allow valid transitions from draft', () => {
        expect(
          canTransition('issue', CArtifactEvent.DRAFT, CArtifactEvent.READY),
        ).toBe(true);
        expect(
          canTransition('issue', CArtifactEvent.DRAFT, CArtifactEvent.BLOCKED),
        ).toBe(true);
        expect(
          canTransition(
            'issue',
            CArtifactEvent.DRAFT,
            CArtifactEvent.CANCELLED,
          ),
        ).toBe(true);
      });

      it('should disallow invalid transitions from draft', () => {
        expect(
          canTransition(
            'issue',
            CArtifactEvent.DRAFT,
            CArtifactEvent.IN_PROGRESS,
          ),
        ).toBe(false);
        expect(
          canTransition(
            'issue',
            CArtifactEvent.DRAFT,
            CArtifactEvent.IN_REVIEW,
          ),
        ).toBe(false);
        expect(
          canTransition(
            'issue',
            CArtifactEvent.DRAFT,
            CArtifactEvent.COMPLETED,
          ),
        ).toBe(false);
      });

      it('should allow valid transitions from ready', () => {
        expect(
          canTransition(
            'issue',
            CArtifactEvent.READY,
            CArtifactEvent.IN_PROGRESS,
          ),
        ).toBe(true);
        expect(
          canTransition(
            'issue',
            CArtifactEvent.READY,
            CArtifactEvent.CANCELLED,
          ),
        ).toBe(true);
      });

      it('should disallow transitions from completed (terminal state)', () => {
        expect(
          canTransition(
            'issue',
            CArtifactEvent.COMPLETED,
            CArtifactEvent.DRAFT,
          ),
        ).toBe(false);
        expect(
          canTransition(
            'issue',
            CArtifactEvent.COMPLETED,
            CArtifactEvent.READY,
          ),
        ).toBe(false);
        expect(
          canTransition(
            'issue',
            CArtifactEvent.COMPLETED,
            CArtifactEvent.CANCELLED,
          ),
        ).toBe(false);
      });

      it('should allow cancelled to draft (reactivation)', () => {
        expect(
          canTransition(
            'issue',
            CArtifactEvent.CANCELLED,
            CArtifactEvent.DRAFT,
          ),
        ).toBe(true);
        expect(
          canTransition(
            'issue',
            CArtifactEvent.CANCELLED,
            CArtifactEvent.ARCHIVED,
          ),
        ).toBe(true);
      });

      it('should disallow transitions from archived (terminal state)', () => {
        expect(
          canTransition('issue', CArtifactEvent.ARCHIVED, CArtifactEvent.DRAFT),
        ).toBe(false);
        expect(
          canTransition('issue', CArtifactEvent.ARCHIVED, CArtifactEvent.READY),
        ).toBe(false);
      });
    });

    describe('Milestone transitions', () => {
      it('should have specific rules for milestones', () => {
        expect(
          canTransition(
            'milestone',
            CArtifactEvent.DRAFT,
            CArtifactEvent.READY,
          ),
        ).toBe(true);
        expect(
          canTransition(
            'milestone',
            CArtifactEvent.READY,
            CArtifactEvent.IN_PROGRESS,
          ),
        ).toBe(true);
        expect(
          canTransition(
            'milestone',
            CArtifactEvent.IN_PROGRESS,
            CArtifactEvent.IN_REVIEW,
          ),
        ).toBe(true);
      });
    });

    describe('Initiative transitions', () => {
      it('should have specific rules for initiatives', () => {
        expect(
          canTransition(
            'initiative',
            CArtifactEvent.DRAFT,
            CArtifactEvent.READY,
          ),
        ).toBe(true);
        expect(
          canTransition(
            'initiative',
            CArtifactEvent.READY,
            CArtifactEvent.IN_PROGRESS,
          ),
        ).toBe(true);
        expect(
          canTransition(
            'initiative',
            CArtifactEvent.IN_PROGRESS,
            CArtifactEvent.IN_REVIEW,
          ),
        ).toBe(true);
      });
    });
  });

  describe('getValidTransitions', () => {
    it('should return valid transitions for draft state', () => {
      const transitions = getValidTransitions('issue', CArtifactEvent.DRAFT);
      expect(transitions).toContain(CArtifactEvent.READY);
      expect(transitions).toContain(CArtifactEvent.BLOCKED);
      expect(transitions).toContain(CArtifactEvent.CANCELLED);
      expect(transitions).not.toContain(CArtifactEvent.IN_PROGRESS);
    });

    it('should return empty array for terminal states', () => {
      expect(getValidTransitions('issue', CArtifactEvent.COMPLETED)).toEqual(
        [],
      );
      expect(getValidTransitions('issue', CArtifactEvent.ARCHIVED)).toEqual([]);
    });

    it('should return valid transitions for in_progress state', () => {
      const transitions = getValidTransitions(
        'issue',
        CArtifactEvent.IN_PROGRESS,
      );
      expect(transitions).toContain(CArtifactEvent.IN_REVIEW);
      expect(transitions).toContain(CArtifactEvent.CANCELLED);
      expect(transitions).not.toContain(CArtifactEvent.DRAFT);
    });
  });

  describe('validateEventOrder', () => {
    it('should validate correctly ordered events', () => {
      const events: EventMetadata[] = [
        {
          event: CArtifactEvent.DRAFT,
          timestamp: '2025-01-01T10:00:00Z',
          actor: 'John Doe (john@example.com)',
          trigger: CEventTrigger.ARTIFACT_CREATED,
        },
        {
          event: CArtifactEvent.READY,
          timestamp: '2025-01-01T11:00:00Z',
          actor: 'John Doe (john@example.com)',
          trigger: CEventTrigger.DEPENDENCIES_MET,
        },
        {
          event: CArtifactEvent.IN_PROGRESS,
          timestamp: '2025-01-01T12:00:00Z',
          actor: 'John Doe (john@example.com)',
          trigger: CEventTrigger.BRANCH_CREATED,
        },
      ];

      expect(() => validateEventOrder(events, 'issue')).not.toThrow();
    });

    it('should throw error for out-of-order timestamps', () => {
      const events: EventMetadata[] = [
        {
          event: CArtifactEvent.DRAFT,
          timestamp: '2025-01-01T12:00:00Z',
          actor: 'John Doe (john@example.com)',
          trigger: CEventTrigger.ARTIFACT_CREATED,
        },
        {
          event: CArtifactEvent.READY,
          timestamp: '2025-01-01T10:00:00Z',
          actor: 'John Doe (john@example.com)',
          trigger: CEventTrigger.DEPENDENCIES_MET,
        },
      ];

      expect(() => validateEventOrder(events, 'issue')).toThrow(
        StateTransitionError,
      );
      expect(() => validateEventOrder(events, 'issue')).toThrow(
        'Events are not in chronological order',
      );
    });

    it('should throw error for invalid state transitions', () => {
      const events: EventMetadata[] = [
        {
          event: CArtifactEvent.DRAFT,
          timestamp: '2025-01-01T10:00:00Z',
          actor: 'John Doe (john@example.com)',
          trigger: CEventTrigger.ARTIFACT_CREATED,
        },
        {
          event: CArtifactEvent.IN_REVIEW,
          timestamp: '2025-01-01T11:00:00Z',
          actor: 'John Doe (john@example.com)',
          trigger: CEventTrigger.MANUAL,
        },
      ];

      expect(() => validateEventOrder(events, 'issue')).toThrow(
        StateTransitionError,
      );
      expect(() => validateEventOrder(events, 'issue')).toThrow(
        'Invalid state transition',
      );
    });

    it('should require at least one event', () => {
      expect(() => validateEventOrder([], 'issue')).toThrow(
        'Events array cannot be empty',
      );
    });

    it('should require first event to be draft', () => {
      const events: EventMetadata[] = [
        {
          event: CArtifactEvent.READY,
          timestamp: '2025-01-01T10:00:00Z',
          actor: 'John Doe (john@example.com)',
          trigger: CEventTrigger.DEPENDENCIES_MET,
        },
      ];

      expect(() => validateEventOrder(events, 'issue')).toThrow(
        'First event must be draft',
      );
    });
  });
});
