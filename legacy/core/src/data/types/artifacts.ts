/**
 * Artifact-specific types for Kodebase
 */

import type { ArtifactMetadata } from './base';

// ============================================================================
// Initiative Types
// ============================================================================

/**
 * Initiative content structure
 *
 * Defines the strategic content for initiatives.
 * Initiatives represent high-level goals and organizational direction.
 * @property vision - The vision of the initiative
 * @property scope - The scope of the initiative
 * @property success_criteria - The success criteria for the initiative
 */
export interface InitiativeContent {
  /** Long-term vision and strategic purpose */
  vision: string;
  /** What is included and excluded from this initiative */
  scope: string;
  /** Measurable criteria for initiative success */
  success_criteria: string[];
}

/**
 * Initiative completion summary (filled when completed)
 * @property business_impact - The business impact of the initiative
 * @property strategic_achievements - The strategic achievements of the initiative
 * @property organizational_learning - The organizational learning from the initiative
 * @property architecture_evolution - The architecture evolution of the initiative
 * @property future_roadmap_impact - The future roadmap impact of the initiative
 */
export interface InitiativeCompletionSummary {
  business_impact?: string;
  strategic_achievements?: string[];
  organizational_learning?: string[];
  architecture_evolution?: string[];
  future_roadmap_impact?: string[];
}

/**
 * Complete Initiative artifact structure
 * @property metadata - The metadata for the initiative
 * @property content - The content for the initiative
 * @property completion_summary - The completion summary for the initiative
 * @property notes - The notes for the initiative
 */
export interface Initiative {
  metadata: ArtifactMetadata;
  content: InitiativeContent;
  completion_summary?: InitiativeCompletionSummary;
  notes?: string | Record<string, string>;
}

/**
 * Milestone content structure
 * @property summary - The summary of the milestone
 * @property deliverables - The deliverables of the milestone
 * @property validation - The validation criteria for the milestone
 */
export interface MilestoneContent {
  summary: string;
  deliverables: string[];
  validation: string[];
}

/**
 * Milestone completion summary (filled when completed)
 * @property key_achievements - The key achievements of the milestone
 * @property strategic_decisions - The strategic decisions of the milestone
 * @property knowledge_generated - The knowledge generated from the milestone
 * @property team_impact - The team impact of the milestone
 * @property next_milestone_insights - The insights for the next milestone
 */
export interface MilestoneCompletionSummary {
  key_achievements?: string[];
  strategic_decisions?: string[];
  knowledge_generated?: string[];
  team_impact?: string[];
  next_milestone_insights?: string[];
}

/**
 * Complete Milestone artifact structure
 * @property metadata - The metadata for the milestone
 * @property content - The content for the milestone
 * @property completion_summary - The completion summary for the milestone
 * @property notes - The notes for the milestone
 * @property issue_breakdown_rationale - The rationale for the issue breakdown
 */
export interface Milestone {
  metadata: ArtifactMetadata;
  content: MilestoneContent;
  completion_summary?: MilestoneCompletionSummary;
  notes?: string | Record<string, string>;
  issue_breakdown_rationale?: string;
}

/**
 * Acceptance criteria can be either:
 * 1. Simple string (legacy/simple format)
 * 2. Array of acceptance criteria (nested lists)
 * 3. Object with nested criteria (hierarchical format)
 * This maintains backward compatibility while supporting arbitrary nesting depth
 */
export type AcceptanceCriterion = string | AcceptanceCriterionNested;

interface AcceptanceCriterionNested {
  [key: string]: AcceptanceCriterion | AcceptanceCriterion[];
}

/**
 * Issue content structure
 * @property summary - The summary of the issue
 * @property acceptance_criteria - The acceptance criteria for the issue (supports nested structures)
 */
export interface IssueContent {
  summary: string;
  acceptance_criteria: AcceptanceCriterion[];
}

/**
 * Challenge and solution structure
 * @property challenge - The challenge description
 * @property solution - The solution description
 */
export interface Challenge {
  challenge: string;
  solution: string;
}

/**
 * Issue development process tracking
 * @property spikes_generated - The spikes generated for the issue
 * @property alternatives_considered - The alternatives considered for the issue
 * @property challenges_encountered - The challenges encountered for the issue
 */
export interface IssueDevelopmentProcess {
  spikes_generated?: string[];
  alternatives_considered?: string[];
  challenges_encountered?: Challenge[];
}

/**
 * Issue completion analysis (filled when completed)
 * @property key_insights - The key insights from the issue
 * @property implementation_approach - The implementation approach for the issue
 * @property knowledge_generated - The knowledge generated from the issue
 * @property manual_testing_steps - The manual testing steps for the issue
 */
export interface IssueCompletionAnalysis {
  key_insights?: string[];
  implementation_approach?: string[];
  knowledge_generated?: string[];
  manual_testing_steps?: string[];
}

/**
 * Issue review details
 * @property url - The URL of the review
 * @property approved_by - The actors who approved the issue
 */
export interface IssueReviewDetails {
  url?: string;
  approved_by?: string[];
}

/**
 * Complete Issue artifact structured
 * @property metadata - The metadata for the issue
 * @property content - The content for the issue
 * @property development_process - The development process for the issue
 * @property completion_analysis - The completion analysis for the issue
 * @property review_details - The review details for the issue
 * @property notes - The notes for the issue
 * @property technical_approach - The technical approach for the issue
 */
export interface Issue {
  metadata: ArtifactMetadata;
  content: IssueContent;
  development_process?: IssueDevelopmentProcess;
  completion_analysis?: IssueCompletionAnalysis;
  review_details?: IssueReviewDetails;
  notes?: string | Record<string, string>;
  technical_approach?: string; // Deprecated, use completion_analysis.implementation_approach
}

/**
 * Union type for all artifact types
 * @property Artifact - The union type for all artifact types
 */
export type Artifact = Initiative | Milestone | Issue;
