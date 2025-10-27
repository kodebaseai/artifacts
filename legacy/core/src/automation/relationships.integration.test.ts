import { describe, expect, it } from 'vitest';
import type { Artifact, Issue } from '../data/types';
import { CArtifactEvent, CEventTrigger } from '../data/types/constants';
import { addBlockedBy, addBlocks, removeBlocks } from './relationships';

describe('Relationship Management Integration', () => {
  // Helper to create test issues
  const createTestIssue = (_id: string, title: string): Issue => ({
    metadata: {
      title,
      priority: 'medium',
      estimation: 'S',
      created_by: 'Test User (test@example.com)',
      assignee: 'Test User (test@example.com)',
      schema_version: '0.2.0',
      relationships: {
        blocks: [],
        blocked_by: [],
      },
      events: [
        {
          timestamp: '2025-07-15T10:00:00Z',
          event: CArtifactEvent.DRAFT,
          actor: 'Test User (test@example.com)',
          trigger: CEventTrigger.ARTIFACT_CREATED,
        },
      ],
    },
    content: {
      summary: `Summary for ${title}`,
      acceptance_criteria: [`Complete ${title}`],
    },
  });

  it('should handle a complete workflow of relationship management', () => {
    // Create some test artifacts
    const issue1 = createTestIssue('A.1.1', 'Setup project structure');
    const issue2 = createTestIssue('A.1.2', 'Implement core functionality');
    const issue3 = createTestIssue('A.1.3', 'Add documentation');

    // Create artifacts map
    const artifacts = new Map<string, Artifact>([
      ['A.1.1', issue1],
      ['A.1.2', issue2],
      ['A.1.3', issue3],
    ]);

    // Step 1: A.1.1 blocks A.1.2 (setup must complete before implementation)
    const result1 = addBlocks('A.1.1', 'A.1.2', artifacts);
    expect(result1.success).toBe(true);

    // Update our local map with the changes
    for (const [id, artifact] of result1.updatedArtifacts) {
      artifacts.set(id, artifact);
    }

    // Verify the relationship was created
    const updated1 = artifacts.get('A.1.1');
    const updated2 = artifacts.get('A.1.2');
    expect(updated1?.metadata.relationships.blocks).toContain('A.1.2');
    expect(updated2?.metadata.relationships.blocked_by).toContain('A.1.1');

    // Step 2: A.1.3 is blocked by A.1.2 (docs come after implementation)
    const result2 = addBlockedBy('A.1.3', 'A.1.2', artifacts);
    expect(result2.success).toBe(true);

    // Update our local map
    for (const [id, artifact] of result2.updatedArtifacts) {
      artifacts.set(id, artifact);
    }

    // Verify the relationship
    const updated2Again = artifacts.get('A.1.2');
    const updated3 = artifacts.get('A.1.3');
    expect(updated2Again?.metadata.relationships.blocks).toContain('A.1.3');
    expect(updated3?.metadata.relationships.blocked_by).toContain('A.1.2');

    // Step 3: Try to create a circular dependency (should fail)
    const result3 = addBlocks('A.1.3', 'A.1.1', artifacts);
    expect(result3.success).toBe(false);
    expect(result3.error).toContain('circular dependency');

    // Step 4: Remove the first relationship
    const result4 = removeBlocks('A.1.1', 'A.1.2', artifacts);
    expect(result4.success).toBe(true);

    // Update our local map
    for (const [id, artifact] of result4.updatedArtifacts) {
      artifacts.set(id, artifact);
    }

    // Verify the relationship was removed
    const final1 = artifacts.get('A.1.1');
    const final2 = artifacts.get('A.1.2');
    expect(final1?.metadata.relationships.blocks).not.toContain('A.1.2');
    expect(final2?.metadata.relationships.blocked_by).not.toContain('A.1.1');

    // But A.1.2 still blocks A.1.3
    expect(final2?.metadata.relationships.blocks).toContain('A.1.3');
  });

  it('should demonstrate the friction point reduction', () => {
    // Before: Manual updates taking 5-10 minutes per relationship
    // After: Single function call with automatic bidirectional updates

    const artifacts = new Map<string, Artifact>();

    // Create 5 issues that need relationships
    for (let i = 1; i <= 5; i++) {
      const issue = createTestIssue(`B.1.${i}`, `Task ${i}`);
      artifacts.set(`B.1.${i}`, issue);
    }

    // Set up a dependency chain: 1 -> 2 -> 3 -> 4 -> 5
    const start = Date.now();

    const relationships = [
      { blocker: 'B.1.1', blocked: 'B.1.2' },
      { blocker: 'B.1.2', blocked: 'B.1.3' },
      { blocker: 'B.1.3', blocked: 'B.1.4' },
      { blocker: 'B.1.4', blocked: 'B.1.5' },
    ];

    for (const { blocker, blocked } of relationships) {
      const result = addBlocks(blocker, blocked, artifacts);
      expect(result.success).toBe(true);

      // Update artifacts with changes
      for (const [id, artifact] of result.updatedArtifacts) {
        artifacts.set(id, artifact);
      }
    }

    const elapsed = Date.now() - start;

    // Should be nearly instantaneous (< 100ms)
    expect(elapsed).toBeLessThan(100);

    // Verify all relationships are correct
    expect(artifacts.get('B.1.1')?.metadata.relationships.blocks).toEqual([
      'B.1.2',
    ]);
    expect(artifacts.get('B.1.2')?.metadata.relationships.blocked_by).toEqual([
      'B.1.1',
    ]);
    expect(artifacts.get('B.1.2')?.metadata.relationships.blocks).toEqual([
      'B.1.3',
    ]);
    expect(artifacts.get('B.1.3')?.metadata.relationships.blocked_by).toEqual([
      'B.1.2',
    ]);
    expect(artifacts.get('B.1.3')?.metadata.relationships.blocks).toEqual([
      'B.1.4',
    ]);
    expect(artifacts.get('B.1.4')?.metadata.relationships.blocked_by).toEqual([
      'B.1.3',
    ]);
    expect(artifacts.get('B.1.4')?.metadata.relationships.blocks).toEqual([
      'B.1.5',
    ]);
    expect(artifacts.get('B.1.5')?.metadata.relationships.blocked_by).toEqual([
      'B.1.4',
    ]);
  });
});
