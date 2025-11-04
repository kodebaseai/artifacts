/**
 * High-level service for cascade automation operations.
 *
 * Provides methods for executing three types of cascades:
 * - **Completion Cascade**: When all children complete → parent moves to in_review
 * - **Readiness Cascade**: When blocker completes → dependents become ready
 * - **Progress Cascade**: When first child starts → parent moves to in_progress
 *
 * This service wraps the low-level {@link https://github.com/kodebase-org/kodebase/tree/main/packages/core/src/automation/cascade | CascadeEngine}
 * from `@kodebase/core` and provides orchestration for artifact workflows.
 *
 * @module cascade-service
 * @see {@link https://github.com/kodebase-org/kodebase/blob/main/.kodebase/docs/specs/git-ops/cascade-system.md | Cascade System Specification}
 * @see {@link https://github.com/kodebase-org/kodebase/blob/main/.kodebase/docs/specs/git-ops/adr/ADR-001-cascade-engine-integration.md | ADR-001: Cascade Engine Integration}
 */

import type { TAnyArtifact } from "@kodebase/core";
import { CascadeEngine } from "@kodebase/core";

import { ArtifactService } from "./artifact-service.js";
import { DependencyGraphService } from "./dependency-graph-service.js";
import { QueryService } from "./query-service.js";

/**
 * Result of a cascade operation containing updated artifacts and events.
 */
export interface CascadeResult {
  /**
   * List of artifacts that were modified during the cascade.
   * Contains the full artifact objects with updated event histories.
   */
  updatedArtifacts: TAnyArtifact[];

  /**
   * List of events that were added during the cascade.
   * Each event includes the artifact ID it was applied to.
   */
  events: Array<{
    /** The artifact ID this event was added to */
    artifactId: string;
    /** The event type (e.g., 'in_progress', 'in_review', 'ready') */
    event: string;
    /** ISO 8601 timestamp when the event occurred */
    timestamp: string;
    /** Actor who triggered the cascade (e.g., 'System Cascade (cascade@completion)') */
    actor: string;
    /** What triggered this event (e.g., 'children_completed', 'dependencies_met') */
    trigger: string;
  }>;
}

/**
 * Options for executing a completion cascade.
 */
export interface CompletionCascadeOptions {
  /**
   * The artifact ID that just completed.
   * Used to find parent and check if all siblings are complete.
   */
  artifactId: string;

  /**
   * What triggered this cascade (e.g., 'pr_merged', 'manual_completion').
   * Will be recorded in event metadata.
   */
  trigger: string;

  /**
   * Optional actor override. Defaults to 'System Cascade (cascade@completion)'.
   */
  actor?: string;

  /**
   * Optional base directory for artifact resolution.
   * Defaults to process.cwd().
   */
  baseDir?: string;
}

/**
 * Options for executing a readiness cascade.
 */
export interface ReadinessCascadeOptions {
  /**
   * The artifact ID that just completed, potentially unblocking dependents.
   */
  completedArtifactId: string;

  /**
   * What triggered this cascade (e.g., 'dependencies_met', 'blocker_completed').
   * Optional - not used in implementation, provided for API consistency.
   */
  trigger?: string;

  /**
   * Optional actor override. Defaults to 'System Cascade (cascade@dependency-resolution)'.
   */
  actor?: string;

  /**
   * Optional base directory for artifact resolution.
   * Defaults to process.cwd().
   */
  baseDir?: string;
}

/**
 * Options for executing a progress cascade.
 */
export interface ProgressCascadeOptions {
  /**
   * The artifact ID that just started (transitioned to in_progress).
   */
  artifactId: string;

  /**
   * What triggered this cascade (e.g., 'branch_created', 'children_started').
   */
  trigger: string;

  /**
   * Optional actor override. Defaults to 'System Cascade (cascade@progress)'.
   */
  actor?: string;

  /**
   * Optional base directory for artifact resolution.
   * Defaults to process.cwd().
   */
  baseDir?: string;
}

/**
 * Options for executing all cascades in sequence.
 */
export interface ExecuteCascadesOptions {
  /**
   * The artifact ID that changed state.
   */
  artifactId: string;

  /**
   * What triggered this cascade operation.
   */
  trigger: string;

  /**
   * Optional actor override for all cascade events.
   */
  actor?: string;

  /**
   * Optional base directory for artifact resolution.
   * Defaults to process.cwd().
   */
  baseDir?: string;
}

