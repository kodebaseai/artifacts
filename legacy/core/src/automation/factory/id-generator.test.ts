/**
 * Tests for ID Generator Utilities
 */

import { describe, expect, it } from 'vitest';
import {
  createFactoryContext,
  generateInitiativeId,
  generateIssueId,
  generateMilestoneId,
  validateIdUnique,
  validateParentExists,
} from './id-generator';

describe('ID Generator Utilities', () => {
  describe('generateInitiativeId', () => {
    it('should generate A for first initiative', () => {
      const context = createFactoryContext(new Map());
      const id = generateInitiativeId(context);
      expect(id).toBe('A');
    });

    it('should generate sequential IDs', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}],
          ['B', {}],
        ]),
      );
      const id = generateInitiativeId(context);
      expect(id).toBe('C');
    });

    it('should fill gaps in the sequence', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}],
          ['C', {}], // B is missing
          ['D', {}],
        ]),
      );
      const id = generateInitiativeId(context);
      expect(id).toBe('B'); // Should fill the gap
    });

    it('should handle non-sequential existing IDs', () => {
      const context = createFactoryContext(
        new Map([
          ['Z', {}], // Last letter
          ['A', {}],
          ['M', {}], // Middle letter
        ]),
      );
      const id = generateInitiativeId(context);
      expect(id).toBe('B'); // Should return first available
    });

    it('should throw error when all letters are used', () => {
      const allLetters = new Map();
      for (let i = 0; i < 26; i++) {
        const letter = String.fromCharCode(65 + i); // A-Z
        allLetters.set(letter, {});
      }

      const context = createFactoryContext(allLetters);
      expect(() => generateInitiativeId(context)).toThrow(
        'All initiative IDs (A-Z) are already in use',
      );
    });

    it('should ignore non-initiative IDs in context', () => {
      const context = createFactoryContext(
        new Map([
          ['A.1', {}], // Milestone
          ['A.1.1', {}], // Issue
          ['invalid-id', {}], // Invalid format
          ['123', {}], // Number
        ]),
      );
      const id = generateInitiativeId(context);
      expect(id).toBe('A'); // Should still return A since no initiatives exist
    });
  });

  describe('generateMilestoneId', () => {
    it('should generate first milestone ID', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}], // Parent initiative exists
        ]),
      );
      const id = generateMilestoneId('A', context);
      expect(id).toBe('A.1');
    });

    it('should generate sequential milestone IDs', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}],
          ['A.1', {}],
          ['A.2', {}],
        ]),
      );
      const id = generateMilestoneId('A', context);
      expect(id).toBe('A.3');
    });

    it('should fill gaps in milestone sequence', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}],
          ['A.1', {}],
          ['A.3', {}], // A.2 is missing
          ['A.4', {}],
        ]),
      );
      const id = generateMilestoneId('A', context);
      expect(id).toBe('A.2'); // Should fill the gap
    });

    it('should handle different initiatives separately', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}],
          ['A.1', {}],
          ['A.2', {}],
          ['B', {}],
          ['B.1', {}],
        ]),
      );

      const idA = generateMilestoneId('A', context);
      const idB = generateMilestoneId('B', context);

      expect(idA).toBe('A.3');
      expect(idB).toBe('B.2');
    });

    it('should throw error for invalid parent ID format', () => {
      const context = createFactoryContext(new Map());

      expect(() => generateMilestoneId('AA', context)).toThrow(
        'Invalid initiative ID format',
      );
      expect(() => generateMilestoneId('1', context)).toThrow(
        'Invalid initiative ID format',
      );
      expect(() => generateMilestoneId('a', context)).toThrow(
        'Invalid initiative ID format',
      );
      expect(() => generateMilestoneId('A.1', context)).toThrow(
        'Invalid initiative ID format',
      );
    });

    it('should ignore non-milestone IDs for the same initiative', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}],
          ['A.1.1', {}], // Issue under A.1
          ['A.1.2', {}], // Issue under A.1
          ['B.1', {}], // Milestone under different initiative
        ]),
      );

      const id = generateMilestoneId('A', context);
      expect(id).toBe('A.1'); // Should start at 1 since no milestones under A
    });
  });

  describe('generateIssueId', () => {
    it('should generate first issue ID', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}],
          ['A.1', {}], // Parent milestone exists
        ]),
      );
      const id = generateIssueId('A.1', context);
      expect(id).toBe('A.1.1');
    });

    it('should generate sequential issue IDs', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}],
          ['A.1', {}],
          ['A.1.1', {}],
          ['A.1.2', {}],
        ]),
      );
      const id = generateIssueId('A.1', context);
      expect(id).toBe('A.1.3');
    });

    it('should fill gaps in issue sequence', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}],
          ['A.1', {}],
          ['A.1.1', {}],
          ['A.1.3', {}], // A.1.2 is missing
          ['A.1.5', {}],
        ]),
      );
      const id = generateIssueId('A.1', context);
      expect(id).toBe('A.1.2'); // Should fill the gap
    });

    it('should handle different milestones separately', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}],
          ['A.1', {}],
          ['A.1.1', {}],
          ['A.1.2', {}],
          ['A.2', {}],
          ['A.2.1', {}],
        ]),
      );

      const idA1 = generateIssueId('A.1', context);
      const idA2 = generateIssueId('A.2', context);

      expect(idA1).toBe('A.1.3');
      expect(idA2).toBe('A.2.2');
    });

    it('should handle complex milestone IDs', () => {
      const context = createFactoryContext(
        new Map([
          ['B', {}],
          ['B.15', {}], // High milestone number
          ['B.15.1', {}],
          ['B.15.2', {}],
        ]),
      );

      const id = generateIssueId('B.15', context);
      expect(id).toBe('B.15.3');
    });

    it('should throw error for invalid parent ID format', () => {
      const context = createFactoryContext(new Map());

      expect(() => generateIssueId('A', context)).toThrow(
        'Invalid milestone ID format',
      );
      expect(() => generateIssueId('A.1.1', context)).toThrow(
        'Invalid milestone ID format',
      );
      expect(() => generateIssueId('AA.1', context)).toThrow(
        'Invalid milestone ID format',
      );
      expect(() => generateIssueId('a.1', context)).toThrow(
        'Invalid milestone ID format',
      );
    });

    it('should ignore non-issue IDs for the same milestone', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}],
          ['A.1', {}],
          ['A.2', {}], // Different milestone
          ['A.2.1', {}], // Issue under different milestone
          ['B.1.1', {}], // Issue under different initiative
        ]),
      );

      const id = generateIssueId('A.1', context);
      expect(id).toBe('A.1.1'); // Should start at 1 since no issues under A.1
    });
  });

  describe('validateParentExists', () => {
    it('should pass when parent exists', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}],
          ['A.1', {}],
        ]),
      );

      expect(() =>
        validateParentExists('A', context, 'initiative'),
      ).not.toThrow();
      expect(() =>
        validateParentExists('A.1', context, 'milestone'),
      ).not.toThrow();
    });

    it('should throw error when parent does not exist', () => {
      const context = createFactoryContext(new Map([['A', {}]]));

      expect(() => validateParentExists('B', context, 'initiative')).toThrow(
        "Parent initiative 'B' not found. Parent must exist before creating children.",
      );

      expect(() => validateParentExists('A.1', context, 'milestone')).toThrow(
        "Parent milestone 'A.1' not found. Parent must exist before creating children.",
      );
    });
  });

  describe('validateIdUnique', () => {
    it('should pass when ID is unique', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}],
          ['A.1', {}],
        ]),
      );

      expect(() => validateIdUnique('B', context)).not.toThrow();
      expect(() => validateIdUnique('A.2', context)).not.toThrow();
      expect(() => validateIdUnique('A.1.1', context)).not.toThrow();
    });

    it('should throw error when ID already exists', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}],
          ['A.1', {}],
          ['A.1.1', {}],
        ]),
      );

      expect(() => validateIdUnique('A', context)).toThrow(
        "Artifact ID 'A' already exists. IDs must be unique.",
      );

      expect(() => validateIdUnique('A.1', context)).toThrow(
        "Artifact ID 'A.1' already exists. IDs must be unique.",
      );

      expect(() => validateIdUnique('A.1.1', context)).toThrow(
        "Artifact ID 'A.1.1' already exists. IDs must be unique.",
      );
    });
  });

  describe('createFactoryContext', () => {
    it('should create empty context for no artifacts', () => {
      const context = createFactoryContext(new Map());

      expect(context.existingIds.size).toBe(0);
      expect(context.initiativeMilestoneCount.size).toBe(0);
      expect(context.milestoneIssueCount.size).toBe(0);
    });

    it('should track existing IDs correctly', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}],
          ['A.1', {}],
          ['A.1.1', {}],
          ['B', {}],
        ]),
      );

      expect(context.existingIds.has('A')).toBe(true);
      expect(context.existingIds.has('A.1')).toBe(true);
      expect(context.existingIds.has('A.1.1')).toBe(true);
      expect(context.existingIds.has('B')).toBe(true);
      expect(context.existingIds.has('C')).toBe(false);
    });

    it('should count milestones per initiative correctly', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}],
          ['A.1', {}],
          ['A.3', {}], // Gap at A.2
          ['B', {}],
          ['B.1', {}],
          ['B.2', {}],
        ]),
      );

      expect(context.initiativeMilestoneCount.get('A')).toBe(3); // Highest is A.3
      expect(context.initiativeMilestoneCount.get('B')).toBe(2); // Highest is B.2
      expect(context.initiativeMilestoneCount.get('C')).toBeUndefined();
    });

    it('should count issues per milestone correctly', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}],
          ['A.1', {}],
          ['A.1.1', {}],
          ['A.1.3', {}], // Gap at A.1.2
          ['A.2', {}],
          ['A.2.1', {}],
          ['B.1', {}],
          ['B.1.1', {}],
          ['B.1.2', {}],
        ]),
      );

      expect(context.milestoneIssueCount.get('A.1')).toBe(3); // Highest is A.1.3
      expect(context.milestoneIssueCount.get('A.2')).toBe(1); // Highest is A.2.1
      expect(context.milestoneIssueCount.get('B.1')).toBe(2); // Highest is B.1.2
      expect(context.milestoneIssueCount.get('C.1')).toBeUndefined();
    });

    it('should handle mixed artifact types correctly', () => {
      const context = createFactoryContext(
        new Map([
          ['A', {}], // Initiative
          ['A.1', {}], // Milestone
          ['A.1.1', {}], // Issue
          ['invalid-id', {}], // Invalid format - should be ignored
          ['B.invalid', {}], // Invalid milestone format
        ]),
      );

      expect(context.existingIds.size).toBe(5); // All IDs tracked regardless of validity
      expect(context.initiativeMilestoneCount.get('A')).toBe(1);
      expect(context.milestoneIssueCount.get('A.1')).toBe(1);
      expect(context.initiativeMilestoneCount.get('B')).toBeUndefined(); // B.invalid doesn't match pattern
    });

    it('should handle edge cases in ID parsing', () => {
      const context = createFactoryContext(
        new Map([
          ['A.0', {}], // Zero milestone (edge case)
          ['A.1.0', {}], // Zero issue (edge case)
          ['A.999', {}], // High milestone number
          ['Z.1.999', {}], // High issue number
        ]),
      );

      // Zero values should be ignored in counting (not valid)
      expect(context.initiativeMilestoneCount.get('A')).toBe(999);
      expect(context.milestoneIssueCount.get('A.1')).toBeUndefined(); // A.1.0 should not count
      expect(context.milestoneIssueCount.get('Z.1')).toBe(999);
    });
  });
});
