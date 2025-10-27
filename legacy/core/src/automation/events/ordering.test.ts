import { describe, expect, it } from 'vitest';
import type { EventMetadata, TArtifactEvent } from '../../data/types';
import { CArtifactEvent, CEventTrigger } from '../../data/types/constants';
import {
  getEventsByType,
  getLatestEventByType,
  sortEventsByTimestamp,
  validateEventChronology,
} from './ordering';

// Helper to create mock events
function createMockEvent(
  event: string,
  timestamp: string,
  trigger: string = CEventTrigger.MANUAL,
): EventMetadata {
  return {
    event: event as TArtifactEvent,
    timestamp,
    actor: 'test@example.com',
    trigger,
  };
}

describe('Event Ordering Utilities', () => {
  describe('sortEventsByTimestamp', () => {
    it('should sort events in chronological order', () => {
      const events: EventMetadata[] = [
        createMockEvent(CArtifactEvent.IN_PROGRESS, '2024-01-03T00:00:00Z'),
        createMockEvent(CArtifactEvent.DRAFT, '2024-01-01T00:00:00Z'),
        createMockEvent(CArtifactEvent.READY, '2024-01-02T00:00:00Z'),
      ];

      const sorted = sortEventsByTimestamp(events);

      expect(sorted[0]?.event).toBe(CArtifactEvent.DRAFT);
      expect(sorted[1]?.event).toBe(CArtifactEvent.READY);
      expect(sorted[2]?.event).toBe(CArtifactEvent.IN_PROGRESS);
    });

    it('should handle events with same timestamp', () => {
      const events: EventMetadata[] = [
        createMockEvent(CArtifactEvent.IN_PROGRESS, '2024-01-01T00:00:00Z'),
        createMockEvent(CArtifactEvent.READY, '2024-01-01T00:00:00Z'),
      ];

      const sorted = sortEventsByTimestamp(events);

      expect(sorted).toHaveLength(2);
      // Order should be stable
      expect(sorted[0]?.event).toBe(CArtifactEvent.IN_PROGRESS);
      expect(sorted[1]?.event).toBe(CArtifactEvent.READY);
    });

    it('should not mutate original array', () => {
      const events: EventMetadata[] = [
        createMockEvent(CArtifactEvent.IN_PROGRESS, '2024-01-02T00:00:00Z'),
        createMockEvent(CArtifactEvent.DRAFT, '2024-01-01T00:00:00Z'),
      ];
      const originalCopy = [...events];

      sortEventsByTimestamp(events);

      expect(events).toEqual(originalCopy);
    });
  });

  describe('validateEventChronology', () => {
    it('should validate correctly ordered events', () => {
      const events: EventMetadata[] = [
        createMockEvent(CArtifactEvent.DRAFT, '2024-01-01T00:00:00Z'),
        createMockEvent(CArtifactEvent.READY, '2024-01-02T00:00:00Z'),
        createMockEvent(CArtifactEvent.IN_PROGRESS, '2024-01-03T00:00:00Z'),
      ];

      expect(() => validateEventChronology(events)).not.toThrow();
    });

    it('should throw error for out-of-order events', () => {
      const events: EventMetadata[] = [
        createMockEvent(CArtifactEvent.DRAFT, '2024-01-02T00:00:00Z'),
        createMockEvent(CArtifactEvent.READY, '2024-01-01T00:00:00Z'),
      ];

      expect(() => validateEventChronology(events)).toThrow(
        'Events are not in chronological order: 2024-01-02T00:00:00Z > 2024-01-01T00:00:00Z',
      );
    });

    it('should allow events with same timestamp', () => {
      const events: EventMetadata[] = [
        createMockEvent(CArtifactEvent.DRAFT, '2024-01-01T00:00:00Z'),
        createMockEvent(CArtifactEvent.READY, '2024-01-01T00:00:00Z'),
      ];

      expect(() => validateEventChronology(events)).not.toThrow();
    });

    it('should throw error for empty events array', () => {
      expect(() => validateEventChronology([])).toThrow(
        'Cannot validate chronology of empty events array',
      );
    });
  });

  describe('getEventsByType', () => {
    it('should filter events by type', () => {
      const events: EventMetadata[] = [
        createMockEvent(CArtifactEvent.DRAFT, '2024-01-01T00:00:00Z'),
        createMockEvent(CArtifactEvent.READY, '2024-01-02T00:00:00Z'),
        createMockEvent(CArtifactEvent.CANCELLED, '2024-01-03T00:00:00Z'),
        createMockEvent(CArtifactEvent.DRAFT, '2024-01-04T00:00:00Z'),
      ];

      const draftEvents = getEventsByType(events, CArtifactEvent.DRAFT);

      expect(draftEvents).toHaveLength(2);
      expect(draftEvents[0]?.timestamp).toBe('2024-01-01T00:00:00Z');
      expect(draftEvents[1]?.timestamp).toBe('2024-01-04T00:00:00Z');
    });

    it('should return empty array when no events match', () => {
      const events: EventMetadata[] = [
        createMockEvent(CArtifactEvent.DRAFT, '2024-01-01T00:00:00Z'),
        createMockEvent(CArtifactEvent.READY, '2024-01-02T00:00:00Z'),
      ];

      const completedEvents = getEventsByType(events, CArtifactEvent.COMPLETED);

      expect(completedEvents).toHaveLength(0);
    });

    it('should maintain chronological order', () => {
      const events: EventMetadata[] = [
        createMockEvent(CArtifactEvent.READY, '2024-01-03T00:00:00Z'),
        createMockEvent(CArtifactEvent.READY, '2024-01-01T00:00:00Z'),
        createMockEvent(CArtifactEvent.READY, '2024-01-02T00:00:00Z'),
      ];

      const readyEvents = getEventsByType(events, CArtifactEvent.READY);

      expect(readyEvents[0]?.timestamp).toBe('2024-01-03T00:00:00Z');
      expect(readyEvents[1]?.timestamp).toBe('2024-01-01T00:00:00Z');
      expect(readyEvents[2]?.timestamp).toBe('2024-01-02T00:00:00Z');
    });
  });

  describe('getLatestEventByType', () => {
    it('should return the most recent event of given type', () => {
      const events: EventMetadata[] = [
        createMockEvent(CArtifactEvent.DRAFT, '2024-01-01T00:00:00Z'),
        createMockEvent(CArtifactEvent.READY, '2024-01-02T00:00:00Z'),
        createMockEvent(CArtifactEvent.DRAFT, '2024-01-03T00:00:00Z'),
        createMockEvent(CArtifactEvent.READY, '2024-01-04T00:00:00Z'),
      ];

      const latestReady = getLatestEventByType(events, CArtifactEvent.READY);

      expect(latestReady?.timestamp).toBe('2024-01-04T00:00:00Z');
    });

    it('should return null when no events match', () => {
      const events: EventMetadata[] = [
        createMockEvent(CArtifactEvent.DRAFT, '2024-01-01T00:00:00Z'),
        createMockEvent(CArtifactEvent.READY, '2024-01-02T00:00:00Z'),
      ];

      const latestCompleted = getLatestEventByType(
        events,
        CArtifactEvent.COMPLETED,
      );

      expect(latestCompleted).toBeNull();
    });

    it('should handle single matching event', () => {
      const events: EventMetadata[] = [
        createMockEvent(CArtifactEvent.DRAFT, '2024-01-01T00:00:00Z'),
        createMockEvent(CArtifactEvent.READY, '2024-01-02T00:00:00Z'),
        createMockEvent(CArtifactEvent.IN_PROGRESS, '2024-01-03T00:00:00Z'),
      ];

      const latestInProgress = getLatestEventByType(
        events,
        CArtifactEvent.IN_PROGRESS,
      );

      expect(latestInProgress?.timestamp).toBe('2024-01-03T00:00:00Z');
    });
  });
});