/**
 * Service for executing cascade operations across artifact hierarchies.
 *
 * CascadeService provides high-level orchestration for three types of cascades:
 *
 * 1. **Completion Cascade** - When all sibling artifacts complete, parent moves to in_review
 * 2. **Readiness Cascade** - When a blocker completes, dependent artifacts become ready
 * 3. **Progress Cascade** - When first child starts, parent moves to in_progress
 *
 * @example Basic completion cascade
 * ```typescript
 * const cascadeService = new CascadeService();
 *
 * // When artifact A.1.5 completes (e.g., PR merged)
 * const result = await cascadeService.executeCompletionCascade({
 *   artifactId: 'A.1.5',
 *   trigger: 'pr_merged',
 * });
 *
 * console.log(`Updated ${result.updatedArtifacts.length} artifacts`);
 * console.log(`Added ${result.events.length} events`);
 * ```
 *
 * @example Readiness cascade after blocker completes
 * ```typescript
 * // When artifact B.2 (a blocker) completes
 * const result = await cascadeService.executeReadinessCascade({
 *   completedArtifactId: 'B.2',
 *   trigger: 'dependencies_met',
 * });
 *
 * // All artifacts blocked by B.2 are now checked
 * // Those with all dependencies resolved → ready
 * ```
 *
 * @example Progress cascade when starting work
 * ```typescript
 * // When checking out branch for A.1.1
 * const result = await cascadeService.executeProgressCascade({
 *   artifactId: 'A.1.1',
 *   trigger: 'branch_created',
 * });
 *
 * // If A.1.1 is first child to start, parent A.1 → in_progress
 * ```
 *
 * @example Execute all cascades at once
 * ```typescript
 * // Run all three cascades in correct order
 * const result = await cascadeService.executeCascades({
 *   artifactId: 'A.1.5',
 *   trigger: 'pr_merged',
 * });
 * ```
 */
export class CascadeService {
  private engine: CascadeEngine;
  private artifactService: ArtifactService;
  private queryService: QueryService;
  private dependencyGraphService: DependencyGraphService;

  /**
   * Creates a new CascadeService instance.
   *
   * @param options - Optional service dependencies for dependency injection
   * @param options.artifactService - Custom artifact service (defaults to new instance)
   * @param options.queryService - Custom query service (defaults to new instance)
   * @param options.dependencyGraphService - Custom dependency graph service (defaults to new instance)
   */
  constructor(options?: {
    artifactService?: ArtifactService;
    queryService?: QueryService;
    dependencyGraphService?: DependencyGraphService;
  }) {
    this.engine = new CascadeEngine();
    this.artifactService = options?.artifactService ?? new ArtifactService();
    this.queryService = options?.queryService ?? new QueryService();
    this.dependencyGraphService =
      options?.dependencyGraphService ?? new DependencyGraphService();
  }

