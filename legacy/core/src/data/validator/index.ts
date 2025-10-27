/**
 * Artifact validator for Kodebase
 */

import { z } from 'zod';
import {
  type ArtifactSchema,
  type InitiativeSchema,
  type IssueSchema,
  initiativeSchema,
  issueSchema,
  type MilestoneSchema,
  milestoneSchema,
} from '../schemas';
import type { ArtifactType } from '../types';
import { formatValidationErrors } from './error-formatter';

// Re-export error formatter utilities for external use
export {
  type FormattedValidationError,
  formatValidationErrors,
  getValidationErrorDetails,
} from './error-formatter';

/**
 * Validator for Kodebase artifacts
 * Provides validation and type detection for artifact objects
 * @class ArtifactValidator
 * @method validateInitiative
 * @method validateMilestone
 * @method validateIssue
 * @method validate
 * @method getArtifactType
 * @method formatZodError
 */
export class ArtifactValidator {
  /**
   * Validate an object as an Initiative
   * @param data - Unknown data to validate
   * @returns Validated Initiative object
   * @throws Error if validation fails
   */
  validateInitiative(data: unknown): InitiativeSchema {
    try {
      return initiativeSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Initiative validation failed: ${this.formatZodError(error)}`,
        );
      }
      throw error;
    }
  }

  /**
   * Validate an object as a Milestone
   * @param data - Unknown data to validate
   * @returns Validated Milestone object
   * @throws Error if validation fails
   */
  validateMilestone(data: unknown): MilestoneSchema {
    try {
      return milestoneSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Milestone validation failed: ${this.formatZodError(error)}`,
        );
      }
      throw error;
    }
  }

  /**
   * Validate an object as an Issue
   * @param data - Unknown data to validate
   * @returns Validated Issue object
   * @throws Error if validation fails
   */
  validateIssue(data: unknown): IssueSchema {
    try {
      return issueSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Issue validation failed: ${this.formatZodError(error)}`,
        );
      }
      throw error;
    }
  }

  /**
   * Validate an object by auto-detecting its type
   * @param data - Unknown data to validate
   * @returns Validated artifact object
   * @throws Error if type cannot be determined or validation fails
   */
  validate(data: unknown): ArtifactSchema {
    const type = this.getArtifactType(data);

    if (!type) {
      throw new Error('Unable to determine artifact type from data structure');
    }

    switch (type) {
      case 'initiative':
        return this.validateInitiative(data);
      case 'milestone':
        return this.validateMilestone(data);
      case 'issue':
        return this.validateIssue(data);
      default:
        throw new Error(`Unknown artifact type: ${type}`);
    }
  }

  /**
   * Determine the artifact type from data structure
   * @param data - Unknown data to analyze
   * @returns Artifact type or null if cannot be determined
   */
  getArtifactType(data: unknown): ArtifactType | null {
    if (!data || typeof data !== 'object' || !('content' in data)) {
      return null;
    }

    const content = (data as Record<string, unknown>).content;
    if (!content || typeof content !== 'object') {
      return null;
    }

    // Check for initiative fields
    if (
      'vision' in content &&
      'scope' in content &&
      'success_criteria' in content
    ) {
      return 'initiative';
    }

    // Check for milestone fields
    if ('deliverables' in content && 'validation' in content) {
      return 'milestone';
    }

    // Check for issue fields
    if ('acceptance_criteria' in content) {
      return 'issue';
    }

    return null;
  }

  /**
   * Format Zod validation errors into readable messages
   * @param error - Zod validation error
   * @returns Formatted error message
   * @deprecated Use formatValidationErrors from error-formatter module for enhanced messages
   */
  private formatZodError(error: z.ZodError): string {
    return formatValidationErrors(error);
  }
}
