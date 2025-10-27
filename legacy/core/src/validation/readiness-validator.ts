/**
 * Readiness validation engine for Kodebase artifacts
 *
 * This module implements the rule-based validation engine that enforces
 * readiness rules for Issues, Milestones, and Initiatives.
 */

import type {
  ArtifactSchema,
  InitiativeSchema,
  IssueSchema,
  MilestoneSchema,
} from '../data/schemas';
import type { ArtifactType } from '../data/types';
import { CArtifact, CArtifactEvent } from '../data/types/constants';

/**
 * Validation result for a single artifact
 */
export interface ValidationResult {
  artifactId: string;
  artifactType: ArtifactType;
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

/**
 * Structure for validation errors
 */
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  fixable?: boolean;
}

/**
 * Structure for validation warnings
 */
export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}

/**
 * Dependency graph node for cycle detection
 */
interface DependencyNode {
  id: string;
  dependencies: string[];
  visited?: boolean;
  inStack?: boolean;
}

/**
 * Readiness validation rules for artifacts
 */
export class ReadinessValidator {
  private artifactCache: Map<string, ArtifactSchema> = new Map();

  /**
   * Validate an Issue for readiness
   */
  validateIssueReadiness(
    issue: IssueSchema,
    issueId: string,
    allArtifacts?: Map<string, ArtifactSchema>,
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields validation
    if (!issue.metadata.title || issue.metadata.title.trim().length === 0) {
      errors.push({
        code: 'ISSUE_MISSING_TITLE',
        message: 'Issue must have a title',
        field: 'metadata.title',
        fixable: false,
      });
    }

    if (!issue.content.summary || issue.content.summary.trim().length === 0) {
      errors.push({
        code: 'ISSUE_MISSING_SUMMARY',
        message: 'Issue must have a summary',
        field: 'content.summary',
        fixable: false,
      });
    }

    if (
      !issue.content.acceptance_criteria ||
      issue.content.acceptance_criteria.length === 0
    ) {
      errors.push({
        code: 'ISSUE_MISSING_ACCEPTANCE_CRITERIA',
        message: 'Issue must have at least one acceptance criterion',
        field: 'content.acceptance_criteria',
        fixable: false,
      });
    }

    // Metadata validation
    if (!issue.metadata.priority) {
      errors.push({
        code: 'ISSUE_MISSING_PRIORITY',
        message: 'Issue must have a priority',
        field: 'metadata.priority',
        fixable: false,
      });
    }

    if (!issue.metadata.estimation) {
      errors.push({
        code: 'ISSUE_MISSING_ESTIMATION',
        message: 'Issue must have an estimation',
        field: 'metadata.estimation',
        fixable: false,
      });
    }

    if (!issue.metadata.created_by) {
      errors.push({
        code: 'ISSUE_MISSING_CREATOR',
        message: 'Issue must have a creator',
        field: 'metadata.created_by',
        fixable: false,
      });
    }

    if (!issue.metadata.assignee) {
      errors.push({
        code: 'ISSUE_MISSING_ASSIGNEE',
        message: 'Issue must have an assignee',
        field: 'metadata.assignee',
        fixable: false,
      });
    }

    // Dependency validation
    if (allArtifacts && issue.metadata.relationships?.blocked_by?.length > 0) {
      for (const blockedById of issue.metadata.relationships.blocked_by) {
        const blockingArtifact = allArtifacts.get(blockedById);
        if (!blockingArtifact) {
          errors.push({
            code: 'ISSUE_INVALID_DEPENDENCY',
            message: `Dependency ${blockedById} does not exist`,
            field: 'metadata.relationships.blocked_by',
            fixable: false,
          });
        } else {
          const currentStatus = this.getCurrentStatus(blockingArtifact);
          if (
            currentStatus !== CArtifactEvent.READY &&
            currentStatus !== CArtifactEvent.COMPLETED
          ) {
            errors.push({
              code: 'ISSUE_DEPENDENCY_NOT_READY',
              message: `Dependency ${blockedById} is not in ready state (current: ${currentStatus})`,
              field: 'metadata.relationships.blocked_by',
              fixable: false,
            });
          }
        }
      }
    }

    return {
      artifactId: issueId,
      artifactType: CArtifact.ISSUE,
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a Milestone for readiness
   */
  validateMilestoneReadiness(
    milestone: MilestoneSchema,
    milestoneId: string,
    allArtifacts?: Map<string, ArtifactSchema>,
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields validation
    if (
      !milestone.metadata.title ||
      milestone.metadata.title.trim().length === 0
    ) {
      errors.push({
        code: 'MILESTONE_MISSING_TITLE',
        message: 'Milestone must have a title',
        field: 'metadata.title',
        fixable: false,
      });
    }

    if (
      !milestone.content.deliverables ||
      milestone.content.deliverables.length === 0
    ) {
      errors.push({
        code: 'MILESTONE_MISSING_DELIVERABLES',
        message: 'Milestone must have at least one deliverable',
        field: 'content.deliverables',
        fixable: false,
      });
    }

    if (
      !milestone.content.validation ||
      milestone.content.validation.length === 0
    ) {
      errors.push({
        code: 'MILESTONE_MISSING_VALIDATION',
        message: 'Milestone must have at least one validation criterion',
        field: 'content.validation',
        fixable: false,
      });
    }

    // Child requirement validation
    if (allArtifacts) {
      const childIssues = this.findChildIssues(milestoneId, allArtifacts);

      if (!childIssues || childIssues.length === 0) {
        errors.push({
          code: 'MILESTONE_NO_CHILD_ISSUES',
          message: 'Milestone must have at least one child issue',
          fixable: false,
        });
      } else {
        const readyOrBlockedIssues = childIssues.filter((issue) => {
          const status = this.getCurrentStatus(issue);
          return (
            status === CArtifactEvent.READY || status === CArtifactEvent.BLOCKED
          );
        });

        if (readyOrBlockedIssues.length === 0) {
          errors.push({
            code: 'MILESTONE_NO_READY_CHILD_ISSUES',
            message:
              'Milestone must have at least one child issue in ready or blocked state',
            fixable: false,
          });
        }
      }
    }

    return {
      artifactId: milestoneId,
      artifactType: CArtifact.MILESTONE,
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate an Initiative for readiness
   */
  validateInitiativeReadiness(
    initiative: InitiativeSchema,
    initiativeId: string,
    allArtifacts?: Map<string, ArtifactSchema>,
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields validation
    if (
      !initiative.metadata.title ||
      initiative.metadata.title.trim().length === 0
    ) {
      errors.push({
        code: 'INITIATIVE_MISSING_TITLE',
        message: 'Initiative must have a title',
        field: 'metadata.title',
        fixable: false,
      });
    }

    if (
      !initiative.content.vision ||
      initiative.content.vision.trim().length === 0
    ) {
      errors.push({
        code: 'INITIATIVE_MISSING_VISION',
        message: 'Initiative must have a vision',
        field: 'content.vision',
        fixable: false,
      });
    }

    if (
      !initiative.content.scope ||
      initiative.content.scope.trim().length === 0
    ) {
      errors.push({
        code: 'INITIATIVE_MISSING_SCOPE',
        message: 'Initiative must have a scope',
        field: 'content.scope',
        fixable: false,
      });
    }

    if (
      !initiative.content.success_criteria ||
      initiative.content.success_criteria.length === 0
    ) {
      errors.push({
        code: 'INITIATIVE_MISSING_SUCCESS_CRITERIA',
        message: 'Initiative must have at least one success criterion',
        field: 'content.success_criteria',
        fixable: false,
      });
    }

    // Strategic alignment validation - success criteria must be measurable
    if (initiative.content.success_criteria) {
      const nonMeasurableCriteria = initiative.content.success_criteria.filter(
        (criterion) => !this.containsMetrics(criterion),
      );

      if (nonMeasurableCriteria.length > 0) {
        errors.push({
          code: 'INITIATIVE_NON_MEASURABLE_CRITERIA',
          message: 'All success criteria must be measurable (contain metrics)',
          field: 'content.success_criteria',
          fixable: false,
        });
      }
    }

    // Child requirement validation
    if (allArtifacts) {
      const childMilestones = this.findChildMilestones(
        initiativeId,
        allArtifacts,
      );

      if (!childMilestones || childMilestones.length === 0) {
        errors.push({
          code: 'INITIATIVE_NO_CHILD_MILESTONES',
          message: 'Initiative must have at least one child milestone',
          fixable: false,
        });
      } else {
        // Check if at least one milestone meets readiness criteria
        const readyMilestones = childMilestones.filter((milestone) => {
          const validation = this.validateMilestoneReadiness(
            milestone as MilestoneSchema,
            this.getArtifactId(milestone, allArtifacts),
            allArtifacts,
          );
          return validation.isValid;
        });

        if (readyMilestones.length === 0) {
          errors.push({
            code: 'INITIATIVE_NO_READY_CHILD_MILESTONES',
            message:
              'Initiative must have at least one child milestone meeting readiness criteria',
            fixable: false,
          });
        }
      }
    }

    return {
      artifactId: initiativeId,
      artifactType: CArtifact.INITIATIVE,
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detect circular dependencies in artifact relationships
   */
  detectCircularDependencies(
    artifacts: Map<string, ArtifactSchema>,
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const nodes: Map<string, DependencyNode> = new Map();

    // Build dependency graph
    for (const [id, artifact] of artifacts) {
      nodes.set(id, {
        id,
        dependencies: artifact.metadata.relationships?.blocked_by || [],
        visited: false,
        inStack: false,
      });
    }

    // DFS to detect cycles
    const detectCycle = (
      nodeId: string,
      path: string[] = [],
    ): string[] | null => {
      const node = nodes.get(nodeId);
      if (!node) return null;

      if (node.inStack) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        return path.slice(cycleStart).concat(nodeId);
      }

      if (node.visited) return null;

      node.visited = true;
      node.inStack = true;
      path.push(nodeId);

      for (const depId of node.dependencies) {
        const cycle = detectCycle(depId, [...path]);
        if (cycle) {
          node.inStack = false;
          return cycle;
        }
      }

      node.inStack = false;
      return null;
    };

    // Check each node for cycles
    for (const [nodeId] of nodes) {
      const node = nodes.get(nodeId)!;
      if (!node.visited) {
        const cycle = detectCycle(nodeId);
        if (cycle) {
          errors.push({
            code: 'CIRCULAR_DEPENDENCY',
            message: `Circular dependency detected: ${cycle.join(' → ')}`,
            fixable: false,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Detect cross-level relationships (e.g., issue depending on initiative)
   */
  detectCrossLevelRelationships(
    artifacts: Map<string, ArtifactSchema>,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const [id, artifact] of artifacts) {
      const artifactType = this.getArtifactType(artifact);
      const dependencies = artifact.metadata.relationships?.blocked_by || [];

      for (const depId of dependencies) {
        const dependency = artifacts.get(depId);
        if (dependency) {
          const depType = this.getArtifactType(dependency);

          // Check for invalid cross-level dependencies
          if (
            artifactType === CArtifact.ISSUE &&
            depType === CArtifact.INITIATIVE
          ) {
            errors.push({
              code: 'CROSS_LEVEL_DEPENDENCY',
              message: `Issue ${id} cannot depend on initiative ${depId}`,
              fixable: false,
            });
          } else if (artifactType === 'milestone' && depType === 'initiative') {
            errors.push({
              code: 'CROSS_LEVEL_DEPENDENCY',
              message: `Milestone ${id} cannot depend on initiative ${depId}`,
              fixable: false,
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Get the current status of an artifact
   */
  private getCurrentStatus(artifact: ArtifactSchema): string | null {
    const events = artifact.metadata.events;
    if (!events || events.length === 0) return null;

    // Get the latest event
    const lastEvent = events[events.length - 1];
    return lastEvent ? lastEvent.event : null;
  }

  /**
   * Find child issues for a milestone
   */
  private findChildIssues(
    milestoneId: string,
    artifacts: Map<string, ArtifactSchema>,
  ): IssueSchema[] {
    const childIssues: IssueSchema[] = [];
    const [initiative, milestone] = milestoneId.split('.');
    const issuePrefix = `${initiative}.${milestone}.`;

    for (const [id, artifact] of artifacts) {
      if (id.startsWith(issuePrefix) && this.isIssue(artifact)) {
        childIssues.push(artifact as IssueSchema);
      }
    }

    return childIssues;
  }

  /**
   * Find child milestones for an initiative
   */
  private findChildMilestones(
    initiativeId: string,
    artifacts: Map<string, ArtifactSchema>,
  ): MilestoneSchema[] {
    const childMilestones: MilestoneSchema[] = [];
    const milestonePrefix = `${initiativeId}.`;

    for (const [id, artifact] of artifacts) {
      if (
        id.startsWith(milestonePrefix) &&
        id.split('.').length === 2 &&
        this.isMilestone(artifact)
      ) {
        childMilestones.push(artifact as MilestoneSchema);
      }
    }

    return childMilestones;
  }

  /**
   * Check if a string contains metrics (numbers, percentages, etc.)
   */
  private containsMetrics(criterion: string): boolean {
    // Simple check for numbers, percentages, or metric keywords
    const metricPatterns = [
      /\d+/, // Any number
      /\d+%/, // Percentage
      /\b(increase|decrease|reduce|improve|achieve|reach|maintain)\b/i,
      /\b(target|goal|metric|measure|kpi|threshold)\b/i,
    ];

    return metricPatterns.some((pattern) => pattern.test(criterion));
  }

  /**
   * Get artifact type from schema
   */
  private getArtifactType(artifact: ArtifactSchema): ArtifactType {
    if (this.isInitiative(artifact)) return CArtifact.INITIATIVE;
    if (this.isMilestone(artifact)) return CArtifact.MILESTONE;
    if (this.isIssue(artifact)) return CArtifact.ISSUE;
    throw new Error('Unknown artifact type');
  }

  /**
   * Type guards
   */
  isInitiative(artifact: ArtifactSchema): artifact is InitiativeSchema {
    return (
      'vision' in artifact.content &&
      'scope' in artifact.content &&
      'success_criteria' in artifact.content
    );
  }

  isMilestone(artifact: ArtifactSchema): artifact is MilestoneSchema {
    return (
      'deliverables' in artifact.content && 'validation' in artifact.content
    );
  }

  isIssue(artifact: ArtifactSchema): artifact is IssueSchema {
    return (
      'acceptance_criteria' in artifact.content &&
      !('deliverables' in artifact.content)
    );
  }

  /**
   * Get artifact ID from the artifacts map
   */
  private getArtifactId(
    artifact: ArtifactSchema,
    artifacts: Map<string, ArtifactSchema>,
  ): string {
    for (const [id, a] of artifacts) {
      if (a === artifact) return id;
    }
    return 'unknown';
  }
}
