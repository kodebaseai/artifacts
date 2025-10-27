/**
 * Tests for the artifact query system
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type {
  Artifact,
  Initiative,
  Issue,
  Milestone,
  TArtifactEvent,
} from '../data/types';
import { CArtifactEvent, CEventTrigger } from '../data/types/constants';
import {
  ArtifactQuery,
  isInitiative,
  isIssue,
  isMilestone,
  query,
} from './index';

type TestArtifact = Artifact & { id: string };
type TestInitiative = Initiative & { id: string };
type TestMilestone = Milestone & { id: string };
type TestIssue = Issue & { id: string };

// Test fixtures
const createInitiative = (id: string, status: string): TestInitiative => ({
  id,
  metadata: {
    title: `Initiative ${id}`,
    priority: 'high',
    estimation: 'L',
    created_by: 'Test User (test@example.com)',
    assignee: 'Test User (test@example.com)',
    schema_version: '0.2.0',
    relationships: { blocks: [], blocked_by: [] },
    events: [
      {
        event: status as TArtifactEvent,
        timestamp: '2025-01-01T00:00:00Z',
        actor: 'Test User (test@example.com)',
        trigger: CEventTrigger.ARTIFACT_CREATED,
      },
    ],
  },
  content: {
    vision: 'Test vision',
    scope: 'Test scope',
    success_criteria: ['Test criteria'],
  },
});

const createMilestone = (id: string, status: string): TestMilestone => ({
  id,
  metadata: {
    title: `Milestone ${id}`,
    priority: 'medium',
    estimation: 'M',
    created_by: 'Test User (test@example.com)',
    assignee: 'Test User (test@example.com)',
    schema_version: '0.2.0',
    relationships: { blocks: [], blocked_by: [] },
    events: [
      {
        event: status as TArtifactEvent,
        timestamp: '2025-01-01T00:00:00Z',
        actor: 'Test User (test@example.com)',
        trigger: CEventTrigger.ARTIFACT_CREATED,
      },
    ],
  },
  content: {
    summary: 'Test summary',
    deliverables: ['Test deliverable'],
    validation: ['Test validation'],
  },
});

const createIssue = (id: string, status: string): TestIssue => ({
  id,
  metadata: {
    title: `Issue ${id}`,
    priority: 'low',
    estimation: 'S',
    created_by: 'Test User (test@example.com)',
    assignee: 'Test User (test@example.com)',
    schema_version: '0.2.0',
    relationships: { blocks: [], blocked_by: [] },
    events: [
      {
        event: status as TArtifactEvent,
        timestamp: '2025-01-01T00:00:00Z',
        actor: 'Test User (test@example.com)',
        trigger: CEventTrigger.ARTIFACT_CREATED,
      },
    ],
  },
  content: {
    summary: 'Test summary',
    acceptance_criteria: ['Test criteria'],
  },
});

describe('ArtifactQuery', () => {
  let artifacts: Artifact[];

  beforeEach(() => {
    artifacts = [
      createInitiative('A', CArtifactEvent.READY),
      createMilestone('A.1', CArtifactEvent.IN_PROGRESS),
      createMilestone('A.2', CArtifactEvent.READY),
      createIssue('A.1.1', CArtifactEvent.COMPLETED),
      createIssue('A.1.2', CArtifactEvent.IN_PROGRESS),
      createIssue('A.2.1', CArtifactEvent.READY),
      createIssue('A.2.2', CArtifactEvent.BLOCKED),
    ];
  });

  describe('byStatus', () => {
    it('should filter artifacts by status', () => {
      const query = new ArtifactQuery(artifacts);
      const results = query.byStatus(CArtifactEvent.READY).execute();

      expect(results).toHaveLength(3);
      expect(results.map((a: unknown) => (a as TestArtifact).id)).toEqual([
        'A',
        'A.2',
        'A.2.1',
      ]);
    });

    it('should handle multiple status transitions', () => {
      const issueWithHistory = createIssue('A.3.1', CArtifactEvent.DRAFT);
      issueWithHistory.metadata.events.push({
        event: CArtifactEvent.READY,
        timestamp: '2025-01-02T00:00:00Z',
        actor: 'Test User (test@example.com)',
        trigger: CEventTrigger.DEPENDENCIES_MET,
      });
      issueWithHistory.metadata.events.push({
        event: CArtifactEvent.IN_PROGRESS,
        timestamp: '2025-01-03T00:00:00Z',
        actor: 'Test User (test@example.com)',
        trigger: CEventTrigger.BRANCH_CREATED,
      });

      const testArtifacts = [...artifacts, issueWithHistory];
      const query = new ArtifactQuery(testArtifacts);
      const results = query.byStatus(CArtifactEvent.IN_PROGRESS).execute();

      expect(results).toHaveLength(3);
      const ids = results.map((a: unknown) => (a as TestIssue).id);
      expect(ids).toContain('A.3.1');
    });
  });

  describe('inMilestone', () => {
    it('should filter issues by milestone', () => {
      const query = new ArtifactQuery(artifacts);
      const results = query.inMilestone('A.1').execute();

      expect(results).toHaveLength(2);
      expect(results.map((a: unknown) => (a as TestIssue).id)).toEqual([
        'A.1.1',
        'A.1.2',
      ]);
    });

    it('should return empty array for non-existent milestone', () => {
      const query = new ArtifactQuery(artifacts);
      const results = query.inMilestone('B.1').execute();

      expect(results).toHaveLength(0);
    });
  });

  describe('ofType', () => {
    it('should filter by artifact type', () => {
      const query = new ArtifactQuery(artifacts);

      const initiatives = query.ofType('initiative').execute();
      expect(initiatives).toHaveLength(1);
      expect(initiatives[0]).toBeDefined();
      if (initiatives[0]) {
        expect(isInitiative(initiatives[0])).toBe(true);
      }

      const milestones = new ArtifactQuery(artifacts)
        .ofType('milestone')
        .execute();
      expect(milestones).toHaveLength(2);
      milestones.forEach((m) => expect(isMilestone(m)).toBe(true));

      const issues = new ArtifactQuery(artifacts).ofType('issue').execute();
      expect(issues).toHaveLength(4);
      issues.forEach((i) => expect(isIssue(i)).toBe(true));
    });
  });

  describe('chaining', () => {
    it('should support chaining multiple filters', () => {
      const query = new ArtifactQuery(artifacts);
      const results = query
        .byStatus(CArtifactEvent.READY)
        .ofType('issue')
        .execute();

      expect(results).toHaveLength(1);
      expect((results[0] as unknown as TestIssue).id).toBe('A.2.1');
    });

    it('should apply all filters correctly', () => {
      const query = new ArtifactQuery(artifacts);
      const results = query
        .inMilestone('A.1')
        .byStatus(CArtifactEvent.IN_PROGRESS)
        .ofType('issue')
        .execute();

      expect(results).toHaveLength(1);
      expect((results[0] as unknown as TestIssue).id).toBe('A.1.2');
    });

    it('should return empty array when no artifacts match all filters', () => {
      const query = new ArtifactQuery(artifacts);
      const results = query
        .byStatus(CArtifactEvent.COMPLETED)
        .ofType('initiative')
        .execute();

      expect(results).toHaveLength(0);
    });
  });

  describe('factory function', () => {
    it('should create query instance using factory', () => {
      const q = query(artifacts);
      expect(q).toBeInstanceOf(ArtifactQuery);

      const results = q.byStatus(CArtifactEvent.READY).execute();
      expect(results).toHaveLength(3);
    });
  });

  describe('type guards', () => {
    it('should correctly identify artifact types', () => {
      const initiative = artifacts[0];
      const milestone = artifacts[1];
      const issue = artifacts[3];

      expect(initiative).toBeDefined();
      expect(milestone).toBeDefined();
      expect(issue).toBeDefined();

      if (initiative) {
        expect(isInitiative(initiative)).toBe(true);
        expect(isMilestone(initiative)).toBe(false);
        expect(isIssue(initiative)).toBe(false);
      }

      if (milestone) {
        expect(isInitiative(milestone)).toBe(false);
        expect(isMilestone(milestone)).toBe(true);
        expect(isIssue(milestone)).toBe(false);
      }

      if (issue) {
        expect(isInitiative(issue)).toBe(false);
        expect(isMilestone(issue)).toBe(false);
        expect(isIssue(issue)).toBe(true);
      }
    });
  });

  describe('performance', () => {
    it('should handle large datasets efficiently', () => {
      // Create 1000 artifacts for performance testing
      const largeDataset: Artifact[] = [];
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          for (let k = 0; k < 10; k++) {
            largeDataset.push(
              createIssue(`A.${i}.${j}.${k}`, CArtifactEvent.READY),
            );
          }
        }
      }

      const start = performance.now();
      const query = new ArtifactQuery(largeDataset);
      const results = query
        .byStatus(CArtifactEvent.READY)
        .inMilestone('A.5')
        .ofType('issue')
        .execute();
      const end = performance.now();

      expect(results).toHaveLength(100); // All issues in milestone A.5
      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});
