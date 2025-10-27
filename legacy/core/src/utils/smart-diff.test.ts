import { describe, expect, it } from 'vitest';
import {
  describeChange,
  formatArtifactForDiff,
  formatForDiff,
  summarizeArtifactChanges,
} from './smart-diff';

describe('Smart Diff', () => {
  describe('formatForDiff', () => {
    it('should format primitives correctly', () => {
      expect(formatForDiff('test')).toBe("'test'");
      expect(formatForDiff(123)).toBe('123');
      expect(formatForDiff(true)).toBe('true');
      expect(formatForDiff(null)).toBe('null');
      expect(formatForDiff(undefined)).toBe('undefined');
    });

    it('should escape single quotes in strings', () => {
      expect(formatForDiff("test's")).toBe("'test\\'s'");
    });

    it('should format empty arrays and objects', () => {
      expect(formatForDiff([])).toBe('[]');
      expect(formatForDiff({})).toBe('{}');
    });

    it('should format arrays with items on separate lines by default', () => {
      const arr = ['one', 'two', 'three'];
      const result = formatForDiff(arr);
      expect(result).toBe("[\n  'one',\n  'two',\n  'three',\n]");
    });

    it('should format arrays inline when specified', () => {
      const arr = ['one', 'two', 'three'];
      const result = formatForDiff(arr, { arrayItemsPerLine: false });
      expect(result).toBe("['one', 'two', 'three']");
    });

    it('should format objects with proper indentation', () => {
      const obj = { a: 1, b: 'test' };
      const result = formatForDiff(obj);
      expect(result).toBe("{\n  a: 1,\n  b: 'test',\n}");
    });

    it('should sort object keys when specified', () => {
      const obj = { z: 1, a: 2, m: 3 };
      const result = formatForDiff(obj, { sortKeys: true });
      expect(result).toBe('{\n  a: 2,\n  m: 3,\n  z: 1,\n}');
    });

    it('should handle nested structures', () => {
      const nested = {
        metadata: {
          title: 'Test',
          events: ['draft', 'ready'],
        },
      };
      const result = formatForDiff(nested);
      expect(result).toContain('metadata: {');
      expect(result).toContain("  title: 'Test'");
      expect(result).toContain('  events: [');
      expect(result).toContain("    'draft'");
    });

    it('should respect trailing comma option', () => {
      const arr = [1, 2];
      const withComma = formatForDiff(arr, { trailingCommas: true });
      const withoutComma = formatForDiff(arr, { trailingCommas: false });
      expect(withComma).toContain(',\n]');
      expect(withoutComma).toContain('\n]');
      expect(withoutComma).not.toContain(',\n]');
    });
  });

  describe('formatArtifactForDiff', () => {
    it('should format artifact with standard options', () => {
      const artifact = {
        metadata: {
          title: 'Test Issue',
          events: [{ event: 'draft', timestamp: '2025-01-01' }],
        },
        content: {
          summary: 'Test summary',
        },
      };
      const result = formatArtifactForDiff(artifact);
      expect(result).toContain('metadata: {');
      expect(result).toContain('events: [');
      expect(result).toContain('  {');
      expect(result).toContain("    event: 'draft'");
      expect(result).toContain(',\n}'); // Should have trailing commas
    });
  });

  describe('describeChange', () => {
    it('should describe additions', () => {
      const result = describeChange(undefined, 'new value', 'field');
      expect(result).toBe("field added with value 'new value'");
    });

    it('should describe deletions', () => {
      const result = describeChange('old value', undefined, 'field');
      expect(result).toBe("field removed (was 'old value')");
    });

    it('should describe changes', () => {
      const result = describeChange('old', 'new', 'field');
      expect(result).toBe("field changed from 'old' to 'new'");
    });

    it('should handle no change', () => {
      const result = describeChange('same', 'same', 'field');
      expect(result).toBe('field unchanged');
    });

    it('should handle complex values in descriptions', () => {
      const result = describeChange([1, 2], [3, 4], 'array');
      expect(result).toBe('array changed from [1, 2] to [3, 4]');
    });
  });

  describe('summarizeArtifactChanges', () => {
    it('should detect metadata field changes', () => {
      const oldArtifact = {
        metadata: {
          title: 'Old Title',
          priority: 'low',
          estimation: 'S',
        },
      };
      const newArtifact = {
        metadata: {
          title: 'New Title',
          priority: 'high',
          estimation: 'S',
        },
      };
      const changes = summarizeArtifactChanges(oldArtifact, newArtifact);
      expect(changes).toContain(
        "metadata.title changed from 'Old Title' to 'New Title'",
      );
      expect(changes).toContain(
        "metadata.priority changed from 'low' to 'high'",
      );
      expect(changes).not.toContain('metadata.estimation');
    });

    it('should detect event additions', () => {
      const oldArtifact = {
        metadata: {
          events: [{ event: 'draft' }],
        },
      };
      const newArtifact = {
        metadata: {
          events: [{ event: 'draft' }, { event: 'ready' }],
        },
      };
      const changes = summarizeArtifactChanges(oldArtifact, newArtifact);
      expect(changes).toContain('1 new event(s) added');
    });

    it('should detect event removals', () => {
      const oldArtifact = {
        metadata: {
          events: [{ event: 'draft' }, { event: 'ready' }],
        },
      };
      const newArtifact = {
        metadata: {
          events: [{ event: 'draft' }],
        },
      };
      const changes = summarizeArtifactChanges(oldArtifact, newArtifact);
      expect(changes).toContain('1 event(s) removed');
    });

    it('should detect content changes', () => {
      const oldArtifact = {
        content: {
          summary: 'Old summary',
          notes: 'Some notes',
        },
      };
      const newArtifact = {
        content: {
          summary: 'New summary',
          notes: 'Some notes',
          description: 'New field',
        },
      };
      const changes = summarizeArtifactChanges(oldArtifact, newArtifact);
      expect(changes).toContain(
        "content.summary changed from 'Old summary' to 'New summary'",
      );
      expect(changes).toContain(
        "content.description added with value 'New field'",
      );
      expect(changes).not.toContain('content.notes');
    });

    it('should handle missing sections gracefully', () => {
      const oldArtifact = { metadata: { title: 'Test' } };
      const newArtifact = { content: { summary: 'New' } };
      const changes = summarizeArtifactChanges(oldArtifact, newArtifact);
      expect(changes.length).toBeGreaterThan(0);
    });
  });
});
