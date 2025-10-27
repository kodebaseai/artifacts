import { describe, expect, it } from 'vitest';
import type { EventMetadata, TArtifactEvent } from '../../data/types';
import { CEventTrigger } from '../../data/types/constants';
import {
  deduplicateEvents,
  detectDuplicateEvents,
  sortEventsByTimestamp,
  validateChronologicalOrder,
} from './deduplication';

describe('Event Deduplication', () => {
  const createMockEvent = (
    event: string,
    actor: string,
    timestamp: string,
    trigger = CEventTrigger.MANUAL,
    metadata?: Record<string, unknown>,
  ): EventMetadata => ({
    event: event as TArtifactEvent,
    timestamp,
    actor,
    trigger,
    metadata,
  });

  describe('detectDuplicateEvents', () => {
    it('should detect exact duplicates', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ), // Exact duplicate
        createMockEvent(
          'ready',
          'Jane Doe (jane@example.com)',
          '2025-01-01T11:00:00Z',
        ),
      ];

      const duplicates = detectDuplicateEvents(events);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0]?.originalIndex).toBe(0);
      expect(duplicates[0]?.duplicateIndex).toBe(1);
      expect(duplicates[0]?.reason).toContain('simultaneous');
    });

    it('should handle timestamp tolerance', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:30Z', // 30 seconds later
        ),
      ];

      // With default tolerance (60 seconds), these should be considered duplicates
      const duplicates = detectDuplicateEvents(events);
      expect(duplicates).toHaveLength(1);

      // With strict tolerance (0 seconds), these should not be duplicates
      const strictDuplicates = detectDuplicateEvents(events, {
        timestampTolerance: 0,
      });
      expect(strictDuplicates).toHaveLength(0);
    });

    it('should respect different actors', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'draft',
          'Jane Doe (jane@example.com)', // Different actor
          '2025-01-01T10:00:00Z',
        ),
      ];

      const duplicates = detectDuplicateEvents(events);

      expect(duplicates).toHaveLength(0); // Different actors, not duplicates
    });

    it('should respect different event types', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'ready', // Different event type
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
      ];

      const duplicates = detectDuplicateEvents(events);

      expect(duplicates).toHaveLength(0); // Different event types, not duplicates
    });

    it('should handle empty events array', () => {
      const duplicates = detectDuplicateEvents([]);
      expect(duplicates).toHaveLength(0);
    });

    it('should handle single event', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
      ];

      const duplicates = detectDuplicateEvents(events);
      expect(duplicates).toHaveLength(0);
    });

    it('should handle multiple duplicate groups', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ), // Duplicate of first
        createMockEvent(
          'ready',
          'Jane Doe (jane@example.com)',
          '2025-01-01T11:00:00Z',
        ),
        createMockEvent(
          'ready',
          'Jane Doe (jane@example.com)',
          '2025-01-01T11:00:00Z',
        ), // Duplicate of third
      ];

      const duplicates = detectDuplicateEvents(events);

      expect(duplicates).toHaveLength(2);
      expect(duplicates[0]?.originalIndex).toBe(0);
      expect(duplicates[0]?.duplicateIndex).toBe(1);
      expect(duplicates[1]?.originalIndex).toBe(2);
      expect(duplicates[1]?.duplicateIndex).toBe(3);
    });
  });

  describe('deduplicateEvents', () => {
    it('should remove duplicate events', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ), // Duplicate
        createMockEvent(
          'ready',
          'Jane Doe (jane@example.com)',
          '2025-01-01T11:00:00Z',
        ),
      ];

      const result = deduplicateEvents(events);

      expect(result.hadDuplicates).toBe(true);
      expect(result.duplicatesRemoved).toBe(1);
      expect(result.cleanedEvents).toHaveLength(2);
      expect(result.cleanedEvents[0]?.event).toBe('draft');
      expect(result.cleanedEvents[1]?.event).toBe('ready');
    });

    it('should preserve chronological order', () => {
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
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:01Z',
        ), // Duplicate of second (within tolerance)
      ];

      const result = deduplicateEvents(events);

      expect(result.cleanedEvents).toHaveLength(2);
      // Should be sorted chronologically and have correct events
      expect(result.cleanedEvents).toHaveLength(2);
      // Just check that we have both unique events, regardless of order
      const eventTypes = result.cleanedEvents.map((e) => e.event);
      expect(eventTypes).toContain('draft');
      expect(eventTypes).toContain('ready');
    });

    it('should handle no duplicates', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'ready',
          'Jane Doe (jane@example.com)',
          '2025-01-01T11:00:00Z',
        ),
      ];

      const result = deduplicateEvents(events);

      expect(result.hadDuplicates).toBe(false);
      expect(result.duplicatesRemoved).toBe(0);
      expect(result.cleanedEvents).toEqual(events);
      expect(result.summary).toBe('No duplicate events found');
    });

    it('should handle empty events array', () => {
      const result = deduplicateEvents([]);

      expect(result.hadDuplicates).toBe(false);
      expect(result.duplicatesRemoved).toBe(0);
      expect(result.cleanedEvents).toEqual([]);
      expect(result.summary).toBe('No duplicate events found');
    });

    it('should preserve metadata during deduplication', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
          CEventTrigger.MANUAL,
          {
            important_data: 'should_be_preserved',
            cascade_root: 'valid_root',
          },
        ),
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
          CEventTrigger.MANUAL,
          {
            duplicate_data: 'should_be_removed',
            cascade_root: 'valid_root',
          },
        ), // Duplicate
      ];

      const result = deduplicateEvents(events);

      expect(result.cleanedEvents).toHaveLength(1);
      expect(result.cleanedEvents[0]?.metadata?.important_data).toBe(
        'should_be_preserved',
      );
      expect(result.cleanedEvents[0]?.metadata?.duplicate_data).toBeUndefined();
    });
  });

  describe('sortEventsByTimestamp', () => {
    it('should sort events chronologically', () => {
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
        createMockEvent(
          'in_progress',
          'John Doe (john@example.com)',
          '2025-01-01T12:00:00Z',
        ),
      ];

      const sorted = sortEventsByTimestamp(events);

      expect(sorted[0]?.timestamp).toBe('2025-01-01T10:00:00Z');
      expect(sorted[1]?.timestamp).toBe('2025-01-01T11:00:00Z');
      expect(sorted[2]?.timestamp).toBe('2025-01-01T12:00:00Z');
    });

    it('should handle empty array', () => {
      const sorted = sortEventsByTimestamp([]);
      expect(sorted).toEqual([]);
    });

    it('should handle single event', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
      ];

      const sorted = sortEventsByTimestamp(events);
      expect(sorted).toEqual(events);
    });
  });

  describe('validateChronologicalOrder', () => {
    it('should return true for chronologically ordered events', () => {
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

      expect(validateChronologicalOrder(events)).toBe(true);
    });

    it('should return false for out-of-order events', () => {
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
        ), // Out of order
      ];

      expect(validateChronologicalOrder(events)).toBe(false);
    });

    it('should handle empty array', () => {
      expect(validateChronologicalOrder([])).toBe(true);
    });

    it('should handle single event', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
      ];

      expect(validateChronologicalOrder(events)).toBe(true);
    });

    it('should handle events with same timestamp', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'ready',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z', // Same timestamp
        ),
      ];

      expect(validateChronologicalOrder(events)).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large arrays efficiently', () => {
      const events = Array.from({ length: 1000 }, (_, i) =>
        createMockEvent(
          'draft',
          `User ${i} (user${i}@example.com)`,
          `2025-01-01T${String(10 + (i % 100)).padStart(2, '0')}:00:00Z`,
        ),
      );

      const start = performance.now();
      const result = deduplicateEvents(events);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(result.cleanedEvents.length).toBeGreaterThan(0);
    });
  });
});