  /**
   * Execute completion cascade when artifact completes.
   *
   * Checks if parent should move to in_review when all sibling artifacts are complete.
   * This is typically triggered after a PR is merged.
   *
   * **Algorithm:**
   * 1. Load the completed artifact
   * 2. Find parent artifact ID
   * 3. Load all sibling artifacts (children of parent)
   * 4. Check if all siblings are in 'completed' state
   * 5. If yes, add 'in_review' event to parent
   *
   * **Idempotency:** Safe to call multiple times. If parent is already in_review or beyond,
   * no changes are made.
   *
   * @param options - Completion cascade options
   * @returns Result containing updated artifacts and events
   *
   * @example
   * ```typescript
   * // After merging PR for issue A.1.5
   * const result = await cascadeService.executeCompletionCascade({
   *   artifactId: 'A.1.5',
   *   trigger: 'pr_merged',
   *   actor: 'Git Hook (hook@post-merge)',
   * });
   *
   * if (result.updatedArtifacts.length > 0) {
   *   console.log(`Parent A.1 moved to in_review`);
   * }
   * ```
   */
  async executeCompletionCascade(
    options: CompletionCascadeOptions,
  ): Promise<CascadeResult> {
    const result: CascadeResult = {
      updatedArtifacts: [],
      events: [],
    };

    const { artifactId, actor, baseDir } = options;

    // 1. Extract parent ID from artifact ID
    const parentId = this.getParentId(artifactId);
    if (!parentId) {
      // No parent (top-level initiative), nothing to cascade
      return result;
    }

    // 2-4. Use QueryService to load parent and siblings (it handles slug resolution)
    const queryService = new QueryService(baseDir);
    let parent: TAnyArtifact;
    let parentSlug: string;
    let siblings: Array<{ id: string; artifact: TAnyArtifact }>;
    try {
      // Load siblings (which also verifies parent exists)
      siblings = await queryService.getChildren(parentId);

      // Load parent artifact using QueryService (no slug needed)
      const ancestors = await queryService.getAncestors(artifactId);
      const parentArtifact = ancestors.find((a) => a.id === parentId);
      if (!parentArtifact) {
        throw new Error(`Parent ${parentId} not found in ancestors`);
      }
      parent = parentArtifact.artifact;

      // Extract slug from directory path by checking the filesystem
      // Use loadAllArtifactPaths to get all paths, then find parent's path
      const { loadAllArtifactPaths, getArtifactIdFromPath } = await import(
        "@kodebase/core"
      );
      const artifactsRoot = `${baseDir}/.kodebase/artifacts`;
      const allPaths = await loadAllArtifactPaths(artifactsRoot);

      // Find the path for the parent artifact
      const parentPath = allPaths.find((p) => {
        const id = getArtifactIdFromPath(p);
        return id === parentId;
      });

      if (!parentPath) {
        throw new Error(`Parent ${parentId} path not found in artifact paths`);
      }

      // Extract directory name from path
      // Path format: /base/.kodebase/artifacts/A.slug/A.1.slug/A.1.yml
      const pathParts = parentPath.split("/");
      const parentDirName = pathParts[pathParts.length - 2]; // Get directory name before file

      // Extract slug from directory name (format: ID.slug)
      if (!parentDirName?.startsWith(`${parentId}.`)) {
        throw new Error(
          `Invalid directory format for ${parentId}: ${parentDirName}`,
        );
      }
      parentSlug = parentDirName.substring(parentId.length + 1);
    } catch {
      // Parent doesn't exist, cannot cascade
      return result;
    }

    // 5. Get parent's current state
    const parentState = this.getCurrentState(parent);
    if (!parentState) {
      // Parent has no events, cannot determine state
      return result;
    }

    // Parent must be in_progress to cascade to in_review
    if (parentState !== "in_progress") {
      // Parent not started yet or already in_review/completed
      return result;
    }

    // 6. Use CascadeEngine to check if parent should cascade
    const decision = this.engine.shouldCascadeToParent(
      siblings.map((s) => s.artifact),
      parentState,
    );

    if (!decision.shouldCascade) {
      // Not all siblings are done, or other blocking condition
      return result;
    }

    // 7. Generate cascade event using CascadeEngine
    const cascadeEvent = this.engine.generateCascadeEvent(
      decision.newState, // "in_review"
      {
        event: "completed",
        actor: actor ?? "System Cascade (cascade@completion)",
        timestamp: new Date().toISOString(),
      },
      "completion_cascade",
    );

    // 8. Append in_review event to parent
    await this.artifactService.appendEvent({
      id: parentId,
      slug: parentSlug,
      event: cascadeEvent,
      baseDir,
    });

    // 9. Reload parent to get updated artifact (using QueryService to avoid slug issues)
    const reloadedAncestors = await queryService.getAncestors(artifactId);
    const reloadedParent = reloadedAncestors.find((a) => a.id === parentId);
    if (!reloadedParent) {
      throw new Error(`Failed to reload parent ${parentId} after cascade`);
    }
    const updatedParent = reloadedParent.artifact;

    // 10. Add to result
    result.updatedArtifacts.push(updatedParent);
    result.events.push({
      artifactId: parentId,
      event: cascadeEvent.event,
      timestamp: cascadeEvent.timestamp,
      actor: cascadeEvent.actor,
      trigger: cascadeEvent.trigger,
    });

    return result;
  }

  /**
   * Extract parent ID from artifact ID.
   * @param artifactId - The artifact ID (e.g., "A.1.5")
   * @returns Parent ID (e.g., "A.1") or null if top-level
   */
  private getParentId(artifactId: string): string | null {
    const parts = artifactId.split(".");
    if (parts.length === 1) {
      // Top-level initiative (e.g., "A")
      return null;
    }
    parts.pop(); // Remove last segment
    return parts.join(".");
  }

