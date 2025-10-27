import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CPriority, CEstimationSize, CArtifactEvent } from '../types/constants';
import {
  formatValidationErrors,
  getValidationErrorDetails,
} from './error-formatter';

describe('formatValidationErrors', () => {
  describe('enum validation errors', () => {
    it('should format priority enum error with valid options', () => {
      const schema = z.object({
        metadata: z.object({
          priority: z.enum(Object.values(CPriority) as [string, ...string[]]),
        }),
      });

      const result = schema.safeParse({
        metadata: { priority: 'urgent' },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatValidationErrors(result.error);
        expect(formatted).toContain(
          'The priority level for this artifact must be one of: low, medium, high, critical',
        );
        expect(formatted).toContain("(found: 'urgent')");
        expect(formatted).toContain(
          'Change the value to one of the valid options: low, medium, high, critical',
        );
      }
    });

    it('should format estimation enum error', () => {
      const schema = z.object({
        metadata: z.object({
          estimation: z.enum(
            Object.values(CEstimationSize) as [string, ...string[]],
          ),
        }),
      });

      const result = schema.safeParse({
        metadata: { estimation: 'huge' },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatValidationErrors(result.error);
        expect(formatted).toContain(
          'The effort estimation size must be one of: XS, S, M, L, XL, XXL',
        );
        expect(formatted).toContain("(found: 'huge')");
      }
    });

    it('should format event enum error', () => {
      const schema = z.object({
        metadata: z.object({
          events: z.array(
            z.object({
              event: z.enum(
                Object.values(CArtifactEvent) as [string, ...string[]],
              ),
            }),
          ),
        }),
      });

      const result = schema.safeParse({
        metadata: {
          events: [{ event: 'started' }],
        },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatValidationErrors(result.error);
        expect(formatted).toContain(
          'must be one of: draft, ready, blocked, cancelled, in_progress, in_review, completed, archived',
        );
      }
    });
  });

  describe('type validation errors', () => {
    it('should format missing required field error', () => {
      const schema = z.object({
        metadata: z.object({
          title: z.string(),
        }),
      });

      const result = schema.safeParse({
        metadata: {},
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatValidationErrors(result.error);
        expect(formatted).toContain('The human-readable title must be string');
        expect(formatted).toContain(
          "Add the required field 'metadata.title' with a string value",
        );
      }
    });

    it('should format wrong type error', () => {
      const schema = z.object({
        metadata: z.object({
          title: z.string(),
        }),
      });

      const result = schema.safeParse({
        metadata: { title: 123 },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatValidationErrors(result.error);
        expect(formatted).toContain('The human-readable title must be string');
        expect(formatted).toContain('(found: number)');
        expect(formatted).toContain('Change the type from number to string');
      }
    });
  });

  describe('string validation errors', () => {
    it('should format minimum length error', () => {
      const schema = z.object({
        metadata: z.object({
          title: z.string().min(1),
        }),
      });

      const result = schema.safeParse({
        metadata: { title: '' },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatValidationErrors(result.error);
        expect(formatted).toContain(
          'The human-readable title must be at least 1 character long',
        );
        expect(formatted).toContain(
          'Provide a more detailed value with at least 1 character',
        );
      }
    });

    it('should format datetime validation error', () => {
      const schema = z.object({
        timestamp: z.string().datetime(),
      });

      const result = schema.safeParse({
        timestamp: '2025-01-15',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatValidationErrors(result.error);
        expect(formatted).toContain('must be in ISO 8601 format');
        expect(formatted).toContain('Use format: YYYY-MM-DDTHH:mm:ssZ');
      }
    });

    it('should format actor regex validation error', () => {
      const actorRegex =
        /^([\w\s]+\s*\([^)]+@[^)]+\)|agent\.[A-Z]+\.[A-Z0-9]+@[\w.-]+\.kodebase\.ai)$/;
      const schema = z.object({
        metadata: z.object({
          created_by: z.string().regex(actorRegex),
        }),
      });

      const result = schema.safeParse({
        metadata: { created_by: 'John Doe' },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatValidationErrors(result.error);
        expect(formatted).toContain(
          'The creator of this artifact has invalid format',
        );
        expect(formatted).toContain(
          'Use format: "Name (email@domain.com)" for humans or "agent.TYPE.SESSION@tenant.kodebase.ai" for AI agents',
        );
      }
    });
  });

  describe('array validation errors', () => {
    it('should format minimum array length error', () => {
      const schema = z.object({
        content: z.object({
          success_criteria: z.array(z.string()).min(1),
        }),
      });

      const result = schema.safeParse({
        content: { success_criteria: [] },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatValidationErrors(result.error);
        expect(formatted).toContain(
          'The measurable success criteria must have at least 1 item',
        );
        expect(formatted).toContain('Add at least 1 item to the list');
      }
    });
  });

  describe('multiple validation errors', () => {
    it('should format multiple errors as a numbered list', () => {
      const schema = z.object({
        metadata: z.object({
          title: z.string().min(1),
          priority: z.enum(['low', 'medium', 'high', 'critical']),
          estimation: z.enum(['XS', 'S', 'M', 'L', 'XL']),
        }),
      });

      const result = schema.safeParse({
        metadata: {
          title: '',
          priority: 'urgent',
          estimation: 'huge',
        },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatValidationErrors(result.error);
        expect(formatted).toContain('Multiple validation errors found:');
        expect(formatted).toContain('1. metadata.title:');
        expect(formatted).toContain('2. metadata.priority:');
        expect(formatted).toContain('3. metadata.estimation:');
        expect(formatted).toContain('Suggestions:');
      }
    });
  });

  describe('nested object and array errors', () => {
    it('should handle deeply nested paths', () => {
      const schema = z.object({
        metadata: z.object({
          relationships: z.object({
            blocks: z.array(z.string()),
            blocked_by: z.array(z.string()),
          }),
        }),
      });

      const result = schema.safeParse({
        metadata: {
          relationships: {
            blocks: [123], // wrong type in array
          },
        },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatValidationErrors(result.error);
        expect(formatted).toContain('metadata.relationships.blocks.0');
      }
    });
  });
});

describe('getValidationErrorDetails', () => {
  it('should return detailed error information', () => {
    const schema = z.object({
      metadata: z.object({
        priority: z.enum(['low', 'medium', 'high', 'critical']),
      }),
    });

    const result = schema.safeParse({
      metadata: { priority: 'urgent' },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const details = getValidationErrorDetails(result.error);
      expect(details).toHaveLength(1);
      expect(details[0]).toMatchObject({
        path: 'metadata.priority',
        message: expect.stringContaining('must be one of'),
        expected: 'low, medium, high, critical',
        received: 'urgent',
        suggestion: expect.stringContaining('Change the value'),
        code: 'invalid_enum_value',
      });
    }
  });
});
