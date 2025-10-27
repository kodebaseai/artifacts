import { describe, expect, it, vi } from 'vitest';
import { CArtifactEvent, CEventTrigger } from '../../data/types/constants';
import {
  createDraftEvent,
  createEvent,
  createReadyEvent,
  EventBuilder,
} from './builder';

describe('Event Builder v2.0', () => {
  describe('EventBuilder class', () => {
    it('should build a minimal event with required fields', () => {
      const builder = new EventBuilder();
      const event = builder
        .event('ready')
        .actor('John Doe (john@example.com)')
        .trigger('manual')
        .build();

      expect(event.event).toBe('ready');
      expect(event.actor).toBe('John Doe (john@example.com)');
      expect(event.trigger).toBe('manual');
      expect(event.timestamp).toBeDefined();
      expect(event.metadata).toBeUndefined(); // metadata is optional
    });

    it('should build event with metadata', () => {
      const builder = new EventBuilder();
      const event = builder
        .event('ready')
        .actor('John Doe (john@example.com)')
        .trigger('dependencies_met')
        .metadata({ custom_field: 'test_value' })
        .build();

      expect(event.event).toBe('ready');
      expect(event.actor).toBe('John Doe (john@example.com)');
      expect(event.trigger).toBe('dependencies_met');
      expect(event.metadata).toEqual({ custom_field: 'test_value' });
    });

    it('should throw error if event type is missing', () => {
      const builder = new EventBuilder();
      expect(() =>
        builder.actor('John Doe (john@example.com)').trigger('manual').build(),
      ).toThrow('Event type is required');
    });

    it('should throw error if actor is missing', () => {
      const builder = new EventBuilder();
      expect(() => builder.event('ready').trigger('manual').build()).toThrow(
        'Actor is required',
      );
    });

    it('should throw error if trigger is missing', () => {
      const builder = new EventBuilder();
      expect(() =>
        builder.event('ready').actor('John Doe (john@example.com)').build(),
      ).toThrow('Trigger is required');
    });

    it('should use provided timestamp', () => {
      const customTimestamp = '2025-01-01T12:00:00Z';
      const event = new EventBuilder()
        .event('ready')
        .actor('John Doe (john@example.com)')
        .trigger('manual')
        .timestamp(customTimestamp)
        .build();

      expect(event.timestamp).toBe(customTimestamp);
    });

    it('should auto-generate timestamp if not provided', () => {
      const event = new EventBuilder()
        .event('ready')
        .actor('John Doe (john@example.com)')
        .trigger('manual')
        .build();

      expect(event.timestamp).toBeDefined();
      expect(new Date(event.timestamp)).toBeInstanceOf(Date);
    });

    it('should merge multiple metadata calls', () => {
      const event = new EventBuilder()
        .event('ready')
        .actor('John Doe (john@example.com)')
        .trigger('manual')
        .metadata({ field1: 'value1' })
        .metadata({ field2: 'value2' })
        .build();

      expect(event.metadata).toEqual({
        field1: 'value1',
        field2: 'value2',
      });
    });

    it('should build with fluent chain', () => {
      const event = new EventBuilder()
        .event(CArtifactEvent.IN_PROGRESS)
        .timestamp('2025-01-01T10:00:00Z')
        .actor('Test User (test@example.com)')
        .trigger(CEventTrigger.BRANCH_CREATED)
        .metadata({ branch_name: 'feature/A.1.1' })
        .build();

      expect(event).toEqual({
        event: CArtifactEvent.IN_PROGRESS,
        timestamp: '2025-01-01T10:00:00Z',
        actor: 'Test User (test@example.com)',
        trigger: CEventTrigger.BRANCH_CREATED,
        metadata: { branch_name: 'feature/A.1.1' },
      });
    });
  });

  describe('createEvent factory function', () => {
    it('should create event with all required fields', () => {
      const event = createEvent({
        event: 'ready',
        actor: 'John Doe (john@example.com)',
        trigger: 'manual',
        timestamp: '2025-01-01T10:00:00Z',
      });

      expect(event.event).toBe('ready');
      expect(event.actor).toBe('John Doe (john@example.com)');
      expect(event.trigger).toBe('manual');
      expect(event.timestamp).toBe('2025-01-01T10:00:00Z');
    });

    it('should create event with fallback trigger when not provided (with warning)', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const event = createEvent({
        event: 'draft',
        actor: 'John Doe (john@example.com)',
      });

      expect(event.event).toBe('draft');
      expect(event.trigger).toBe(CEventTrigger.MANUAL);
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️  Event created without explicit trigger. Event: draft, Actor: John Doe (john@example.com)',
      );

      consoleSpy.mockRestore();
    });

    it('should create event with metadata', () => {
      const event = createEvent({
        event: 'ready',
        actor: 'John Doe (john@example.com)',
        trigger: 'dependencies_met',
        metadata: { custom: 'data' },
      });

      expect(event.metadata).toEqual({ custom: 'data' });
    });

    it('should auto-generate timestamp if not provided', () => {
      const event = createEvent({
        event: 'ready',
        actor: 'John Doe (john@example.com)',
        trigger: 'manual',
      });

      expect(event.timestamp).toBeDefined();
      expect(new Date(event.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('convenience functions', () => {
    describe('createDraftEvent', () => {
      it('should create draft event with correct fields', () => {
        const actor = 'John Doe (john@example.com)';
        const event = createDraftEvent(actor);

        expect(event.event).toBe(CArtifactEvent.DRAFT);
        expect(event.actor).toBe(actor);
        expect(event.trigger).toBe(CEventTrigger.ARTIFACT_CREATED);
        expect(event.timestamp).toBeDefined();
      });

      it('should use custom timestamp when provided', () => {
        const actor = 'John Doe (john@example.com)';
        const timestamp = '2025-01-01T10:00:00Z';
        const event = createDraftEvent(actor, timestamp);

        expect(event.timestamp).toBe(timestamp);
      });
    });

    describe('createReadyEvent', () => {
      it('should create ready event with correct fields', () => {
        const actor = 'John Doe (john@example.com)';
        const event = createReadyEvent(actor);

        expect(event.event).toBe(CArtifactEvent.READY);
        expect(event.actor).toBe(actor);
        expect(event.trigger).toBe(CEventTrigger.DEPENDENCIES_MET);
        expect(event.timestamp).toBeDefined();
      });

      it('should use custom timestamp when provided', () => {
        const actor = 'John Doe (john@example.com)';
        const timestamp = '2025-01-01T10:00:00Z';
        const event = createReadyEvent(actor, timestamp);

        expect(event.timestamp).toBe(timestamp);
      });
    });
  });

  describe('type safety', () => {
    it('should accept event enum values', () => {
      const event = createEvent({
        event: CArtifactEvent.COMPLETED,
        actor: 'John Doe (john@example.com)',
        trigger: CEventTrigger.PR_MERGED,
      });

      expect(event.event).toBe(CArtifactEvent.COMPLETED);
      expect(event.trigger).toBe(CEventTrigger.PR_MERGED);
    });

    it('should accept string event types', () => {
      const event = createEvent({
        event: 'custom_event',
        actor: 'John Doe (john@example.com)',
        trigger: 'custom_trigger',
      });

      expect(event.event).toBe('custom_event');
      expect(event.trigger).toBe('custom_trigger');
    });
  });
});
