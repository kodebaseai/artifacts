/**
 * Artifact-specific schemas for Kodebase
 */

import { z } from 'zod';
import { artifactMetadataSchema } from './base';

// ============================================================================
// Initiative Schemas
// ============================================================================

/**
 * Initiative content schema
 *
 * Defines the required content for strategic initiatives.
 * Initiatives represent high-level goals and strategic direction.
 * @property vision - The vision of the initiative
 * @property scope - The scope of the initiative
 * @property success_criteria - The success criteria for the initiative
 */
const initiativeContentSchema = z.object({
  vision: z.string().min(10, 'Vision must be at least 10 characters'),
  scope: z.string().min(10, 'Scope must be at least 10 characters'),
  success_criteria: z
    .array(
      z.string().min(5, 'Each success criterion must be at least 5 characters'),
    )
    .min(1, 'At least one success criterion is required'),
});

const initiativeCompletionSummarySchema = z
  .object({
    business_impact: z
      .string()
      .min(1, 'Business impact is required when completing an initiative'),
    strategic_achievements: z
      .array(z.string())
      .min(1, 'At least one strategic achievement is required'),
    organizational_learning: z
      .array(z.string())
      .min(1, 'Organizational learning is required'),
    architecture_evolution: z
      .array(z.string())
      .min(1, 'At least one strategic achievement is required'),
    future_roadmap_impact: z
      .array(z.string())
      .min(1, 'At least one strategic achievement is required'),
  })
  .optional();

/**
 * Complete Initiative schema
 *
 * Combines metadata, content, and optional sections for a full initiative artifact.
 * @property metadata - The metadata for the initiative
 * @property content - The content for the initiative
 * @property completion_summary - The completion summary for the initiative
 * @property notes - The notes for the initiative
 */
export const initiativeSchema = z.object({
  metadata: artifactMetadataSchema,
  content: initiativeContentSchema,
  completion_summary: initiativeCompletionSummarySchema,
  notes: z
    .union([
      z.string(),
      z.record(z.unknown()), // More flexible to allow arrays and nested objects
    ])
    .optional(),
});

// ============================================================================
// Milestone Schemas
// ============================================================================

/**
 * Milestone content schema
 *
 * Defines the required content for milestones.
 * Milestones represent major deliverables within initiatives.
 * @property summary - The summary of the milestone
 * @property deliverables - The deliverables of the milestone
 * @property validation - The validation criteria for the milestone
 */
const milestoneContentSchema = z.object({
  summary: z.string().min(1, 'Summary is required'),
  deliverables: z
    .array(z.string())
    .min(1, 'At least one deliverable is required'),
  validation: z
    .array(z.string())
    .min(1, 'At least one validation criterion is required'),
});

const milestoneCompletionSummarySchema = z
  .object({
    key_achievements: z
      .array(z.string())
      .min(1, 'At least one key achievement is required'),
    strategic_decisions: z.array(z.string()).optional(),
    knowledge_generated: z
      .array(z.string())
      .min(1, 'At least one knowledge item is required'),
    team_impact: z
      .array(z.string())
      .min(1, 'At least one knowledge item is required'),
    next_milestone_insights: z
      .array(z.string())
      .min(1, 'At least one knowledge item is required'),
  })
  .optional();

/**
 * Complete Milestone schema
 *
 * Combines metadata, content, and optional sections for a full milestone artifact.
 * @property metadata - The metadata for the milestone
 * @property content - The content for the milestone
 * @property completion_summary - The completion summary for the milestone
 * @property notes - The notes for the milestone
 * @property issue_breakdown_rationale - The rationale for the issue breakdown
 */
export const milestoneSchema = z.object({
  metadata: artifactMetadataSchema,
  content: milestoneContentSchema,
  completion_summary: milestoneCompletionSummarySchema,
  notes: z
    .union([
      z.string(),
      z.record(z.unknown()), // More flexible to allow arrays and nested objects
    ])
    .optional(),
  issue_breakdown_rationale: z.string().optional(),
});

// ============================================================================
// Issue Schemas
// ============================================================================

