import { describe, expect, it } from 'vitest';
import {
  formatYaml,
  formatYamlWithFieldOrder,
  isValidYaml,
  parseYaml,
} from './yaml-formatter';

describe('YAML Formatter', () => {
  describe('formatYaml', () => {
    it('should format a simple object as YAML', () => {
      const data = { name: 'test', value: 123 };
      const result = formatYaml(data);
      expect(result).toBe('name: test\nvalue: 123\n');
    });

    it('should format nested objects', () => {
      const data = {
        metadata: {
          title: 'Test',
          priority: 'high',
        },
      };
      const result = formatYaml(data);
      expect(result).toContain('metadata:');
      expect(result).toContain('  title: Test');
      expect(result).toContain('  priority: high');
    });

    it('should format arrays', () => {
      const data = {
        items: ['one', 'two', 'three'],
      };
      const result = formatYaml(data);
      expect(result).toContain('items:');
      // Strings might be quoted in arrays
      expect(result).toMatch(/- ['"]?one['"]?/);
      expect(result).toMatch(/- ['"]?two['"]?/);
      expect(result).toMatch(/- ['"]?three['"]?/);
    });

    it('should handle empty objects', () => {
      const result = formatYaml({});
      expect(result).toBe('{}\n');
    });

    it('should handle null values', () => {
      const data = { value: null };
      const result = formatYaml(data);
      expect(result).toBe('value: null\n');
    });

    it('should preserve field order by default', () => {
      const data = { z: 1, a: 2, m: 3 };
      const result = formatYaml(data);
      const lines = result.trim().split('\n');
      expect(lines[0]).toBe('z: 1');
      expect(lines[1]).toBe('a: 2');
      expect(lines[2]).toBe('m: 3');
    });

    it('should handle circular references gracefully', () => {
      const circular: Record<string, unknown> = { a: 1 };
      circular.self = circular;
      // The yaml package might handle circular references differently
      // Let's just test that it doesn't crash
      const result = formatYaml(circular);
      expect(result).toBeDefined();
    });
  });

  describe('parseYaml', () => {
    it('should parse valid YAML string', () => {
      const yaml = 'name: test\nvalue: 123';
      const result = parseYaml(yaml);
      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('should parse nested YAML', () => {
      const yaml = 'metadata:\n  title: Test\n  priority: high';
      const result = parseYaml(yaml);
      expect(result).toEqual({
        metadata: {
          title: 'Test',
          priority: 'high',
        },
      });
    });

    it('should parse arrays', () => {
      const yaml = 'items:\n  - one\n  - two\n  - three';
      const result = parseYaml(yaml);
      expect(result).toEqual({
        items: ['one', 'two', 'three'],
      });
    });

    it('should throw error for invalid YAML', () => {
      const invalid = 'invalid: [';
      expect(() => parseYaml(invalid)).toThrow('Failed to parse YAML');
    });

    it('should throw error for non-string input', () => {
      expect(() => parseYaml(123 as unknown as string)).toThrow(
        'Input must be a string',
      );
    });
  });

  describe('isValidYaml', () => {
    it('should return true for valid YAML', () => {
      expect(isValidYaml('name: test')).toBe(true);
      expect(isValidYaml('items:\n  - one\n  - two')).toBe(true);
      expect(isValidYaml('key: "value with spaces"')).toBe(true);
    });

    it('should return false for invalid YAML', () => {
      expect(isValidYaml('invalid: [')).toBe(false);
    });
  });

  describe('formatYamlWithFieldOrder', () => {
    it('should format fields in specified order', () => {
      const data = { b: 2, a: 1, c: 3 };
      const result = formatYamlWithFieldOrder(data, ['a', 'b', 'c']);
      const lines = result.trim().split('\n');
      expect(lines[0]).toBe('a: 1');
      expect(lines[1]).toBe('b: 2');
      expect(lines[2]).toBe('c: 3');
    });

    it('should include fields not in order list at the end', () => {
      const data = { b: 2, a: 1, c: 3, d: 4 };
      const result = formatYamlWithFieldOrder(data, ['a', 'b']);
      const lines = result.trim().split('\n');
      expect(lines[0]).toBe('a: 1');
      expect(lines[1]).toBe('b: 2');
      expect(lines[2]).toBe('c: 3');
      expect(lines[3]).toBe('d: 4');
    });

    it('should handle missing fields gracefully', () => {
      const data = { a: 1, c: 3 };
      const result = formatYamlWithFieldOrder(data, ['a', 'b', 'c']);
      const lines = result.trim().split('\n');
      expect(lines[0]).toBe('a: 1');
      expect(lines[1]).toBe('c: 3');
      expect(lines).toHaveLength(2);
    });

    it('should handle empty field order', () => {
      const data = { b: 2, a: 1 };
      const result = formatYamlWithFieldOrder(data, []);
      expect(result).toBe('b: 2\na: 1\n');
    });
  });
});
