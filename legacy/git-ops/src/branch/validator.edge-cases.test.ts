/**
 * Edge case tests for BranchValidator improvements
 *
 * Tests specifically for C.2.4 - Branch-to-artifact mapping improvements
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BranchValidator } from './validator';

describe('BranchValidator - Edge Cases (C.2.4)', () => {
  let validator: BranchValidator;

  beforeEach(() => {
    validator = new BranchValidator();
  });

  describe('Complex artifact ID formats', () => {
    it('should handle multi-character initiative prefixes', () => {
      const testCases = ['AB.1.5', 'XY.23.11', 'DEF.1.2', 'ABCD.99.999'];

      testCases.forEach((id) => {
        const result = validator.validate(id);
        expect(result.valid).toBe(true);
        expect(result.artifactId).toBe(id);
        expect(result.artifactType).toBe('issue');
      });
    });

    it('should handle large numeric components', () => {
      const testCases = ['A.999.1', 'B.1.999', 'AB.999.999', 'C.123456.789'];

      testCases.forEach((id) => {
        const result = validator.validate(id);
        expect(result.valid).toBe(true);
        expect(result.artifactId).toBe(id);
      });
    });

    it('should handle nested artifacts beyond 3 levels', () => {
      const testCases = [
        'A.1.2.3',
        'A.1.2.3.4',
        'AB.11.22.33.44',
        'X.1.1.1.1.1',
      ];

      testCases.forEach((id) => {
        const result = validator.validate(id);
        expect(result.valid).toBe(true);
        expect(result.artifactId).toBe(id);
        expect(result.artifactType).toBe('nested_artifact');
      });
    });
  });

  describe('Invalid patterns with specific errors', () => {
    it('should reject mixed case in initiative prefix', () => {
      const testCases = ['aB.1.5', 'Ab.1.5', 'aBc.1.5'];

      testCases.forEach((id) => {
        const result = validator.validate(id);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('uppercase letters');
      });
    });

    it('should accept all uppercase prefixes', () => {
      // Note: ABC.1.5 is actually valid since all letters are uppercase
      const validCases = ['ABC.1.5', 'XYZ.2.3'];

      validCases.forEach((id) => {
        const result = validator.validate(id);
        expect(result.valid).toBe(true);
        expect(result.artifactId).toBe(id);
      });
    });

    it('should reject non-numeric parts after prefix', () => {
      const testCases = ['A.a.5', 'A.1.b', 'AB.1a.5', 'A.1.5a'];

      testCases.forEach((id) => {
        const result = validator.validate(id);
        expect(result.valid).toBe(false);
        // The validator may give different specific error messages
        expect(result.error).toBeDefined();
      });
    });

    it('should reject leading/trailing special characters', () => {
      const testCases = [
        '.A.1.5',
        'A.1.5.',
        '-A.1.5',
        'A.1.5-',
        '_A.1.5',
        'A.1.5_',
      ];

      testCases.forEach((id) => {
        const result = validator.validate(id);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject consecutive dots', () => {
      const testCases = ['A..1.5', 'A.1..5', 'A...5', 'AB..11.22'];

      testCases.forEach((id) => {
        const result = validator.validate(id);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('consecutive dots');
      });
    });
  });

  describe('Special characters and edge cases', () => {
    it('should reject common typos and variations', () => {
      const testCases = [
        'A 1 5', // spaces
        'A,1,5', // commas
        'A/1/5', // slashes
        'A\\1\\5', // backslashes
        'A:1:5', // colons
        'A;1;5', // semicolons
        'A|1|5', // pipes
      ];

      testCases.forEach((id) => {
        const result = validator.validate(id);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject unicode and special characters', () => {
      const testCases = [
        'Ä.1.5', // unicode
        'A①.1.5', // unicode numbers
        'A.①.5', // unicode numbers in middle
        'A.1.⑤', // unicode numbers at end
      ];

      testCases.forEach((id) => {
        const result = validator.validate(id);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject empty parts', () => {
      const testCases = [
        '', // completely empty
        '.', // just dot
        '..', // just dots
        'A.', // empty after prefix
        '.1.5', // empty before first number
      ];

      testCases.forEach((id) => {
        const result = validator.validate(id);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('extractArtifactInfo with nested structures', () => {
    it('should extract info for deeply nested artifacts', () => {
      const testCases = [
        {
          id: 'A.1.2.3',
          expectedType: 'nested_artifact',
          expectedParts: ['A', '1', '2', '3'],
        },
        {
          id: 'AB.11.22.33.44',
          expectedType: 'nested_artifact',
          expectedParts: ['AB', '11', '22', '33', '44'],
        },
        {
          id: 'X.1.1.1.1.1',
          expectedType: 'nested_artifact',
          expectedParts: ['X', '1', '1', '1', '1', '1'],
        },
      ];

      testCases.forEach(({ id, expectedType, expectedParts }) => {
        const result = validator.extractArtifactInfo(id);
        expect(result).not.toBeNull();
        expect(result?.type).toBe(expectedType);
        expect(result?.parts).toEqual(expectedParts);
      });
    });

    it('should return null for invalid nested structures', () => {
      const testCases = [
        'A.1.2.3.', // trailing dot
        'A..1.2.3', // consecutive dots
        'A.1.a.3', // non-numeric part
        '', // empty string
      ];

      testCases.forEach((id) => {
        const result = validator.extractArtifactInfo(id);
        expect(result).toBeNull();
      });
    });
  });

  describe('Performance and stress tests', () => {
    it('should handle validation of many artifact IDs efficiently', () => {
      const testIds = [];

      // Generate test data
      for (let i = 1; i <= 1000; i++) {
        testIds.push(`A.${i}.${i % 10}`);
        testIds.push(`AB.${i}.${i % 100}`);
      }

      const startTime = performance.now();

      testIds.forEach((id) => {
        validator.validate(id);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 100ms for 2000 validations
      expect(duration).toBeLessThan(100);
    });

    it('should handle very long artifact IDs without crashing', () => {
      // Generate extremely long but valid artifact ID
      const parts = ['A'];
      for (let i = 1; i <= 50; i++) {
        parts.push(i.toString());
      }
      const longId = parts.join('.');

      const result = validator.validate(longId);
      expect(result.valid).toBe(true);
      expect(result.artifactType).toBe('nested_artifact');
    });

    it('should handle very long invalid strings gracefully', () => {
      const longInvalidId = 'a'.repeat(10000); // Very long lowercase string

      const result = validator.validate(longInvalidId);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Branch name normalization', () => {
    it('should provide suggestions for common mistakes', () => {
      const testCases = [
        { input: 'a.1.5', suggestion: 'A.1.5' },
        { input: 'A-1-5', suggestion: 'A.1.5' },
        { input: 'A_1_5', suggestion: 'A.1.5' },
      ];

      testCases.forEach(({ input, suggestion }) => {
        const result = validator.validate(input);
        expect(result.valid).toBe(false);
        expect(result.suggestion).toBe(suggestion);
      });
    });
  });
});