/**
 * Schema for acceptance criteria supporting multiple formats:
 * 1. Simple strings (legacy format): ["requirement 1", "requirement 2"]
 * 2. Nested structures with arrays: [{"Category": ["item 1", "item 2"]}]
 * 3. Nested structures with single values: [{"Category": "single item"}]
 * 4. Deeply nested structures: [{"Category": {"Subcategory": ["item 1", "item 2"]}}]
 * 5. Mixed content at any level
 * This maintains backward compatibility while enabling flexible organization
 */
// Using z.ZodTypeAny to avoid circular type reference issues
const acceptanceCriterionSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.string(), // Base case: simple string
    z.array(acceptanceCriterionSchema), // Array of criteria
    z.record(acceptanceCriterionSchema), // Object with nested criteria
  ]),
);

/**
 * Issue content schema
 *
 * Defines the required content for issues.
 * Issues represent atomic units of work with clear acceptance criteria.
 * @property summary - The summary of the issue
 * @property acceptance_criteria - The acceptance criteria (backward compatible)
 */
const issueContentSchema = z.object({
  summary: z.string().min(1, 'Summary is required'),
  acceptance_criteria: z
    .array(acceptanceCriterionSchema)
    .min(1, 'At least one acceptance criterion is required'),
});

/**
 * Challenge-solution pair schema
 *
 * Structured format for documenting problems encountered and their resolutions.
 * This format enables better knowledge capture and searchability.
 * @property challenge - The challenge description
 * @property solution - The solution description
 */
const challengeSchema = z.object({
  challenge: z.string().min(1, 'Challenge description is required'),
  solution: z.string().min(1, 'Solution description is required'),
});

const issueDevelopmentProcessSchema = z
  .object({
    spikes_generated: z.array(z.string()).optional(),
    alternatives_considered: z
      .array(z.string())
      .min(
        1,
        'At least one alternative must be documented when using development_process',
      ),
    challenges_encountered: z.array(challengeSchema).optional(),
  })
  .optional();

const issueCompletionAnalysisSchema = z
  .object({
    key_insights: z.union([z.string(), z.array(z.string())]).optional(),
    implementation_approach: z
      .union([z.string(), z.array(z.string())])
      .optional(),
    knowledge_generated: z.union([z.string(), z.array(z.string())]).optional(),
    manual_testing_steps: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .optional();

const issueReviewDetailsSchema = z
  .object({
    url: z.string().url('Review URL must be a valid URL').optional(),
    approved_by: z.array(z.string()).optional(),
  })
  .optional();

/**
 * Complete Issue schema
 *
 * Combines metadata, content, and optional sections for a full issue artifact.
 *
 * @remarks
 * The technical_approach field is deprecated in favor of completion_analysis.implementation_approach
 * @property metadata - The metadata for the issue
 * @property content - The content for the issue
 * @property development_process - The development process for the issue
 * @property completion_analysis - The completion analysis for the issue
 * @property review_details - The review details for the issue
 * @property notes - The notes for the issue
 */
export const issueSchema = z.object({
  metadata: artifactMetadataSchema,
  content: issueContentSchema,
  development_process: issueDevelopmentProcessSchema,
  completion_analysis: issueCompletionAnalysisSchema,
  review_details: issueReviewDetailsSchema,
  notes: z
    .union([
      z.string(),
      z.record(z.unknown()), // More flexible to allow arrays and nested objects
    ])
    .optional(),
  technical_approach: z.string().optional(), // Deprecated
});

// ============================================================================
// Type Exports
// ============================================================================

/**
 * TypeScript types inferred from schemas
 * These provide compile-time type safety matching the runtime validation
 * @property InitiativeSchema - The schema for an initiative
 * @property MilestoneSchema - The schema for a milestone
 * @property IssueSchema - The schema for an issue
 * @property ArtifactSchema - The schema for an artifact
 */
export type InitiativeSchema = z.infer<typeof initiativeSchema>;
export type MilestoneSchema = z.infer<typeof milestoneSchema>;
export type IssueSchema = z.infer<typeof issueSchema>;
export type ArtifactSchema = InitiativeSchema | MilestoneSchema | IssueSchema;
