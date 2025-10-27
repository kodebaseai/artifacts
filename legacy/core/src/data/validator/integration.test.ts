import { describe, expect, it } from 'vitest';
import { CArtifactEvent, CEventTrigger } from '../types/constants';
import { ArtifactValidator } from './index';

describe('Validation Error Formatting Integration', () => {
  const validator = new ArtifactValidator();

  it('transforms cryptic errors into actionable messages', () => {
    // Example from the issue notes:
    // "Invalid enum value" → "metadata.priority must be one of: critical, high, medium, low (found: 'urgent')"
    const invalidIssue = {
      metadata: {
        title: 'Test Issue',
        priority: 'urgent', // Invalid enum value
        estimation: 'M',
        created_by: 'Test User (test@example.com)',
        assignee: 'Test User (test@example.com)',
        schema_version: '0.2.0',
        relationships: {
          blocks: [],
          blocked_by: [],
        },
        events: [
          {
            event: CArtifactEvent.DRAFT,
            timestamp: '2025-01-15T10:00:00Z',
            actor: 'Test User (test@example.com)',
            trigger: CEventTrigger.ARTIFACT_CREATED,
          },
        ],
      },
      content: {
        summary: 'Test issue summary',
        acceptance_criteria: ['Test criterion'],
      },
    };

    try {
      validator.validateIssue(invalidIssue);
      expect.fail('Should have thrown validation error');
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      if (error instanceof Error) {
        // Error message should start with artifact type
        expect(error.message).toMatch(/^Issue validation failed:/);
        // Should show field-specific message
        expect(error.message).toContain('The priority level for this artifact');
        // Should show expected values
        expect(error.message).toContain(
          'must be one of: low, medium, high, critical',
        );
        // Should show the invalid value received
        expect(error.message).toContain("(found: 'urgent')");
        // Should provide actionable suggestion
        expect(error.message).toContain(
          'Change the value to one of the valid options',
        );
      }
    }
  });

  it('provides helpful formatting for datetime errors', () => {
    const invalidTimestamp = {
      metadata: {
        title: 'Test Issue',
        priority: 'high',
        estimation: 'M',
        created_by: 'Test User (test@example.com)',
        assignee: 'Test User (test@example.com)',
        schema_version: '0.2.0',
        relationships: {
          blocks: [],
          blocked_by: [],
        },
        events: [
          {
            event: CArtifactEvent.DRAFT,
            timestamp: '2025-01-15', // Missing time component
            actor: 'Test User (test@example.com)',
            trigger: CEventTrigger.ARTIFACT_CREATED,
          },
        ],
      },
      content: {
        summary: 'Test issue summary',
        acceptance_criteria: ['Test criterion'],
      },
    };

    try {
      validator.validateIssue(invalidTimestamp);
      expect.fail('Should have thrown validation error');
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      if (error instanceof Error) {
        expect(error.message).toContain('must be in ISO 8601 format');
        expect(error.message).toContain('Use format: YYYY-MM-DDTHH:mm:ssZ');
      }
    }
  });

  it('handles complex nested validation errors', () => {
    const multipleErrors = {
      metadata: {
        title: '', // Empty string
        priority: 'ASAP', // Invalid enum
        estimation: '5 days', // Invalid enum
        created_by: 'John', // Invalid format
        assignee: 'agent.invalid', // Invalid agent format
        schema_version: '0.2.0',
        relationships: {
          blocks: [123], // Wrong type in array
          blocked_by: [],
        },
        events: [], // Empty array
      },
      content: {
        summary: 'Test',
        acceptance_criteria: [], // Empty array
      },
    };

    try {
      validator.validateIssue(multipleErrors);
      expect.fail('Should have thrown validation error');
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      if (error instanceof Error) {
        // Should identify multiple errors
        expect(error.message).toContain('Multiple validation errors found:');
        // Should number the errors
        expect(error.message).toMatch(/1\./);
        expect(error.message).toMatch(/2\./);
        // Should provide suggestions section
        expect(error.message).toContain('Suggestions:');
        // Should handle nested paths
        expect(error.message).toContain('metadata.relationships.blocks.0');
      }
    }
  });

  it('reduces debugging time with clear field paths and suggestions', () => {
    const complexError = {
      metadata: {
        title: 'Valid Title',
        priority: 'high',
        estimation: 'M',
        created_by: 'Test User (test@example.com)',
        assignee: 'Test User (test@example.com)',
        schema_version: '0.2.0',
        relationships: {
          blocks: [],
          blocked_by: [],
        },
        events: [
          {
            event: 'invalid_status', // Invalid event type
            timestamp: '2025-01-15T10:00:00Z',
            actor: 'Test User (test@example.com)',
            trigger: CEventTrigger.MANUAL,
          },
        ],
      },
      content: {
        // Missing required fields for issue
      },
    };

    try {
      validator.validateIssue(complexError);
      expect.fail('Should have thrown validation error');
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      if (error instanceof Error) {
        // Error message should be clear enough to fix without looking at schema
        expect(error.message.toLowerCase()).toContain('event');
        expect(error.message).toContain(
          'draft, ready, blocked, cancelled, in_progress, in_review, completed, archived',
        );
      }
    }
  });
});
