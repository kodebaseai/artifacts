import { describe, expect, it, vi } from 'vitest';
import type {
  EventMetadata,
  TArtifactEvent,
  TEventTrigger,
} from '../../data/types';
import { CEventTrigger } from '../../data/types/constants';
import {
  autoFixValidationErrors,
  validateCascadeIntegrity,
  validateCleanupPreservesStateMachine,
  validateEventSequence,
  wouldEventSequenceBeValid,
} from './validation';

// Mock the state machine functions since they're in a different module
vi.mock('../validation/state-machine', () => ({
  validateEventOrder: vi.fn((events, _artifactType) => {
    // Simple mock: throw if first event is not draft
    if (events.length > 0 && events[0].event !== 'draft') {
      throw new Error('First event must be draft');
    }
  }),
  canTransition: vi.fn((_artifactType, fromState, toState) => {
    // Simple mock transitions
    const validTransitions: Record<string, string[]> = {
      draft: ['ready', 'blocked', 'cancelled'],
      ready: ['in_progress', 'cancelled'],
      in_progress: ['in_review', 'cancelled'],
      in_review: ['completed', 'cancelled'],
      completed: [],
      cancelled: ['archived'],
      archived: [],
    };
    return validTransitions[fromState]?.includes(toState) || false;
  }),
  getCurrentState: vi.fn((events) => {
    return events.length > 0 ? events[events.length - 1].event : null;
  }),
  getValidTransitions: vi.fn((_artifactType, fromState) => {
    const validTransitions: Record<string, string[]> = {
      draft: ['ready', 'blocked', 'cancelled'],
      ready: ['in_progress', 'cancelled'],
      in_progress: ['in_review', 'cancelled'],
      in_review: ['completed', 'cancelled'],
      completed: [],
      cancelled: ['archived'],
      archived: [],
    };
    return validTransitions[fromState] || [];
  }),
}));

