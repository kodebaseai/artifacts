/**
 * Artifact parser for Kodebase
 */

import { parse } from 'yaml';
import { z } from 'zod';
import {
  type InitiativeSchema,
  type IssueSchema,
  initiativeSchema,
  issueSchema,
  type MilestoneSchema,
  milestoneSchema,
} from '../schemas';
import { formatValidationErrors } from '../validator/error-formatter';

/**
 * Parser for Kodebase artifacts
 * Handles YAML parsing and schema validation for artifact files
 * @class ArtifactParser
 * @description Parser for Kodebase artifacts
 * @returns ArtifactParser
 */
export class ArtifactParser {
  /**
   * Parse a YAML string into a JavaScript object
   * @param content - YAML string content
   * @returns Parsed JavaScript object
   * @throws Error if YAML syntax is invalid
   * @returns Parsed JavaScript object
   */
  parseYaml(content: string): unknown {
    // Validate input
    if (typeof content !== 'string') {
      throw new Error('YAML content must be a string');
    }

    if (!content.trim()) {
      throw new Error('Cannot parse empty YAML content');
    }

    try {
      return parse(content);
    } catch (error) {
      throw new Error(
        `Invalid YAML syntax: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Parse and validate an Initiative YAML string
   * @param content - Initiative YAML string
   * @returns Validated Initiative object
   * @throws Error if parsing fails or validation fails
   * @returns Validated Initiative object
   */
  parseInitiative(content: string): InitiativeSchema {
    const rawData = this.parseYaml(content);

    try {
      return initiativeSchema.parse(rawData);
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
   * Parse and validate a Milestone YAML string
   * @param content - Milestone YAML string
   * @returns Validated Milestone object
   * @throws Error if parsing fails or validation fails
   * @returns Validated Milestone object
   */
  parseMilestone(content: string): MilestoneSchema {
    const rawData = this.parseYaml(content);

    try {
      return milestoneSchema.parse(rawData);
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
   * Parse and validate an Issue YAML string
   * @param content - Issue YAML string
   * @returns Validated Issue object
   * @throws Error if parsing fails or validation fails
   * @returns Validated Issue object
   */
  parseIssue(content: string): IssueSchema {
    const rawData = this.parseYaml(content);

    try {
      return issueSchema.parse(rawData);
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
   * Format Zod validation errors into readable messages
   * @param error - Zod validation error
   * @returns Formatted error message
   * @throws Error if Zod validation fails
   * @deprecated Use formatValidationErrors from error-formatter module for enhanced messages
   */
  private formatZodError(error: z.ZodError): string {
    return formatValidationErrors(error);
  }
}
