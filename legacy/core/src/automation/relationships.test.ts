import { describe, expect, it } from 'vitest';
import type { Artifact } from '../data/types';
import {
  addBlockedBy,
  addBlocks,
  removeBlockedBy,
  removeBlocks,
} from './relationships';

describe('Bidirectional Relationship Management', () => {
  // Mock artifacts for testing
  const createMockArtifact = (id: string): Artifact =>
    ({
      metadata: {
        title: `Test Artifact ${id}`,
        priority: 'medium',
        estimation: 'S',
        created_by: 'Test User (test@example.com)',
        assignee: 'Test User (test@example.com)',
        schema_version: '0.2.0',
        relationships: {
          blocks: [],
          blocked_by: [],
        },
        events: [],
      },
      content: {
        summary: 'Test artifact',
        acceptance_criteria: [],
      },
    }) as Artifact;

  describe('addBlocks', () => {
    it('should update both artifacts atomically when A blocks B', () => {
      const artifactA = createMockArtifact('A.1');
      const artifactB = createMockArtifact('A.2');
      const artifacts = new Map([
        ['A.1', artifactA],
        ['A.2', artifactB],
      ]);

      const result = addBlocks('A.1', 'A.2', artifacts);

      expect(result.success).toBe(true);
      expect(
        result.updatedArtifacts.get('A.1')?.metadata.relationships.blocks,
      ).toContain('A.2');
      expect(
        result.updatedArtifacts.get('A.2')?.metadata.relationships.blocked_by,
      ).toContain('A.1');
    });

    it('should prevent adding relationship when source artifact does not exist', () => {
      const artifactB = createMockArtifact('A.2');
      const artifacts = new Map([['A.2', artifactB]]);

      const result = addBlocks('A.1', 'A.2', artifacts);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Artifact A.1 does not exist');
    });

    it('should prevent adding relationship when target artifact does not exist', () => {
      const artifactA = createMockArtifact('A.1');
      const artifacts = new Map([['A.1', artifactA]]);

      const result = addBlocks('A.1', 'A.2', artifacts);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Artifact A.2 does not exist');
    });

    it('should prevent circular dependencies', () => {
      const artifactA = createMockArtifact('A.1');
      const artifactB = createMockArtifact('A.2');
      artifactB.metadata.relationships.blocks = ['A.1'];
      artifactA.metadata.relationships.blocked_by = ['A.2'];

      const artifacts = new Map([
        ['A.1', artifactA],
        ['A.2', artifactB],
      ]);

      const result = addBlocks('A.1', 'A.2', artifacts);

      expect(result.success).toBe(false);
      expect(result.error).toContain('circular dependency');
    });

    it('should handle duplicate relationships gracefully', () => {
      const artifactA = createMockArtifact('A.1');
      const artifactB = createMockArtifact('A.2');
      artifactA.metadata.relationships.blocks = ['A.2'];
      artifactB.metadata.relationships.blocked_by = ['A.1'];

      const artifacts = new Map([
        ['A.1', artifactA],
        ['A.2', artifactB],
      ]);

      const result = addBlocks('A.1', 'A.2', artifacts);

      expect(result.success).toBe(true);
      expect(
        result.updatedArtifacts.get('A.1')?.metadata.relationships.blocks,
      ).toEqual(['A.2']);
      expect(
        result.updatedArtifacts.get('A.2')?.metadata.relationships.blocked_by,
      ).toEqual(['A.1']);
    });
  });

  describe('removeBlocks', () => {
    it('should remove relationship from both artifacts', () => {
      const artifactA = createMockArtifact('A.1');
      const artifactB = createMockArtifact('A.2');
      artifactA.metadata.relationships.blocks = ['A.2'];
      artifactB.metadata.relationships.blocked_by = ['A.1'];

      const artifacts = new Map([
        ['A.1', artifactA],
        ['A.2', artifactB],
      ]);

      const result = removeBlocks('A.1', 'A.2', artifacts);

      expect(result.success).toBe(true);
      expect(
        result.updatedArtifacts.get('A.1')?.metadata.relationships.blocks,
      ).toEqual([]);
      expect(
        result.updatedArtifacts.get('A.2')?.metadata.relationships.blocked_by,
      ).toEqual([]);
    });

    it('should handle non-existent relationships gracefully', () => {
      const artifactA = createMockArtifact('A.1');
      const artifactB = createMockArtifact('A.2');

      const artifacts = new Map([
        ['A.1', artifactA],
        ['A.2', artifactB],
      ]);

      const result = removeBlocks('A.1', 'A.2', artifacts);

      expect(result.success).toBe(true);
      expect(result.updatedArtifacts.size).toBe(0);
    });

    it('should fail when artifacts do not exist', () => {
      const artifacts = new Map<string, Artifact>();

      const result = removeBlocks('A.1', 'A.2', artifacts);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Artifact A.1 does not exist');
    });
  });

  describe('addBlockedBy', () => {
    it('should update both artifacts atomically when A is blocked by B', () => {
      const artifactA = createMockArtifact('A.1');
      const artifactB = createMockArtifact('A.2');
      const artifacts = new Map([
        ['A.1', artifactA],
        ['A.2', artifactB],
      ]);

      const result = addBlockedBy('A.1', 'A.2', artifacts);

      expect(result.success).toBe(true);
      expect(
        result.updatedArtifacts.get('A.1')?.metadata.relationships.blocked_by,
      ).toContain('A.2');
      expect(
        result.updatedArtifacts.get('A.2')?.metadata.relationships.blocks,
      ).toContain('A.1');
    });

    it('should validate artifacts exist', () => {
      const artifacts = new Map<string, Artifact>();

      const result = addBlockedBy('A.1', 'A.2', artifacts);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Artifact A.2 does not exist');
    });
  });

  describe('removeBlockedBy', () => {
    it('should remove relationship from both artifacts', () => {
      const artifactA = createMockArtifact('A.1');
      const artifactB = createMockArtifact('A.2');
      artifactA.metadata.relationships.blocked_by = ['A.2'];
      artifactB.metadata.relationships.blocks = ['A.1'];

      const artifacts = new Map([
        ['A.1', artifactA],
        ['A.2', artifactB],
      ]);

      const result = removeBlockedBy('A.1', 'A.2', artifacts);

      expect(result.success).toBe(true);
      expect(
        result.updatedArtifacts.get('A.1')?.metadata.relationships.blocked_by,
      ).toEqual([]);
      expect(
        result.updatedArtifacts.get('A.2')?.metadata.relationships.blocks,
      ).toEqual([]);
    });
  });

  describe('TypeScript types', () => {
    it('should enforce correct types for all functions', () => {
      // This test ensures TypeScript compilation works correctly
      // The actual type checking happens at compile time
      const artifactA = createMockArtifact('A.1');
      const artifactB = createMockArtifact('A.2');
      const artifacts = new Map([
        ['A.1', artifactA],
        ['A.2', artifactB],
      ]);

      // These should all compile without TypeScript errors
      const result1 = addBlocks('A.1', 'A.2', artifacts);
      const result2 = removeBlocks('A.1', 'A.2', artifacts);
      const result3 = addBlockedBy('A.1', 'A.2', artifacts);
      const result4 = removeBlockedBy('A.1', 'A.2', artifacts);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result3).toBeDefined();
      expect(result4).toBeDefined();
    });
  });
});
