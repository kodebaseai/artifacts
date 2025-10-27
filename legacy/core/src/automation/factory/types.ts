/**
 * Artifact Factory Types
 *
 * Type definitions for the artifact factory system that creates valid artifacts
 * with auto-generated IDs, timestamps, and populated metadata fields.
 */

import type { Artifact, TEstimationSize, TPriority } from '../../data/types';

/**
 * User information from git config
 */
export interface UserInfo {
  name: string;
  email: string;
}

/**
 * Base options for all factory methods
 */
export interface BaseFactoryOptions {
  /** User information from git config */
  user: UserInfo;
  /** Optional priority (defaults to 'medium') */
  priority?: TPriority;
  /** Optional estimation (defaults based on artifact type) */
  estimation?: TEstimationSize;
  /** Optional schema version (defaults to '0.2.0') */
  schema_version?: string;
  /** Optional notes */
  notes?: string;
}

/**
 * Options for creating an Initiative
 */
export interface CreateInitiativeOptions extends BaseFactoryOptions {
  /** Human-readable title */
  title: string;
  /** Long-term vision and strategic purpose */
  vision: string;
  /** What is included and excluded from this initiative */
  scope: string;
  /** Measurable criteria for initiative success */
  success_criteria: string[];
  /** Optional blocked_by relationships */
  blocked_by?: string[];
}

/**
 * Options for creating a Milestone
 */
export interface CreateMilestoneOptions extends BaseFactoryOptions {
  /** Human-readable title */
  title: string;
  /** Parent initiative ID (e.g., 'A', 'B') */
  parent_initiative_id: string;
  /** Summary of the milestone */
  summary: string;
  /** List of deliverables */
  deliverables: string[];
  /** Validation criteria */
  validation: string[];
  /** Optional blocked_by relationships */
  blocked_by?: string[];
}

/**
 * Options for creating an Issue
 */
export interface CreateIssueOptions extends BaseFactoryOptions {
  /** Human-readable title */
  title: string;
  /** Parent milestone ID (e.g., 'A.1', 'B.2') */
  parent_milestone_id: string;
  /** Issue summary */
  summary: string;
  /** Acceptance criteria */
  acceptance_criteria: string[];
  /** Optional blocked_by relationships */
  blocked_by?: string[];
}

/**
 * Factory result containing the artifact and its generated ID
 */
export interface FactoryResult<T extends Artifact> {
  /** The generated artifact */
  artifact: T;
  /** The auto-generated ID */
  id: string;
}

/**
 * Factory context for ID generation
 */
export interface FactoryContext {
  /** Map of existing artifact IDs for collision detection */
  existingIds: Set<string>;
  /** Map of initiative ID to milestone count for ID generation */
  initiativeMilestoneCount: Map<string, number>;
  /** Map of milestone ID to issue count for ID generation */
  milestoneIssueCount: Map<string, number>;
}

/**
 * Validation error when parent doesn't exist
 */
export class ParentNotFoundError extends Error {
  constructor(parentId: string, parentType: string) {
    super(
      `Parent ${parentType} '${parentId}' not found. Parent must exist before creating children.`,
    );
    this.name = 'ParentNotFoundError';
  }
}

/**
 * Validation error when ID already exists
 */
export class DuplicateIdError extends Error {
  constructor(id: string) {
    super(`Artifact ID '${id}' already exists. IDs must be unique.`);
    this.name = 'DuplicateIdError';
  }
}
