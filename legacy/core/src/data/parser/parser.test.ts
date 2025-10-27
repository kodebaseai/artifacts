import { beforeEach, describe, expect, it } from 'vitest';
import {
  createInitiativeYaml,
  createIssueYaml,
  createMilestoneYaml,
  INVALID_YAML_SAMPLES,
  SIMPLE_YAML_SAMPLES,
} from '../../test/fixtures';
import { ArtifactParser } from './index';

describe('ArtifactParser', () => {
  let parser: ArtifactParser;

  beforeEach(() => {
    parser = new ArtifactParser();
  });

  describe('parseYaml', () => {
    it('should parse valid YAML string to object', () => {
      const result = parser.parseYaml(SIMPLE_YAML_SAMPLES.basic);

      expect(result).toEqual({
        metadata: {
          title: 'Test Issue',
          priority: 'high',
        },
      });
    });

    it('should throw error for invalid YAML syntax', () => {
      expect(() =>
        parser.parseYaml(INVALID_YAML_SAMPLES.syntaxError),
      ).toThrow();
    });

    it('should handle empty string', () => {
      expect(() => parser.parseYaml(INVALID_YAML_SAMPLES.empty)).toThrow(
        'Cannot parse empty YAML content',
      );
    });

    it('should handle null/undefined input', () => {
      expect(() => parser.parseYaml(null as unknown as string)).toThrow(
        'YAML content must be a string',
      );
      expect(() => parser.parseYaml(undefined as unknown as string)).toThrow(
        'YAML content must be a string',
      );
    });
  });

  describe('parseInitiative', () => {
    it('should parse and validate a valid initiative YAML', () => {
      const initiativeYaml = createInitiativeYaml();

      const result = parser.parseInitiative(initiativeYaml);

      expect(result.metadata.title).toBe('Test Initiative');
      expect(result.content.vision).toContain('test vision statement');
      expect(result.content.success_criteria).toHaveLength(2);
    });

    it('should parse initiative with custom values', () => {
      const initiativeYaml = createInitiativeYaml({
        metadata: { title: 'Custom Initiative', priority: 'low' },
        content: {
          vision:
            'A much longer custom vision for this initiative that meets requirements',
        },
      });

      const result = parser.parseInitiative(initiativeYaml);

      expect(result.metadata.title).toBe('Custom Initiative');
      expect(result.metadata.priority).toBe('low');
      expect(result.content.vision).toContain('custom vision');
    });

    it('should throw validation error for invalid initiative structure', () => {
      expect(() =>
        parser.parseInitiative(INVALID_YAML_SAMPLES.missingRequired),
      ).toThrow();
    });
  });

  describe('parseMilestone', () => {
    it('should parse and validate a valid milestone YAML', () => {
      const milestoneYaml = createMilestoneYaml();

      const result = parser.parseMilestone(milestoneYaml);

      expect(result.metadata.title).toBe('Test Milestone');
      expect(result.content.deliverables).toHaveLength(2);
      expect(result.content.validation).toHaveLength(2);
    });
  });

  describe('parseIssue', () => {
    it('should parse and validate a valid issue YAML', () => {
      const issueYaml = createIssueYaml();

      const result = parser.parseIssue(issueYaml);

      expect(result.metadata.title).toBe('Test Issue');
      expect(result.content.acceptance_criteria).toHaveLength(2);
    });

    it('should parse issue with development process', () => {
      const issueYaml = createIssueYaml({
        development_process: {
          alternatives_considered: ['First alternative approach'],
          challenges_encountered: [
            {
              challenge: 'Difficult problem',
              solution: 'Smart solution',
            },
          ],
        },
      });

      const result = parser.parseIssue(issueYaml);

      expect(result.development_process?.alternatives_considered).toHaveLength(
        1,
      );

      const challenges = result.development_process?.challenges_encountered;
      expect(challenges).toBeDefined();
      expect(challenges).toHaveLength(1);
      expect(challenges?.[0]?.challenge).toBe('Difficult problem');
      expect(challenges?.[0]?.solution).toBe('Smart solution');
    });
  });
});
