/**
 * Artifact Factory for Kodebase
 *
 * Provides factory methods to create valid artifacts with:
 * - Auto-generated sequential IDs (A, B, C... for initiatives)
 * - Auto-populated metadata fields
 * - Initial draft events with proper timestamps and actors
 * - Parent validation for hierarchical artifacts
 */

import type { Initiative, Issue, Milestone } from '../../data/types';
import {
  CArtifactEvent,
  CEstimationSize,
  CPriority,
} from '../../data/types/constants';
import { formatActor } from '../../utils/actor';
import { createEvent } from '../events/builder';
import {
  createFactoryContext,
  generateInitiativeId,
  generateIssueId,
  generateMilestoneId,
  validateIdUnique,
  validateParentExists,
} from './id-generator';
import type {
  CreateInitiativeOptions,
  CreateIssueOptions,
  CreateMilestoneOptions,
  FactoryContext,
  FactoryResult,
} from './types';

/**
 * Artifact Factory Class
 *
 * Creates valid Kodebase artifacts with auto-generated IDs and populated metadata.
 * Follows the MVP principle - only implements what's required by the acceptance criteria.
 */
export class ArtifactFactory {
  private context: FactoryContext;

  /**
   * Creates a new artifact factory
   *
   * @param existingArtifacts - Map of existing artifact IDs to artifacts for validation
   */
  constructor(existingArtifacts: Map<string, unknown> = new Map()) {
    this.context = createFactoryContext(existingArtifacts);
  }

  /**
   * Creates a new Initiative with auto-generated ID
   *
   * @param options - Initiative creation options
   * @returns Factory result with the created initiative and its ID
   * @throws Error if validation fails
   *
   * @example
   * ```typescript
   * const factory = new ArtifactFactory(existingArtifacts);
   * const result = factory.createInitiative({
   *   user: { name: 'John Doe', email: 'john@example.com' },
   *   title: 'Core Platform Development',
   *   vision: 'Build a scalable platform',
   *   scope: 'Backend APIs and core services',
   *   success_criteria: ['APIs deployed', 'Performance targets met']
   * });
   * // result.id = 'A' (or next available letter)
   * ```
   */
  createInitiative(
    options: CreateInitiativeOptions,
  ): FactoryResult<Initiative> {
    // Generate unique ID
    const id = generateInitiativeId(this.context);
    validateIdUnique(id, this.context);

    // Create formatted actor
    const actor = formatActor(options.user.name, options.user.email);

    // Create initial draft event
    const draftEvent = createEvent({
      event: CArtifactEvent.DRAFT,
      actor,
    });

    // Build the initiative
    const initiative: Initiative = {
      metadata: {
        title: options.title,
        priority: options.priority || CPriority.MEDIUM,
        estimation: options.estimation || CEstimationSize.L, // Initiatives default to Large
        created_by: actor,
        assignee: actor,
        schema_version: options.schema_version || '0.2.0',
        relationships: {
          blocks: [],
          blocked_by: options.blocked_by || [],
        },
        events: [draftEvent],
      },
      content: {
        vision: options.vision,
        scope: options.scope,
        success_criteria: options.success_criteria,
      },
    };

    // Add notes if provided
    if (options.notes) {
      initiative.notes = options.notes;
    }

    // Update context to include new ID
    this.context.existingIds.add(id);

    return {
      artifact: initiative,
      id,
    };
  }

