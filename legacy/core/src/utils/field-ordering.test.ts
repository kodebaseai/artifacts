import { describe, expect, it } from 'vitest';
import { CArtifactEvent, CEventTrigger } from '../data/types/constants';
import {
  detectArtifactType,
  EVENT_FIELD_ORDER,
  orderArtifactFields,
  orderFields,
} from './field-ordering';

describe('Field Ordering', () => {
  describe('orderFields', () => {
    it('should order fields according to specified order', () => {
      const obj = { c: 3, a: 1, b: 2 };
      const result = orderFields(obj, ['a', 'b', 'c']);
      const keys = Object.keys(result);
      expect(keys).toEqual(['a', 'b', 'c']);
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should preserve fields not in order list at the end', () => {
      const obj = { c: 3, a: 1, d: 4, b: 2 };
      const result = orderFields(obj, ['a', 'b']);
      const keys = Object.keys(result);
      expect(keys[0]).toBe('a');
      expect(keys[1]).toBe('b');
      expect(keys).toContain('c');
      expect(keys).toContain('d');
    });

    it('should handle missing fields gracefully', () => {
      const obj = { a: 1, c: 3 };
      const result = orderFields(obj, ['a', 'b', 'c']);
      const keys = Object.keys(result);
      expect(keys).toEqual(['a', 'c']);
    });

    it('should handle empty object', () => {
      const result = orderFields({}, ['a', 'b']);
      expect(result).toEqual({});
    });

    it('should handle empty field order', () => {
      const obj = { b: 2, a: 1 };
      const result = orderFields(obj, []);
      expect(result).toEqual(obj);
    });
  });

  describe('orderArtifactFields', () => {
    it('should order top-level artifact fields', () => {
      const artifact = {
        content: { summary: 'test' },
        metadata: { title: 'test' },
      };
      const result = orderArtifactFields(artifact, 'issue');
      const keys = Object.keys(result);
      expect(keys).toEqual(['metadata', 'content']);
    });

    it('should order metadata fields for issue', () => {
      const artifact = {
        metadata: {
          events: [],
          title: 'Test Issue',
          assignee: 'John Doe',
          priority: 'high',
          schema_version: '0.1.0',
          created_by: 'Jane Doe',
          estimation: 'M',
          relationships: {
            blocked_by: [],
            blocks: [],
          },
        },
        content: {},
      };
      const result = orderArtifactFields(artifact, 'issue');
      const metadataKeys = Object.keys(
        result.metadata as Record<string, unknown>,
      );
      expect(metadataKeys[0]).toBe('title');
      expect(metadataKeys[1]).toBe('priority');
      expect(metadataKeys[2]).toBe('estimation');
      expect(metadataKeys[3]).toBe('created_by');
      expect(metadataKeys[4]).toBe('assignee');
    });

    it('should order event fields', () => {
      const artifact = {
        metadata: {
          events: [
            {
              metadata: {},
              actor: 'John Doe',
              timestamp: '2025-01-01T00:00:00Z',
              event: CArtifactEvent.DRAFT,
              trigger: CEventTrigger.ARTIFACT_CREATED,
            },
          ],
        },
        content: {},
      };
      const result = orderArtifactFields(artifact, 'issue');
      const events = (result.metadata as Record<string, unknown>)
        .events as Record<string, unknown>[];
      const event = events[0];
      const eventKeys = Object.keys(event as Record<string, unknown>);
      expect(eventKeys).toEqual(EVENT_FIELD_ORDER);
    });

    it('should order relationship fields', () => {
      const artifact = {
        metadata: {
          relationships: {
            blocked_by: ['A.1'],
            blocks: ['A.3'],
          },
        },
        content: {},
      };
      const result = orderArtifactFields(artifact, 'issue');
      const relationships = (result.metadata as Record<string, unknown>)
        .relationships as Record<string, unknown>;
      const relKeys = Object.keys(relationships);
      expect(relKeys).toEqual(['blocks', 'blocked_by']);
    });

    it('should order issue content fields', () => {
      const artifact = {
        metadata: {},
        content: {
          notes: 'test notes',
          acceptance_criteria: ['criterion 1'],
          summary: 'test summary',
          development_process: {},
          completion_analysis: {},
        },
      };
      const result = orderArtifactFields(artifact, 'issue');
      const contentKeys = Object.keys(
        result.content as Record<string, unknown>,
      );
      expect(contentKeys[0]).toBe('summary');
      expect(contentKeys[1]).toBe('acceptance_criteria');
    });

    it('should order milestone content fields', () => {
      const artifact = {
        metadata: {},
        content: {
          notes: 'test notes',
          deliverables: ['deliverable 1'],
          summary: 'test summary',
          validation: ['validation 1'],
        },
      };
      const result = orderArtifactFields(artifact, 'milestone');
      const contentKeys = Object.keys(
        result.content as Record<string, unknown>,
      );
      expect(contentKeys[0]).toBe('summary');
      expect(contentKeys[1]).toBe('deliverables');
      expect(contentKeys[2]).toBe('validation');
      expect(contentKeys[3]).toBe('notes');
    });

    it('should order initiative content fields', () => {
      const artifact = {
        metadata: {},
        content: {
          notes: 'test notes',
          success_criteria: ['criterion 1'],
          vision: 'test vision',
          scope: 'test scope',
        },
      };
      const result = orderArtifactFields(artifact, 'initiative');
      const contentKeys = Object.keys(
        result.content as Record<string, unknown>,
      );
      expect(contentKeys[0]).toBe('vision');
      expect(contentKeys[1]).toBe('scope');
      expect(contentKeys[2]).toBe('success_criteria');
      expect(contentKeys[3]).toBe('notes');
    });
  });

  describe('detectArtifactType', () => {
    it('should detect issue type', () => {
      expect(detectArtifactType('A.1.5')).toBe('issue');
      expect(detectArtifactType('B.2.3')).toBe('issue');
    });

    it('should detect milestone type', () => {
      expect(detectArtifactType('A.1')).toBe('milestone');
      expect(detectArtifactType('B.2')).toBe('milestone');
    });

    it('should detect initiative type', () => {
      expect(detectArtifactType('A')).toBe('initiative');
      expect(detectArtifactType('B')).toBe('initiative');
    });
  });
});