describe('Event Sequence Validation', () => {
  const createMockEvent = (
    event: string,
    actor: string,
    timestamp: string,
    trigger: TEventTrigger = CEventTrigger.MANUAL,
    metadata?: Record<string, unknown>,
  ): EventMetadata => ({
    event: event as TArtifactEvent,
    timestamp,
    actor,
    trigger,
    metadata,
  });

  describe('validateEventSequence', () => {
    it('should validate a correct event sequence', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'ready',
          'John Doe (john@example.com)',
          '2025-01-01T11:00:00Z',
        ),
        createMockEvent(
          'in_progress',
          'John Doe (john@example.com)',
          '2025-01-01T12:00:00Z',
        ),
      ];

      const result = validateEventSequence(events, 'issue');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary).toContain('Valid event sequence (3 events)');
    });

    it('should detect empty events array', () => {
      const result = validateEventSequence([], 'issue');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(0);
      expect(result.summary).toContain('No events found');
    });

    it('should detect invalid first event', () => {
      const events = [
        createMockEvent(
          'ready',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ), // Should be draft
      ];

      const result = validateEventSequence(events, 'issue');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.errorType).toBe('first_event');
      expect(result.errors[0]?.message).toContain('First event must be draft');
    });

    it('should detect chronological order violations', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T12:00:00Z',
        ), // Later time
        createMockEvent(
          'ready',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ), // Earlier time
      ];

      const result = validateEventSequence(events, 'issue');

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.errorType === 'chronological')).toBe(
        true,
      );
      expect(
        result.errors.find((e) => e.errorType === 'chronological')?.message,
      ).toContain('occurs before previous event');
    });

    it('should detect invalid state transitions', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'completed',
          'John Doe (john@example.com)',
          '2025-01-01T11:00:00Z',
        ), // Invalid transition
      ];

      const result = validateEventSequence(events, 'issue');

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.errorType === 'state_transition'),
      ).toBe(true);
      expect(
        result.errors.find((e) => e.errorType === 'state_transition')?.message,
      ).toContain('Invalid state transition from draft to completed');
    });

    it('should detect missing trigger field', () => {
      const events = [
        {
          event: 'draft' as TArtifactEvent,
          timestamp: '2025-01-01T10:00:00Z',
          actor: 'John Doe (john@example.com)',
          // trigger missing
        } as EventMetadata,
      ];

      const result = validateEventSequence(events, 'issue');

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.errorType === 'missing_trigger')).toBe(
        true,
      );
    });

    it('should handle multiple validation errors', () => {
      const events = [
        createMockEvent(
          'ready',
          'John Doe (john@example.com)',
          '2025-01-01T12:00:00Z',
        ), // Wrong first event
        createMockEvent(
          'completed',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z', // Earlier timestamp (chronological error)
          CEventTrigger.MANUAL,
        ),
      ];

      const result = validateEventSequence(events, 'issue');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors.some((e) => e.errorType === 'first_event')).toBe(
        true,
      );
      expect(result.errors.some((e) => e.errorType === 'chronological')).toBe(
        true,
      );
      expect(
        result.errors.some((e) => e.errorType === 'state_transition'),
      ).toBe(true);
    });
  });

  describe('validateCleanupPreservesStateMachine', () => {
    it('should pass when cleanup preserves valid state machine', () => {
      const original = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'ready',
          'John Doe (john@example.com)',
          '2025-01-01T11:00:00Z',
        ),
        createMockEvent(
          'ready',
          'Jane Doe (jane@example.com)',
          '2025-01-01T11:30:00Z',
        ), // Duplicate
      ];

      const cleaned = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'ready',
          'John Doe (john@example.com)',
          '2025-01-01T11:00:00Z',
        ),
      ];

      const result = validateCleanupPreservesStateMachine(
        original,
        cleaned,
        'issue',
      );

      expect(result.isValid).toBe(true);
      expect(result.summary).toContain('preserved valid state machine');
    });

    it('should fail when cleanup breaks state machine', () => {
      const original = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'ready',
          'John Doe (john@example.com)',
          '2025-01-01T11:00:00Z',
        ),
      ];

      const cleaned = [
        createMockEvent(
          'ready',
          'John Doe (john@example.com)',
          '2025-01-01T11:00:00Z',
        ), // Missing draft
      ];

      const result = validateCleanupPreservesStateMachine(
        original,
        cleaned,
        'issue',
      );

      expect(result.isValid).toBe(false);
      expect(result.summary).toContain('broke state machine');
    });

    it('should fail when cleanup changes current state', () => {
      const original = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'ready',
          'John Doe (john@example.com)',
          '2025-01-01T11:00:00Z',
        ),
      ];

      const cleaned = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
      ];

      const result = validateCleanupPreservesStateMachine(
        original,
        cleaned,
        'issue',
      );

      expect(result.isValid).toBe(false);
      expect(result.summary).toContain(
        'Cleanup changed artifact current state',
      );
    });
  });

  describe('autoFixValidationErrors', () => {
    it('should fix chronological order by sorting', () => {
      const events = [
        createMockEvent(
          'ready',
          'John Doe (john@example.com)',
          '2025-01-01T12:00:00Z',
        ),
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
      ];

      const { fixedEvents, fixesApplied } = autoFixValidationErrors(
        events,
        'issue',
      );

      expect(fixedEvents[0]?.event).toBe('draft');
      expect(fixedEvents[1]?.event).toBe('ready');
      expect(fixesApplied).toContain('Sorted events by timestamp');
    });

    it('should move draft event to first position', () => {
      const events = [
        createMockEvent(
          'ready',
          'John Doe (john@example.com)',
          '2025-01-01T11:00:00Z',
        ),
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
      ];

      const { fixedEvents, fixesApplied } = autoFixValidationErrors(
        events,
        'issue',
      );

      expect(fixedEvents[0]?.event).toBe('draft');
      expect(fixesApplied).toContain('Moved draft event to first position');
    });

    it('should add missing triggers', () => {
      const events = [
        {
          event: 'draft' as TArtifactEvent,
          timestamp: '2025-01-01T10:00:00Z',
          actor: 'John Doe (john@example.com)',
          // trigger missing
        } as EventMetadata,
      ];

      const { fixedEvents, fixesApplied } = autoFixValidationErrors(
        events,
        'issue',
      );

      expect(fixedEvents[0]?.trigger).toBeDefined();
      expect(fixedEvents[0]?.trigger).toBe(CEventTrigger.MANUAL);
      expect(fixesApplied).toContain('Added 1 missing trigger');
    });

    it('should apply multiple fixes', () => {
      const events = [
        {
          event: 'ready' as TArtifactEvent,
          timestamp: '2025-01-01T12:00:00Z',
          actor: 'John Doe (john@example.com)',
          // trigger missing
        } as EventMetadata,
        {
          event: 'draft' as TArtifactEvent,
          timestamp: '2025-01-01T10:00:00Z',
          actor: 'John Doe (john@example.com)',
          // trigger missing
        } as EventMetadata,
      ];

      const { fixedEvents, fixesApplied } = autoFixValidationErrors(
        events,
        'issue',
      );

      expect(fixedEvents[0]?.event).toBe('draft');
      expect(fixedEvents[0]?.trigger).toBeDefined();
      expect(fixedEvents[1]?.trigger).toBeDefined();
      expect(fixesApplied).toContain('Sorted events by timestamp');
      expect(fixesApplied).toContain('Added 2 missing triggers');
    });

    it('should return original events when no fixes needed', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'ready',
          'John Doe (john@example.com)',
          '2025-01-01T11:00:00Z',
        ),
      ];

      const { fixedEvents, fixesApplied } = autoFixValidationErrors(
        events,
        'issue',
      );

      expect(fixedEvents).toEqual(events);
      expect(fixesApplied).toHaveLength(0);
    });
  });

  describe('wouldEventSequenceBeValid', () => {
    it('should return true for valid new event', () => {
      const existingEvents = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
      ];

      const newEvent = createMockEvent(
        'ready',
        'John Doe (john@example.com)',
        '2025-01-01T11:00:00Z',
      );

      const isValid = wouldEventSequenceBeValid(
        existingEvents,
        newEvent,
        'issue',
      );

      expect(isValid).toBe(true);
    });

    it('should return false for invalid new event', () => {
      const existingEvents = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
      ];

      const newEvent = createMockEvent(
        'completed',
        'John Doe (john@example.com)',
        '2025-01-01T11:00:00Z',
      ); // Invalid transition

      const isValid = wouldEventSequenceBeValid(
        existingEvents,
        newEvent,
        'issue',
      );

      expect(isValid).toBe(false);
    });

    it('should handle chronological order violations', () => {
      const existingEvents = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
      ];

      const newEvent = createMockEvent(
        'ready',
        'John Doe (john@example.com)',
        '2025-01-01T09:00:00Z',
      ); // Earlier time

      const isValid = wouldEventSequenceBeValid(
        existingEvents,
        newEvent,
        'issue',
      );

      expect(isValid).toBe(false);
    });
  });

  describe('validateCascadeIntegrity', () => {
    it('should validate intact cascade chains', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
          CEventTrigger.ARTIFACT_CREATED,
          {
            cascade_root: 'evt_1',
          },
        ),
        createMockEvent(
          'ready',
          'system',
          '2025-01-01T11:00:00Z',
          CEventTrigger.DEPENDENCIES_MET,
          {
            cascade_root: 'evt_1',
            trigger_artifact: 'A.1.1',
          },
        ),
      ];

      const result = validateCascadeIntegrity(events);

      expect(result.isValid).toBe(true);
      expect(result.brokenChains).toHaveLength(0);
    });

    it('should detect broken cascade chains', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'ready',
          'system',
          '2025-01-01T11:00:00Z',
          CEventTrigger.DEPENDENCIES_MET,
          {
            trigger_artifact: 'missing_artifact', // Artifact doesn't exist
          },
        ),
        createMockEvent(
          'in_progress',
          'system',
          '2025-01-01T12:00:00Z',
          CEventTrigger.DEPENDENCY_COMPLETED,
          {
            trigger_artifact: 'also_missing', // Artifact doesn't exist
          },
        ),
      ];

      const result = validateCascadeIntegrity(events);

      expect(result.isValid).toBe(false);
      expect(result.brokenChains).toHaveLength(2);
      expect(result.brokenChains[0]?.missingTriggerArtifact).toBe(
        'missing_artifact',
      );
      expect(result.brokenChains[1]?.missingTriggerArtifact).toBe(
        'also_missing',
      );
    });

    it('should ignore events without cascade metadata', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'ready',
          'John Doe (john@example.com)',
          '2025-01-01T11:00:00Z',
        ),
      ];

      const result = validateCascadeIntegrity(events);

      expect(result.isValid).toBe(true);
      expect(result.brokenChains).toHaveLength(0);
    });

    it('should handle complex cascade chains', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
          CEventTrigger.ARTIFACT_CREATED,
          {
            cascade_root: 'evt_1',
          },
        ),
        createMockEvent(
          'ready',
          'system',
          '2025-01-01T11:00:00Z',
          CEventTrigger.DEPENDENCIES_MET,
          {
            cascade_root: 'evt_1',
            trigger_artifact: 'A.1.1',
          },
        ),
        createMockEvent(
          'in_progress',
          'system',
          '2025-01-01T12:00:00Z',
          CEventTrigger.DEPENDENCY_COMPLETED,
          {
            cascade_root: 'evt_1',
            trigger_artifact: 'A.1.2',
          },
        ),
      ];

      const result = validateCascadeIntegrity(events);

      expect(result.isValid).toBe(true);
      expect(result.brokenChains).toHaveLength(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed timestamps gracefully', () => {
      const events = [
        {
          event: 'draft' as TArtifactEvent,
          timestamp: 'invalid-timestamp',
          actor: 'John Doe (john@example.com)',
          trigger: CEventTrigger.MANUAL,
        } as EventMetadata,
      ];

      expect(() => validateEventSequence(events, 'issue')).not.toThrow();
    });

    it('should handle events with undefined metadata', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        {
          event: 'ready' as TArtifactEvent,
          timestamp: '2025-01-01T11:00:00Z',
          actor: 'John Doe (john@example.com)',
          trigger: CEventTrigger.MANUAL,
          metadata: undefined,
        } as EventMetadata,
      ];

      expect(() => validateCascadeIntegrity(events)).not.toThrow();
    });

    it('should handle empty trigger artifacts in cascade validation', () => {
      const events = [
        {
          event: 'draft' as TArtifactEvent,
          timestamp: '2025-01-01T10:00:00Z',
          actor: 'John Doe (john@example.com)',
          trigger: CEventTrigger.DEPENDENCIES_MET,
          metadata: {
            trigger_artifact: '', // Empty trigger artifact
            cascade_root: 'evt_root',
          },
        } as EventMetadata,
      ];

      const result = validateCascadeIntegrity(events);

      expect(result.isValid).toBe(false);
      expect(result.brokenChains).toHaveLength(1);
    });
  });
});
