/**
 * Context Aggregator for CLI Bridge
 *
 * Aggregates context from multiple artifacts for milestone and initiative
 * completion summaries. Used to generate intelligent summaries based on
 * actual implementation details.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { glob } from 'glob';
import { parse as loadYaml } from 'yaml';
import type { ContextAggregationResult } from './types';
import { CLIBridgeError, CLIBridgeErrorType } from './types';

type AggregatedMilestone = {
  id: string;
  title: string;
  summary: string;
  deliverables: string[];
  validation: string[];
  completionSummary: {
    key_achievements: string[];
    knowledge_generated: string[];
  };
  status: string;
  issues: string[];
};

/**
 * Context aggregation manager
 */

// biome-ignore lint/complexity/noStaticOnlyClass: Makes sense for consistency
export class ContextAggregator {
  /**
   * Aggregate context for milestone completion summary
   */
  static async aggregateMilestoneContext(
    milestoneId: string,
    repoRoot: string,
    options: {
      includeCompletionAnalysis?: boolean;
      includeDevelopmentProcess?: boolean;
    } = {},
  ): Promise<ContextAggregationResult> {
    try {
      // Find all issues in the milestone
      const issuePattern = join(
        repoRoot,
        '.kodebase',
        'artifacts',
        '**',
        `${milestoneId}.*.yml`,
      );
      const issueFiles = await glob(issuePattern);

      const issues = [];
      const skippedArtifacts = [];

      for (const issueFile of issueFiles) {
        try {
          const issueContent = readFileSync(issueFile, 'utf-8');
          const issue = loadYaml(issueContent) as {
            metadata?: {
              title?: string;
              events?: Array<{ event: string; timestamp: string }>;
            };
            content?: { summary?: string; acceptance_criteria?: string[] };
            development_process?: unknown;
            completion_analysis?: unknown;
          };

          // Extract issue ID from filename
          const issueId = ContextAggregator.extractIssueIdFromPath(issueFile);

          if (issue && issueId) {
            issues.push({
              id: issueId,
              title: issue.metadata?.title || 'Untitled Issue',
              summary: issue.content?.summary || '',
              acceptanceCriteria: issue.content?.acceptance_criteria || [],
              developmentProcess: options.includeDevelopmentProcess
                ? (issue.development_process as {
                    alternatives_considered?: string[];
                  })
                : undefined,
              completionAnalysis: options.includeCompletionAnalysis
                ? (issue.completion_analysis as {
                    key_insights?: string[];
                    implementation_approach?: string;
                  })
                : undefined,
              status: ContextAggregator.getCurrentStatus(
                issue.metadata?.events || [],
              ),
            });
          }
        } catch (_error) {
          skippedArtifacts.push(issueFile);
        }
      }

      // Generate aggregated context
      const content = ContextAggregator.buildMilestoneContextContent(
        milestoneId,
        issues,
      );

      return {
        content,
        artifactCount: issues.length,
        includedArtifacts: issues.map((i) => i.id),
        skippedArtifacts,
      };
    } catch (error) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.CONTEXT_AGGREGATION_FAILED,
        `Failed to aggregate milestone context: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Aggregate context for initiative completion summary
   */
  static async aggregateInitiativeContext(
    initiativeId: string,
    repoRoot: string,
    options: {
      includeCompletionAnalysis?: boolean;
      includeDevelopmentProcess?: boolean;
    } = {},
  ): Promise<ContextAggregationResult> {
    try {
      // Find all milestones in the initiative (pattern: A.1.yml, A.2.yml, etc.)
      const milestonePattern = join(
        repoRoot,
        '.kodebase',
        'artifacts',
        '**',
        `${initiativeId}.[0-9].yml`,
      );
      const milestoneFiles = await glob(milestonePattern);

      const milestones: AggregatedMilestone[] = [];
      const skippedArtifacts = [];

      for (const milestoneFile of milestoneFiles) {
        try {
          const milestoneContent = readFileSync(milestoneFile, 'utf-8');
          const milestone = loadYaml(milestoneContent) as {
            metadata?: {
              title?: string;
              events?: Array<{ event: string; timestamp: string }>;
            };
            content?: {
              summary?: string;
              deliverables?: string[];
              validation?: string[];
            };
            completion_summary?: unknown;
          };

          // Extract milestone ID from filename
          const milestoneId =
            ContextAggregator.extractMilestoneIdFromPath(milestoneFile);

          if (milestone && milestoneId) {
            // Get milestone context including its issues
            const milestoneContext =
              await ContextAggregator.aggregateMilestoneContext(
                milestoneId,
                repoRoot,
                options,
              );

            milestones.push({
              id: milestoneId,
              title: milestone.metadata?.title || 'Untitled Milestone',
              summary: milestone.content?.summary || '',
              deliverables: milestone.content?.deliverables || [],
              validation: milestone.content?.validation || [],
              completionSummary: milestone.completion_summary as {
                key_achievements: string[];
                knowledge_generated: string[];
              },
              status: ContextAggregator.getCurrentStatus(
                milestone.metadata?.events || [],
              ),
              issues: milestoneContext.includedArtifacts,
            });
          }
        } catch (_error) {
          skippedArtifacts.push(milestoneFile);
        }
      }

      // Generate aggregated context
      const content = ContextAggregator.buildInitiativeContextContent(
        initiativeId,
        milestones,
      );

      return {
        content,
        artifactCount: milestones.length,
        includedArtifacts: milestones.map((m) => m.id),
        skippedArtifacts,
      };
    } catch (error) {
      throw new CLIBridgeError(
        CLIBridgeErrorType.CONTEXT_AGGREGATION_FAILED,
        `Failed to aggregate initiative context: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Extract issue ID from file path
   */
  private static extractIssueIdFromPath(filePath: string): string | null {
    const filename = filePath.split('/').pop();
    if (!filename) return null;

    // Match pattern like A.1.5.issue-title.yml
    const match = filename.match(/^([A-Z]\.\d+\.\d+)\./);
    return match?.[1] ?? null;
  }

  /**
   * Extract milestone ID from file path
   */
  private static extractMilestoneIdFromPath(filePath: string): string | null {
    const filename = filePath.split('/').pop();
    if (!filename) return null;

    // Match pattern like A.1.milestone-title.yml
    const match = filename.match(/^([A-Z]\.\d+)\./);
    return match?.[1] ?? null;
  }

  /**
   * Get current status from events
   */
  private static getCurrentStatus(
    events: Array<{ event: string; timestamp: string }>,
  ): string {
    if (!events || events.length === 0) return 'draft';

    // Find the latest event by timestamp
    const sortedEvents = events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return sortedEvents[0]?.event || 'draft';
  }

  /**
   * Build milestone context content
   */
  private static buildMilestoneContextContent(
    milestoneId: string,
    issues: Array<{
      id: string;
      title: string;
      summary: string;
      acceptanceCriteria: string[];
      status: string;
      completionAnalysis?: {
        key_insights?: string[];
        implementation_approach?: string;
      };
      developmentProcess?: { alternatives_considered?: string[] };
    }>,
  ): string {
    const sections = [
      `# Milestone ${milestoneId} Context`,
      '',
      `## Overview`,
      `This milestone contains ${issues.length} issues.`,
      '',
      `## Issues Summary`,
    ];

    for (const issue of issues) {
      sections.push(`### ${issue.id}: ${issue.title}`);
      sections.push(`**Status:** ${issue.status}`);
      sections.push(`**Summary:** ${issue.summary}`);

      if (issue.acceptanceCriteria?.length > 0) {
        sections.push(`**Acceptance Criteria:**`);
        for (const criteria of issue.acceptanceCriteria) {
          sections.push(`- ${criteria}`);
        }
      }

      if (issue.completionAnalysis) {
        sections.push(`**Key Insights:**`);
        for (const insight of issue.completionAnalysis.key_insights || []) {
          sections.push(`- ${insight}`);
        }

        if (issue.completionAnalysis.implementation_approach) {
          sections.push(
            `**Implementation Approach:** ${issue.completionAnalysis.implementation_approach}`,
          );
        }
      }

      if (issue.developmentProcess?.alternatives_considered?.length) {
        sections.push(`**Alternatives Considered:**`);
        for (const alternative of issue.developmentProcess
          .alternatives_considered) {
          sections.push(`- ${alternative}`);
        }
      }

      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Build initiative context content
   */
  private static buildInitiativeContextContent(
    initiativeId: string,
    milestones: AggregatedMilestone[],
  ): string {
    const sections = [
      `# Initiative ${initiativeId} Context`,
      '',
      `## Overview`,
      `This initiative contains ${milestones.length} milestones.`,
      '',
      `## Milestones Summary`,
    ];

    for (const milestone of milestones) {
      sections.push(`### ${milestone.id}: ${milestone.title}`);
      sections.push(`**Status:** ${milestone.status}`);
      sections.push(`**Summary:** ${milestone.summary}`);
      sections.push(`**Issues:** ${milestone.issues.join(', ')}`);

      if (milestone.deliverables?.length > 0) {
        sections.push(`**Deliverables:**`);
        for (const deliverable of milestone.deliverables) {
          sections.push(`- ${deliverable}`);
        }
      }

      if (milestone.completionSummary) {
        sections.push(`**Key Achievements:**`);
        for (const achievement of milestone.completionSummary
          .key_achievements || []) {
          sections.push(`- ${achievement}`);
        }

        if (milestone.completionSummary.knowledge_generated?.length > 0) {
          sections.push(`**Knowledge Generated:**`);
          for (const knowledge of milestone.completionSummary
            .knowledge_generated) {
            sections.push(`- ${knowledge}`);
          }
        }
      }

      sections.push('');
    }

    return sections.join('\n');
  }
}