  /**
   * Get current state from artifact's event history.
   * @param artifact - The artifact to check
   * @returns Current state or null if no events
   */
  private getCurrentState(artifact: TAnyArtifact): string | null {
    const events = artifact.metadata.events;
    if (!events || events.length === 0) {
      return null;
    }
    const lastEvent = events[events.length - 1];
    return lastEvent?.event ?? null;
  }

  /**
   * Execute readiness cascade when blocker completes.
   *
   * Finds all artifacts blocked by the completed artifact and transitions them to 'ready'
   * if all their dependencies are now resolved.
   *
   * **Algorithm:**
   * 1. Find all artifacts that list this artifact as a blocker
   * 2. For each dependent:
   *    - Check if it's in 'blocked' state
   *    - Mark this dependency as resolved
   *    - If all dependencies resolved, add 'ready' event
   *
   * **Idempotency:** Safe to call multiple times. Already-resolved dependencies are skipped.
   *
   * @param options - Readiness cascade options
   * @returns Result containing updated artifacts and events
   *
   * @example
   * ```typescript
   * // After milestone B.2 completes
   * const result = await cascadeService.executeReadinessCascade({
   *   completedArtifactId: 'B.2',
   *   trigger: 'dependencies_met',
   *   actor: 'System Cascade (cascade@dependency-resolution)',
   * });
   *
   * console.log(`Unblocked ${result.updatedArtifacts.length} artifacts`);
   * ```
   */
  async executeReadinessCascade(
    options: ReadinessCascadeOptions,
  ): Promise<CascadeResult> {
    const result: CascadeResult = {
      updatedArtifacts: [],
      events: [],
    };

    const {
      completedArtifactId,
      actor = "System Cascade (cascade@dependency-resolution)",
      baseDir,
    } = options;

    // 1. Find all artifacts blocked by this completed artifact
    // Create fresh DependencyGraphService to avoid stale cache
    const depGraphService = new DependencyGraphService(baseDir);
    let blockedArtifacts: Array<{ id: string; artifact: TAnyArtifact }>;
    try {
      blockedArtifacts =
        await depGraphService.getBlockedArtifacts(completedArtifactId);
    } catch {
      // Artifact doesn't exist or has no dependents
      return result;
    }

    // If no artifacts are blocked by this one, nothing to cascade
    if (blockedArtifacts.length === 0) {
      return result;
    }

    // 2. For each dependent artifact, resolve the dependency
    const timestamp = new Date().toISOString();

    // Load artifact paths once for performance (used in slug extraction)
    const {
      loadAllArtifactPaths,
      getArtifactIdFromPath,
      resolveArtifactPaths,
      writeArtifact,
    } = await import("@kodebase/core");
    const artifactsRoot = `${baseDir}/.kodebase/artifacts`;
    const allPaths = await loadAllArtifactPaths(artifactsRoot);

    for (const {
      id: dependentId,
      artifact: dependentArtifact,
    } of blockedArtifacts) {
      // Use CascadeEngine to resolve the dependency
      const resolution = this.engine.resolveDependencyCompletion(
        dependentArtifact,
        {
          dependencyId: completedArtifactId,
          resolutionTimestamp: timestamp,
          actor,
        },
      );

      // If no update needed (already resolved, no blocked event, etc.), skip
      if (!resolution.updated) {
        continue;
      }

      // Find the path for the dependent artifact
      const dependentPath = allPaths.find((p) => {
        const id = getArtifactIdFromPath(p);
        return id === dependentId;
      });

      if (!dependentPath) {
        // Skip this dependent if we can't find its path
        continue;
      }

      // Extract slug from directory name
      const pathParts = dependentPath.split("/");
      const dependentDirName = pathParts[pathParts.length - 2];

      if (!dependentDirName?.startsWith(`${dependentId}.`)) {
        // Skip if invalid directory format
        continue;
      }
      const dependentSlug = dependentDirName.substring(dependentId.length + 1);

      // 3. Merge the updated events back into the full artifact
      // CascadeEngine returns a CascadeChild (metadata only), but we need the full artifact
      const updatedArtifact: TAnyArtifact = {
        ...dependentArtifact,
        metadata: resolution.artifact.metadata,
      };

      // 4. Write the updated artifact to disk
      const { filePath } = await resolveArtifactPaths({
        id: dependentId,
        slug: dependentSlug,
        baseDir,
      });
      await writeArtifact(filePath, updatedArtifact);

      // 5. Track the updated artifact
      result.updatedArtifacts.push(updatedArtifact);

      // 6. If a ready event was added, track it
      if (resolution.readyEventAdded) {
        const readyEvent =
          updatedArtifact.metadata.events[
            updatedArtifact.metadata.events.length - 1
          ];
        if (readyEvent) {
          result.events.push({
            artifactId: dependentId,
            event: readyEvent.event,
            timestamp: readyEvent.timestamp,
            actor: readyEvent.actor,
            trigger: readyEvent.trigger,
          });
        }
      }
    }

    return result;
  }

