import { describe, it, expect } from 'vitest';
import { ReadinessValidator } from './readiness-validator';
import type {
  IssueSchema,
  MilestoneSchema,
  InitiativeSchema,
  ArtifactSchema,
} from '../data/schemas';
import { CArtifactEvent } from '../data/types/constants';
import {
  createValidIssueMetadata,
  createValidMilestoneMetadata,
  createValidInitiativeMetadata,
  createValidEvent,
} from './test-helpers';

describe('ReadinessValidator', () => {
  const validator = new ReadinessValidator();

  describe('Issue Validation', () => {
    it('should validate a complete issue as ready', () => {
      const issue: IssueSchema = {
        metadata: createValidIssueMetadata(),
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criterion 1', 'Test criterion 2'],
        },
      };

      const result = validator.validateIssueReadiness(issue, 'A.1.1');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const issue: IssueSchema = {
        metadata: createValidIssueMetadata({
          title: '',
          events: [],
        }),
        content: {
          summary: '',
          acceptance_criteria: [],
        },
      };

      const result = validator.validateIssueReadiness(issue, 'A.1.1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'ISSUE_MISSING_TITLE',
        }),
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'ISSUE_MISSING_SUMMARY',
        }),
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'ISSUE_MISSING_ACCEPTANCE_CRITERIA',
        }),
      );
    });

    it('should validate dependencies', () => {
      const blockedByArtifact: IssueSchema = {
        metadata: createValidIssueMetadata({
          title: 'Blocking Issue',
          events: [
            createValidEvent({
              event: CArtifactEvent.DRAFT,
            }),
          ],
        }),
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criterion'],
        },
      };

      const issue: IssueSchema = {
        metadata: createValidIssueMetadata({
          title: 'Dependent Issue',
          relationships: {
            blocks: [],
            blocked_by: ['A.1.1'],
          },
          events: [],
        }),
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criterion'],
        },
      };

      const artifacts = new Map<string, ArtifactSchema>([
        ['A.1.1', blockedByArtifact],
        ['A.1.2', issue],
      ]);

      const result = validator.validateIssueReadiness(
        issue,
        'A.1.2',
        artifacts,
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'ISSUE_DEPENDENCY_NOT_READY',
        }),
      );
    });
  });

  describe('Milestone Validation', () => {
    it('should validate a complete milestone as ready', () => {
      const milestone: MilestoneSchema = {
        metadata: createValidMilestoneMetadata(),
        content: {
          summary: 'Test milestone summary',
          deliverables: ['Deliverable 1', 'Deliverable 2'],
          validation: ['Validation criterion 1'],
        },
      };

      const childIssue: IssueSchema = {
        metadata: createValidIssueMetadata({
          title: 'Child Issue',
          events: [
            createValidEvent({
              event: CArtifactEvent.READY,
            }),
          ],
        }),
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criterion'],
        },
      };

      const artifacts = new Map<string, ArtifactSchema>([
        ['A.1', milestone],
        ['A.1.1', childIssue],
      ]);

      const result = validator.validateMilestoneReadiness(
        milestone,
        'A.1',
        artifacts,
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require at least one ready child issue', () => {
      const milestone: MilestoneSchema = {
        metadata: createValidMilestoneMetadata(),
        content: {
          summary: 'Test milestone summary',
          deliverables: ['Deliverable 1'],
          validation: ['Validation criterion 1'],
        },
      };

      const artifacts = new Map<string, ArtifactSchema>([['A.1', milestone]]);

      const result = validator.validateMilestoneReadiness(
        milestone,
        'A.1',
        artifacts,
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MILESTONE_NO_CHILD_ISSUES',
        }),
      );
    });
  });

  describe('Initiative Validation', () => {
    it('should validate a complete initiative as ready', () => {
      const initiative: InitiativeSchema = {
        metadata: createValidInitiativeMetadata({
          priority: 'critical',
        }),
        content: {
          vision: 'Test vision statement',
          scope: 'Test scope description',
          success_criteria: [
            'Achieve 90% test coverage',
            'Reduce load time by 50%',
          ],
        },
      };

      const milestone: MilestoneSchema = {
        metadata: createValidMilestoneMetadata({
          title: 'Child Milestone',
        }),
        content: {
          summary: 'Milestone summary',
          deliverables: ['Deliverable 1'],
          validation: ['Validation criterion 1'],
        },
      };

      const issue: IssueSchema = {
        metadata: createValidIssueMetadata({
          title: 'Child Issue',
          events: [
            createValidEvent({
              event: CArtifactEvent.READY,
            }),
          ],
        }),
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criterion'],
        },
      };

      const artifacts = new Map<string, ArtifactSchema>([
        ['A', initiative],
        ['A.1', milestone],
        ['A.1.1', issue],
      ]);

      const result = validator.validateInitiativeReadiness(
        initiative,
        'A',
        artifacts,
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require measurable success criteria', () => {
      const initiative: InitiativeSchema = {
        metadata: createValidInitiativeMetadata({
          priority: 'critical',
        }),
        content: {
          vision: 'Test vision statement',
          scope: 'Test scope description',
          success_criteria: [
            'Make the system better',
            'Improve user experience',
          ],
        },
      };

      const result = validator.validateInitiativeReadiness(initiative, 'A');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INITIATIVE_NON_MEASURABLE_CRITERIA',
        }),
      );
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should detect simple circular dependencies', () => {
      const issue1: IssueSchema = {
        metadata: createValidIssueMetadata({
          title: 'Issue 1',
          relationships: {
            blocks: [],
            blocked_by: ['A.1.2'],
          },
        }),
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criterion'],
        },
      };

      const issue2: IssueSchema = {
        metadata: createValidIssueMetadata({
          title: 'Issue 2',
          relationships: {
            blocks: [],
            blocked_by: ['A.1.1'],
          },
        }),
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criterion'],
        },
      };

      const artifacts = new Map<string, ArtifactSchema>([
        ['A.1.1', issue1],
        ['A.1.2', issue2],
      ]);

      const errors = validator.detectCircularDependencies(artifacts);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        code: 'CIRCULAR_DEPENDENCY',
        message: expect.stringContaining('Circular dependency detected'),
      });
    });

    it('should detect complex circular dependencies', () => {
      const issue1: IssueSchema = {
        metadata: createValidIssueMetadata({
          title: 'Issue 1',
          relationships: {
            blocks: [],
            blocked_by: ['A.1.2'],
          },
        }),
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criterion'],
        },
      };

      const issue2: IssueSchema = {
        metadata: createValidIssueMetadata({
          title: 'Issue 2',
          relationships: {
            blocks: [],
            blocked_by: ['A.1.3'],
          },
        }),
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criterion'],
        },
      };

      const issue3: IssueSchema = {
        metadata: createValidIssueMetadata({
          title: 'Issue 3',
          relationships: {
            blocks: [],
            blocked_by: ['A.1.1'],
          },
        }),
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criterion'],
        },
      };

      const artifacts = new Map<string, ArtifactSchema>([
        ['A.1.1', issue1],
        ['A.1.2', issue2],
        ['A.1.3', issue3],
      ]);

      const errors = validator.detectCircularDependencies(artifacts);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        code: 'CIRCULAR_DEPENDENCY',
        message: expect.stringContaining('A.1.1 → A.1.2 → A.1.3 → A.1.1'),
      });
    });
  });

  describe('Cross-Level Relationship Detection', () => {
    it('should detect issue depending on initiative', () => {
      const initiative: InitiativeSchema = {
        metadata: createValidInitiativeMetadata(),
        content: {
          vision: 'Test vision',
          scope: 'Test scope',
          success_criteria: ['Achieve 90% coverage'],
        },
      };

      const issue: IssueSchema = {
        metadata: createValidIssueMetadata({
          title: 'Issue',
          relationships: {
            blocks: [],
            blocked_by: ['A'],
          },
        }),
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criterion'],
        },
      };

      const artifacts = new Map<string, ArtifactSchema>([
        ['A', initiative],
        ['A.1.1', issue],
      ]);

      const errors = validator.detectCrossLevelRelationships(artifacts);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        code: 'CROSS_LEVEL_DEPENDENCY',
        message: 'Issue A.1.1 cannot depend on initiative A',
      });
    });
  });
});