  /**
   * Creates a new Milestone with auto-generated ID
   *
   * @param options - Milestone creation options
   * @returns Factory result with the created milestone and its ID
   * @throws Error if parent initiative doesn't exist or validation fails
   *
   * @example
   * ```typescript
   * const result = factory.createMilestone({
   *   user: { name: 'John Doe', email: 'john@example.com' },
   *   title: 'API Foundation',
   *   parent_initiative_id: 'A',
   *   summary: 'Core API infrastructure',
   *   deliverables: ['REST API', 'Authentication'],
   *   validation: ['All endpoints tested', 'Performance benchmarks met']
   * });
   * // result.id = 'A.1' (or next number under initiative A)
   * ```
   */
  createMilestone(options: CreateMilestoneOptions): FactoryResult<Milestone> {
    // Validate parent exists
    validateParentExists(
      options.parent_initiative_id,
      this.context,
      'initiative',
    );

    // Generate unique ID
    const id = generateMilestoneId(options.parent_initiative_id, this.context);
    validateIdUnique(id, this.context);

    // Create formatted actor
    const actor = formatActor(options.user.name, options.user.email);

    // Create initial draft event
    const draftEvent = createEvent({
      event: CArtifactEvent.DRAFT,
      actor,
    });

    // Build the milestone
    const milestone: Milestone = {
      metadata: {
        title: options.title,
        priority: options.priority || CPriority.MEDIUM,
        estimation: options.estimation || CEstimationSize.M, // Milestones default to Medium
        created_by: actor,
        assignee: actor,
        schema_version: options.schema_version || '0.2.0',
        relationships: {
          blocks: [],
          blocked_by: options.blocked_by || [],
        },
        events: [draftEvent],
      },
      content: {
        summary: options.summary,
        deliverables: options.deliverables,
        validation: options.validation,
      },
    };

    // Add notes if provided
    if (options.notes) {
      milestone.notes = options.notes;
    }

    // Update context to include new ID
    this.context.existingIds.add(id);

    return {
      artifact: milestone,
      id,
    };
  }

  /**
   * Creates a new Issue with auto-generated ID
   *
   * @param options - Issue creation options
   * @returns Factory result with the created issue and its ID
   * @throws Error if parent milestone doesn't exist or validation fails
   *
   * @example
   * ```typescript
   * const result = factory.createIssue({
   *   user: { name: 'John Doe', email: 'john@example.com' },
   *   title: 'Implement user authentication',
   *   parent_milestone_id: 'A.1',
   *   summary: 'Add secure user authentication system',
   *   acceptance_criteria: [
   *     'Users can register with email/password',
   *     'Users can login and receive JWT token',
   *     'Sessions expire after 24 hours'
   *   ]
   * });
   * // result.id = 'A.1.1' (or next number under milestone A.1)
   * ```
   */
  createIssue(options: CreateIssueOptions): FactoryResult<Issue> {
    // Validate parent exists
    validateParentExists(
      options.parent_milestone_id,
      this.context,
      'milestone',
    );

    // Generate unique ID
    const id = generateIssueId(options.parent_milestone_id, this.context);
    validateIdUnique(id, this.context);

    // Create formatted actor
    const actor = formatActor(options.user.name, options.user.email);

    // Create initial draft event
    const draftEvent = createEvent({
      event: CArtifactEvent.DRAFT,
      actor,
    });

    // Build the issue
    const issue: Issue = {
      metadata: {
        title: options.title,
        priority: options.priority || CPriority.MEDIUM,
        estimation: options.estimation || CEstimationSize.S, // Issues default to Small
        created_by: actor,
        assignee: actor,
        schema_version: options.schema_version || '0.2.0',
        relationships: {
          blocks: [],
          blocked_by: options.blocked_by || [],
        },
        events: [draftEvent],
      },
      content: {
        summary: options.summary,
        acceptance_criteria: options.acceptance_criteria,
      },
    };

    // Add notes if provided
    if (options.notes) {
      issue.notes = options.notes;
    }

    // Update context to include new ID
    this.context.existingIds.add(id);

    return {
      artifact: issue,
      id,
    };
  }

  /**
   * Updates the factory context with additional existing artifacts
   *
   * @param newArtifacts - Map of new artifact IDs to artifacts
   */
  updateContext(newArtifacts: Map<string, unknown>): void {
    const newContext = createFactoryContext(
      new Map([
        ...Array.from(this.context.existingIds).map(
          (id) => [id, {}] as [string, unknown],
        ),
        ...Array.from(newArtifacts.entries()),
      ]),
    );
    this.context = newContext;
  }

  /**
   * Gets the current factory context (useful for debugging)
   *
   * @returns Current factory context
   */
  getContext(): FactoryContext {
    return { ...this.context };
  }
}
