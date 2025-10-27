import { describe, expect, it } from 'vitest';
import {
  DependencyValidationError,
  findOrphanedArtifacts,
  hasCircularDependency,
  validateDependencies,
} from './dependencies';

describe('Dependency Validation', () => {
  describe('validateDependencies', () => {
    it('should validate simple valid dependencies', () => {
      const artifacts = new Map([
        ['A.1.1', { blocks: ['A.1.2'], blocked_by: [] }],
        ['A.1.2', { blocks: [], blocked_by: ['A.1.1', 'A.1.3'] }],
        ['A.1.3', { blocks: ['A.1.2'], blocked_by: [] }],
      ]);

      expect(() => validateDependencies(artifacts)).not.toThrow();
    });

    it('should detect missing dependencies', () => {
      const artifacts = new Map([
        ['A.1.1', { blocks: [], blocked_by: ['A.1.0'] }], // A.1.0 doesn't exist
        ['A.1.2', { blocks: [], blocked_by: [] }],
      ]);

      expect(() => validateDependencies(artifacts)).toThrow(
        DependencyValidationError,
      );
      expect(() => validateDependencies(artifacts)).toThrow(
        'depends on non-existent artifact',
      );
    });

    it('should detect circular dependencies', () => {
      const artifacts = new Map([
        ['A.1.1', { blocks: ['A.1.2'], blocked_by: ['A.1.2'] }],
        ['A.1.2', { blocks: ['A.1.1'], blocked_by: ['A.1.1'] }],
      ]);

      expect(() => validateDependencies(artifacts)).toThrow(
        DependencyValidationError,
      );
      expect(() => validateDependencies(artifacts)).toThrow(
        'Circular dependency detected',
      );
    });

    it('should validate bidirectional consistency', () => {
      // A.1.1 blocks A.1.2, but A.1.2 doesn't know it's blocked by A.1.1
      const artifacts = new Map([
        ['A.1.1', { blocks: ['A.1.2'], blocked_by: [] }],
        ['A.1.2', { blocks: [], blocked_by: [] }], // Should have blocked_by: ['A.1.1']
      ]);

      expect(() => validateDependencies(artifacts)).toThrow(
        DependencyValidationError,
      );
      expect(() => validateDependencies(artifacts)).toThrow(
        'Inconsistent dependency',
      );
    });
  });

  describe('hasCircularDependency', () => {
    it('should detect direct circular dependencies', () => {
      const artifacts = new Map([
        ['A', { blocks: [], blocked_by: ['B'] }],
        ['B', { blocks: [], blocked_by: ['A'] }],
      ]);

      expect(hasCircularDependency('A', artifacts)).toBe(true);
      expect(hasCircularDependency('B', artifacts)).toBe(true);
    });

    it('should detect indirect circular dependencies', () => {
      const artifacts = new Map([
        ['A', { blocks: [], blocked_by: ['B'] }],
        ['B', { blocks: [], blocked_by: ['C'] }],
        ['C', { blocks: [], blocked_by: ['A'] }],
      ]);

      expect(hasCircularDependency('A', artifacts)).toBe(true);
      expect(hasCircularDependency('B', artifacts)).toBe(true);
      expect(hasCircularDependency('C', artifacts)).toBe(true);
    });

    it('should return false for valid dependencies', () => {
      const artifacts = new Map([
        ['A', { blocks: [], blocked_by: [] }],
        ['B', { blocks: [], blocked_by: ['A'] }],
        ['C', { blocks: [], blocked_by: ['B'] }],
      ]);

      expect(hasCircularDependency('A', artifacts)).toBe(false);
      expect(hasCircularDependency('B', artifacts)).toBe(false);
      expect(hasCircularDependency('C', artifacts)).toBe(false);
    });
  });

  describe('findOrphanedArtifacts', () => {
    it('should find artifacts blocked by cancelled dependencies', () => {
      const artifacts = new Map([
        ['A.1.1', { blocks: [], blocked_by: [] }],
        ['A.1.2', { blocks: [], blocked_by: ['A.1.1'] }],
        ['A.1.3', { blocks: [], blocked_by: ['A.1.2'] }],
      ]);

      const statuses = new Map([
        ['A.1.1', 'cancelled'],
        ['A.1.2', 'blocked'],
        ['A.1.3', 'blocked'],
      ]);

      const orphaned = findOrphanedArtifacts(artifacts, statuses);
      expect(orphaned).toEqual(['A.1.2']); // A.1.2 is orphaned because A.1.1 is cancelled
    });

    it('should not consider artifacts with completed dependencies as orphaned', () => {
      const artifacts = new Map([
        ['A.1.1', { blocks: [], blocked_by: [] }],
        ['A.1.2', { blocks: [], blocked_by: ['A.1.1'] }],
      ]);

      const statuses = new Map([
        ['A.1.1', 'completed'],
        ['A.1.2', 'blocked'],
      ]);

      const orphaned = findOrphanedArtifacts(artifacts, statuses);
      expect(orphaned).toEqual([]);
    });

    it('should handle multiple cancelled dependencies', () => {
      const artifacts = new Map([
        ['A.1.1', { blocks: [], blocked_by: [] }],
        ['A.1.2', { blocks: [], blocked_by: [] }],
        ['A.1.3', { blocks: [], blocked_by: ['A.1.1', 'A.1.2'] }],
      ]);

      const statuses = new Map([
        ['A.1.1', 'cancelled'],
        ['A.1.2', 'cancelled'],
        ['A.1.3', 'blocked'],
      ]);

      const orphaned = findOrphanedArtifacts(artifacts, statuses);
      expect(orphaned).toEqual(['A.1.3']);
    });
  });
});