  /**
   * Execute progress cascade when first child starts.
   *
   * Moves parent to 'in_progress' state when the first child artifact transitions
   * to in_progress. This is typically triggered by the post-checkout hook.
   *
   * **Algorithm:**
   * 1. Load the started artifact
   * 2. Find parent artifact ID
   * 3. Check if parent is in 'draft' or 'ready' state
   * 4. If yes, add 'in_progress' event to parent
   *
   * **Idempotency:** Safe to call multiple times. If parent is already in_progress or beyond,
   * no changes are made.
   *
   * @param options - Progress cascade options
   * @returns Result containing updated artifacts and events
   *
   * @example
   * ```typescript
   * // After checking out branch for first issue in milestone
   * const result = await cascadeService.executeProgressCascade({
   *   artifactId: 'A.1.1',
   *   trigger: 'branch_created',
   *   actor: 'Git Hook (hook@post-checkout)',
   * });
   *
   * if (result.updatedArtifacts.length > 0) {
   *   console.log(`Parent A.1 started automatically`);
   * }
   * ```
   */
  async executeProgressCascade(
    options: ProgressCascadeOptions,
  ): Promise<CascadeResult> {
    const result: CascadeResult = {
      updatedArtifacts: [],
      events: [],
    };

    const { artifactId, actor, baseDir } = options;

    // 1. Extract parent ID from artifact ID
    const parentId = this.getParentId(artifactId);
    if (!parentId) {
      // No parent (top-level initiative), nothing to cascade
      return result;
    }

    // 2-4. Use QueryService to load parent and siblings (it handles slug resolution)
    const queryService = new QueryService(baseDir);
    let parent: TAnyArtifact;
    let parentSlug: string;
    let siblings: Array<{ id: string; artifact: TAnyArtifact }>;
    try {
      // Load siblings (which also verifies parent exists)
      siblings = await queryService.getChildren(parentId);

      // Load parent artifact using QueryService (no slug needed)
      const ancestors = await queryService.getAncestors(artifactId);
      const parentArtifact = ancestors.find((a) => a.id === parentId);
      if (!parentArtifact) {
        throw new Error(`Parent ${parentId} not found in ancestors`);
      }
      parent = parentArtifact.artifact;

      // Extract slug from directory path by checking the filesystem
      // Use loadAllArtifactPaths to get all paths, then find parent's path
      const { loadAllArtifactPaths, getArtifactIdFromPath } = await import(
        "@kodebase/core"
      );
      const artifactsRoot = `${baseDir}/.kodebase/artifacts`;
      const allPaths = await loadAllArtifactPaths(artifactsRoot);

      // Find the path for the parent artifact
      const parentPath = allPaths.find((p) => {
        const id = getArtifactIdFromPath(p);
        return id === parentId;
      });

      if (!parentPath) {
        throw new Error(`Parent ${parentId} path not found in artifact paths`);
      }

      // Extract directory name from path
      // Path format: /base/.kodebase/artifacts/A.slug/A.1.slug/A.1.yml
      const pathParts = parentPath.split("/");
      const parentDirName = pathParts[pathParts.length - 2]; // Get directory name before file

      // Extract slug from directory name (format: ID.slug)
      if (!parentDirName?.startsWith(`${parentId}.`)) {
        throw new Error(
          `Invalid directory format for ${parentId}: ${parentDirName}`,
        );
      }
      parentSlug = parentDirName.substring(parentId.length + 1);
    } catch {
      // Parent doesn't exist, cannot cascade
      return result;
    }

    // 5. Get parent's current state
    const parentState = this.getCurrentState(parent);
    if (!parentState) {
      // Parent has no events, cannot determine state
      return result;
    }

    // Parent must be ready to cascade to in_progress
    if (parentState !== "ready") {
      // Parent not ready (already started or still in draft)
      return result;
    }

    // 6. Use CascadeEngine to check if parent should cascade
    const decision = this.engine.shouldCascadeToParent(
      siblings.map((s) => s.artifact),
      parentState,
    );

    if (!decision.shouldCascade) {
      // No child has started yet
      return result;
    }

    // 7. Generate cascade event using CascadeEngine
    const cascadeEvent = this.engine.generateCascadeEvent(
      decision.newState, // "in_progress"
      {
        event: "in_progress",
        actor: actor ?? "System Cascade (cascade@progress)",
        timestamp: new Date().toISOString(),
      },
      "progress_cascade",
    );

    // 8. Append in_progress event to parent
    await this.artifactService.appendEvent({
      id: parentId,
      slug: parentSlug,
      event: cascadeEvent,
      baseDir,
    });

    // 9. Reload parent to get updated artifact (using QueryService to avoid slug issues)
    const reloadedAncestors = await queryService.getAncestors(artifactId);
    const reloadedParent = reloadedAncestors.find((a) => a.id === parentId);
    if (!reloadedParent) {
      throw new Error(`Failed to reload parent ${parentId} after cascade`);
    }
    const updatedParent = reloadedParent.artifact;

    // 10. Add to result
    result.updatedArtifacts.push(updatedParent);
    result.events.push({
      artifactId: parentId,
      event: cascadeEvent.event,
      timestamp: cascadeEvent.timestamp,
      actor: cascadeEvent.actor,
      trigger: cascadeEvent.trigger,
    });

    return result;
  }

