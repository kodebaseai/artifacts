import { beforeEach, describe, expect, it } from 'vitest';
import {
  createInitiativeYaml,
  createIssueYaml,
  createMilestoneYaml,
  createTestMetadata,
} from '../../test/fixtures';
import { ArtifactParser } from '../parser';
import { ArtifactValidator } from './index';

describe('ArtifactValidator', () => {
  let validator: ArtifactValidator;
  let parser: ArtifactParser;

  beforeEach(() => {
    validator = new ArtifactValidator();
    parser = new ArtifactParser();
  });

  describe('validateInitiative', () => {
    it('should validate a valid initiative object', () => {
      const yaml = createInitiativeYaml();
      const data = parser.parseYaml(yaml);

      const result = validator.validateInitiative(data);

      expect(result.metadata.title).toBe('Test Initiative');
      expect(result.content.vision).toBeDefined();
      expect(result.content.success_criteria).toHaveLength(2);
    });

    it('should throw error with actionable message for missing required fields', () => {
      const data = {
        metadata: createTestMetadata(),
        content: {
          vision: 'Short', // Too short
          scope: 'This is a valid scope statement',
          success_criteria: [],
        },
      };

      expect(() => validator.validateInitiative(data)).toThrow(
        'Initiative validation failed',
      );

      try {
        validator.validateInitiative(data);
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        if (error instanceof Error) {
          expect(error.message).toContain('must be at least');
          expect(error.message).toContain('Provide a more detailed value');
        }
      }
    });

    it('should validate initiative with completion summary', () => {
      const yaml = createInitiativeYaml();
      const data = parser.parseYaml(yaml) as Record<string, unknown>;
      data.completion_summary = {
        business_impact: 'Significant cost savings',
        strategic_achievements: ['First achievement'],
        organizational_learning: ['Important lessons learned'],
        architecture_evolution: ['Improved system architecture'],
        future_roadmap_impact: ['Foundation for future development'],
      };

      const result = validator.validateInitiative(data);

      expect(result.completion_summary?.business_impact).toBe(
        'Significant cost savings',
      );
    });
  });

  describe('validateMilestone', () => {
    it('should validate a valid milestone object', () => {
      const yaml = createMilestoneYaml();
      const data = parser.parseYaml(yaml);

      const result = validator.validateMilestone(data);

      expect(result.metadata.title).toBe('Test Milestone');
      expect(result.content.deliverables).toHaveLength(2);
      expect(result.content.validation).toHaveLength(2);
    });

    it('should throw error for empty deliverables', () => {
      const yaml = createMilestoneYaml();
      const data = parser.parseYaml(yaml) as Record<string, unknown>;
      (data.content as Record<string, unknown>).deliverables = [];

      expect(() => validator.validateMilestone(data)).toThrow(
        'Milestone validation failed',
      );
    });
  });

  describe('validateIssue', () => {
    it('should validate a valid issue object', () => {
      const yaml = createIssueYaml();
      const data = parser.parseYaml(yaml);

      const result = validator.validateIssue(data);

      expect(result.metadata.title).toBe('Test Issue');
      expect(result.content.acceptance_criteria).toHaveLength(2);
    });

    it('should validate issue with development process', () => {
      const yaml = createIssueYaml({
        development_process: {
          alternatives_considered: ['Option A', 'Option B'],
          challenges_encountered: [
            {
              challenge: 'Complex problem',
              solution: 'Elegant solution',
            },
          ],
        },
      });
      const data = parser.parseYaml(yaml);

      const result = validator.validateIssue(data);

      expect(result.development_process?.alternatives_considered).toHaveLength(
        2,
      );
      expect(result.development_process?.challenges_encountered).toHaveLength(
        1,
      );
    });

    it('should throw error for invalid development process', () => {
      const yaml = createIssueYaml();
      const data = parser.parseYaml(yaml) as Record<string, unknown>;
      data.development_process = {
        alternatives_considered: [], // Should have at least one when section is present
      };

      expect(() => validator.validateIssue(data)).toThrow(
        'Issue validation failed',
      );
    });
  });

  describe('validate (auto-detect type)', () => {
    it('should auto-detect and validate initiative', () => {
      const yaml = createInitiativeYaml();
      const data = parser.parseYaml(yaml);

      const result = validator.validate(data);

      expect(result).toHaveProperty('content.vision');
      expect(result).toHaveProperty('content.scope');
    });

    it('should auto-detect and validate milestone', () => {
      const yaml = createMilestoneYaml();
      const data = parser.parseYaml(yaml);

      const result = validator.validate(data);

      expect(result).toHaveProperty('content.deliverables');
      expect(result).toHaveProperty('content.validation');
    });

    it('should auto-detect and validate issue', () => {
      const yaml = createIssueYaml();
      const data = parser.parseYaml(yaml);

      const result = validator.validate(data);

      expect(result).toHaveProperty('content.acceptance_criteria');
    });

    it('should throw error for unknown artifact type', () => {
      const data = {
        metadata: createTestMetadata(),
        content: {
          unknown_field: 'This is not a valid artifact',
        },
      };

      expect(() => validator.validate(data)).toThrow(
        'Unable to determine artifact type',
      );
    });
  });

  describe('enhanced error formatting', () => {
    it('should provide actionable error for invalid priority enum', () => {
      const yaml = createIssueYaml();
      const data = parser.parseYaml(yaml) as Record<string, unknown>;
      (data.metadata as Record<string, unknown>).priority = 'urgent';

      try {
        validator.validateIssue(data);
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        if (error instanceof Error) {
          expect(error.message).toContain(
            'The priority level for this artifact must be one of: low, medium, high, critical',
          );
          expect(error.message).toContain("(found: 'urgent')");
          expect(error.message).toContain(
            'Change the value to one of the valid options',
          );
        }
      }
    });

    it('should provide helpful error for invalid actor format', () => {
      const yaml = createMilestoneYaml();
      const data = parser.parseYaml(yaml) as Record<string, unknown>;
      (data.metadata as Record<string, unknown>).created_by = 'John Doe';

      try {
        validator.validateMilestone(data);
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        if (error instanceof Error) {
          expect(error.message).toContain(
            'The creator of this artifact has invalid format',
          );
          expect(error.message).toContain(
            'Use format: "Name (email@domain.com)" for humans',
          );
        }
      }
    });

    it('should handle multiple validation errors', () => {
      const data = {
        metadata: {
          title: '',
          priority: 'invalid',
          estimation: 'wrong',
          created_by: 'invalid',
          assignee: 'invalid',
          schema_version: '0.1.0',
          relationships: {
            blocks: [],
            blocked_by: [],
          },
          events: [],
        },
        content: {
          acceptance_criteria: [],
        },
      };

      try {
        validator.validateIssue(data);
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        if (error instanceof Error) {
          expect(error.message).toContain('Multiple validation errors found:');
          expect(error.message).toContain('1. ');
          expect(error.message).toContain('2. ');
          expect(error.message).toContain('Suggestions:');
        }
      }
    });
  });

  describe('getArtifactType', () => {
    it('should identify initiative by content fields', () => {
      const data = {
        content: {
          vision: 'Some vision',
          scope: 'Some scope',
          success_criteria: [],
        },
      };

      const type = validator.getArtifactType(data);

      expect(type).toBe('initiative');
    });

    it('should identify milestone by content fields', () => {
      const data = {
        content: {
          deliverables: [],
          validation: [],
        },
      };

      const type = validator.getArtifactType(data);

      expect(type).toBe('milestone');
    });

    it('should identify issue by content fields', () => {
      const data = {
        content: {
          acceptance_criteria: [],
        },
      };

      const type = validator.getArtifactType(data);

      expect(type).toBe('issue');
    });

    it('should return null for invalid structure', () => {
      const data = { invalid: 'structure' };

      const type = validator.getArtifactType(data);

      expect(type).toBeNull();
    });
  });
});