  /**
   * Execute all cascades in correct order.
   *
   * Runs all three cascade types in the proper sequence:
   * 1. Progress Cascade (first child starts → parent in_progress)
   * 2. Completion Cascade (all children done → parent in_review)
   * 3. Readiness Cascade (blocker done → dependents ready)
   *
   * This is the recommended method for git hooks to ensure all cascades
   * are properly executed.
   *
   * **Idempotency:** Safe to call multiple times. Each cascade is idempotent.
   *
   * @param options - Options for all cascades
   * @returns Combined result from all cascades
   *
   * @example
   * ```typescript
   * // In post-merge hook after PR merged
   * const result = await cascadeService.executeCascades({
   *   artifactId: 'A.1.5',
   *   trigger: 'pr_merged',
   *   actor: 'Git Hook (hook@post-merge)',
   * });
   *
   * console.log(`Total updates: ${result.updatedArtifacts.length}`);
   * console.log(`Total events: ${result.events.length}`);
   * ```
   */
  async executeCascades(
    options: ExecuteCascadesOptions,
  ): Promise<CascadeResult> {
    const { artifactId, trigger, actor, baseDir } = options;

    // Initialize combined result
    const combinedResult: CascadeResult = {
      updatedArtifacts: [],
      events: [],
    };

    // Determine which cascades to run based on trigger
    // Progress triggers (branch_created, work_started, etc.) → progress cascade only
    // Completion triggers (pr_merged, manual_completion, etc.) → completion then readiness
    const isProgressTrigger =
      trigger === "branch_created" ||
      trigger === "work_started" ||
      trigger === "children_started";

    if (isProgressTrigger) {
      // Progress cascade: parent ready → in_progress when first child starts
      const progressResult = await this.executeProgressCascade({
        artifactId,
        trigger,
        actor,
        baseDir,
      });

      // Merge progress results
      combinedResult.updatedArtifacts.push(...progressResult.updatedArtifacts);
      combinedResult.events.push(...progressResult.events);
    } else {
      // Completion flow: run completion cascade then readiness cascade

      // 1. Completion cascade: parent in_progress → in_review when all children done
      const completionResult = await this.executeCompletionCascade({
        artifactId,
        trigger,
        actor,
        baseDir,
      });

      // Merge completion results
      combinedResult.updatedArtifacts.push(
        ...completionResult.updatedArtifacts,
      );
      combinedResult.events.push(...completionResult.events);

      // 2. Readiness cascade: unblock dependents when this artifact completes
      // Run readiness cascade for the original artifact AND any parents that were updated
      const completedArtifactIds = [
        artifactId,
        ...completionResult.events.map((e) => e.artifactId),
      ];

      for (const completedId of completedArtifactIds) {
        const readinessResult = await this.executeReadinessCascade({
          completedArtifactId: completedId,
          actor,
          baseDir,
        });

        // Merge readiness results
        combinedResult.updatedArtifacts.push(
          ...readinessResult.updatedArtifacts,
        );
        combinedResult.events.push(...readinessResult.events);
      }
    }

    return combinedResult;
  }
}
