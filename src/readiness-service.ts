/**
 * Service for validating artifact readiness and state transitions.
 *
 * Determines whether artifacts are ready to work on by checking:
 * 1. No incomplete blocking siblings (via DependencyGraphService)
 * 2. ALL ancestors in READY or IN_PROGRESS state (ONLY if artifact already has a READY event)
 *
 * @module readiness-service
 */

import {
  CArtifact,
  CArtifactEvent,
  canTransition,
  type TAnyArtifact,
  type TArtifactEvent,
  type TArtifactType,
} from "@kodebase/core";

import { DependencyGraphService } from "./dependency-graph-service.js";
import { ArtifactNotFoundError } from "./errors.js";
import {
  type ArtifactTreeNode,
  type ArtifactWithId,
  QueryService,
} from "./query-service.js";

/**
 * Represents a reason why an artifact is not ready to work on.
 */
export interface BlockingReason {
  /** The type of blocking condition */
  type: "incomplete_dependencies" | "incomplete_parent" | "invalid_state";
  /** Human-readable explanation */
  message: string;
  /** Related artifact IDs (dependencies or parent) */
  relatedArtifacts?: string[];
}

/**
 * Service for readiness validation and state transition checks.
 *
 * Integrates with DependencyGraphService and QueryService to determine
 * if artifacts are ready to work on based on dependency completion and
 * parent state.
 *
 * @example
 * ```ts
 * const readinessService = new ReadinessService("/path/to/project");
 *
 * // Check if artifact is ready
 * const isReady = await readinessService.isReady("A.1.3");
 *
 * // Get all ready artifacts
 * const readyArtifacts = await readinessService.getReadyArtifacts();
 *
 * // Understand blocking reasons
 * const reasons = await readinessService.getBlockingReasons("A.1.2");
 *
 * // Validate state transition
 * const canStart = await readinessService.canTransitionToInProgress("A.1.1");
 * ```
 */
export class ReadinessService {
  /** Dependency graph service for analyzing blocking relationships */
  private readonly depService: DependencyGraphService;

  /** Query service for retrieving artifact information */
  private readonly queryService: QueryService;

  /**
   * Creates a new ReadinessService instance.
   *
   * @param baseDir - Base directory of the project (defaults to process.cwd())
   */
  constructor(baseDir: string = process.cwd()) {
    this.depService = new DependencyGraphService(baseDir);
    this.queryService = new QueryService(baseDir);
  }

  /**
   * Checks if an artifact is ready to work on.
   *
   * An artifact is ready if:
   * 1. It has no incomplete blocking siblings (checked via DependencyGraphService.isBlocked)
   * 2. If it has a READY event, ALL ancestors must be in READY or IN_PROGRESS state
   *
   * @param id - The artifact ID
   * @returns True if ready to work on
   * @throws {ArtifactNotFoundError} If artifact doesn't exist
   *
   * @example
   * ```ts
   * const isReady = await readinessService.isReady("A.1.3");
   * if (isReady) {
   *   console.log("Artifact is ready to start work");
   * }
   * ```
   */
  async isReady(id: string): Promise<boolean> {
    // Check if artifact is blocked by dependencies (siblings)
    const isBlocked = await this.depService.isBlocked(id);
    if (isBlocked) {
      return false;
    }

    // Load artifact to check for READY event
    const artifactWithId = await this.loadArtifact(id);
    const ancestors = await this.queryService.getAncestors(id);

    // Check if artifact has a READY event
    if (this.hasReadyEvent(artifactWithId.artifact)) {
      // Only check ancestor states if artifact has READY event
      // ALL ancestors must be in ready or in_progress state
      for (const ancestor of ancestors) {
        if (this.isParentBlocking(ancestor.artifact)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Returns all artifacts that are ready to work on.
   *
   * Filters all artifacts using isReady() check. Skips terminal states
   * (completed, cancelled, archived) for performance.
   *
   * @returns Array of ready artifacts with IDs
   *
   * @example
   * ```ts
   * const readyArtifacts = await readinessService.getReadyArtifacts();
   * console.log(`${readyArtifacts.length} artifacts ready to work on`);
   * ```
   */
  async getReadyArtifacts(): Promise<ArtifactWithId[]> {
    const tree = await this.queryService.getTree();
    const allIds = this.flattenTree(tree);

    const readyArtifacts: ArtifactWithId[] = [];

    for (const id of allIds) {
      try {
        const artifactWithId = await this.loadArtifact(id);
        const currentState = this.getCurrentState(artifactWithId.artifact);

        // Skip terminal states for performance
        if (
          currentState === CArtifactEvent.COMPLETED ||
          currentState === CArtifactEvent.CANCELLED ||
          currentState === CArtifactEvent.ARCHIVED
        ) {
          continue;
        }

        const ready = await this.isReady(id);
        if (ready) {
          readyArtifacts.push(artifactWithId);
        }
      } catch (error) {
        // Skip artifacts that can't be loaded
        console.warn(`Failed to check readiness for ${id}:`, error);
      }
    }

    return readyArtifacts;
  }

  /**
   * Explains why an artifact is not ready.
   *
   * Returns array of blocking reasons:
   * - incomplete_dependencies: Has blocking siblings that are not completed
   * - incomplete_parent: Has READY event but one or more ancestors are not in READY/IN_PROGRESS state
   * - invalid_state: Already completed, cancelled, or archived
   *
   * @param id - The artifact ID
   * @returns Array of blocking reasons (empty if ready)
   * @throws {ArtifactNotFoundError} If artifact doesn't exist
   *
   * @example
   * ```ts
   * const reasons = await readinessService.getBlockingReasons("A.1.2");
   * for (const reason of reasons) {
   *   console.log(`${reason.type}: ${reason.message}`);
   * }
   * ```
   */
  async getBlockingReasons(id: string): Promise<BlockingReason[]> {
    const reasons: BlockingReason[] = [];

    const artifactWithId = await this.loadArtifact(id);
    const currentState = this.getCurrentState(artifactWithId.artifact);

    // Check for terminal states
    if (
      currentState === CArtifactEvent.COMPLETED ||
      currentState === CArtifactEvent.CANCELLED ||
      currentState === CArtifactEvent.ARCHIVED
    ) {
      reasons.push({
        type: "invalid_state",
        message: `Artifact is in terminal state: ${currentState}`,
        relatedArtifacts: [],
      });
      return reasons;
    }

    // Check dependencies (siblings)
    const isBlocked = await this.depService.isBlocked(id);
    if (isBlocked) {
      const deps = await this.depService.getDependencies(id);
      const incompleteDeps = deps.filter(
        (d) => !this.hasCompletedEvent(d.artifact),
      );
      reasons.push({
        type: "incomplete_dependencies",
        message: `Blocked by ${incompleteDeps.length} incomplete ${incompleteDeps.length === 1 ? "dependency" : "dependencies"}`,
        relatedArtifacts: incompleteDeps.map((d) => d.id),
      });
    }

    // Check ancestors (only if has READY event)
    // ALL ancestors must be in ready or in_progress state
    if (this.hasReadyEvent(artifactWithId.artifact)) {
      const ancestors = await this.queryService.getAncestors(id);
      for (const ancestor of ancestors) {
        if (this.isParentBlocking(ancestor.artifact)) {
          const ancestorState = this.getCurrentState(ancestor.artifact);
          reasons.push({
            type: "incomplete_parent",
            message: `Ancestor ${ancestor.id} is in blocking state: ${ancestorState}`,
            relatedArtifacts: [ancestor.id],
          });
        }
      }
    }

    return reasons;
  }

  /**
   * Validates if artifact can transition from ready to in_progress.
   *
   * Checks:
   * 1. Artifact is in READY state
   * 2. State transition ready→in_progress is valid (via core state machine)
   * 3. Artifact passes isReady() check
   *
   * @param id - The artifact ID
   * @returns True if can transition to in_progress
   * @throws {ArtifactNotFoundError} If artifact doesn't exist
   *
   * @example
   * ```ts
   * const canStart = await readinessService.canTransitionToInProgress("A.1.1");
   * if (canStart) {
   *   console.log("Can transition to in_progress");
   * }
   * ```
   */
  async canTransitionToInProgress(id: string): Promise<boolean> {
    const artifactWithId = await this.loadArtifact(id);
    const currentState = this.getCurrentState(artifactWithId.artifact);

    // Check if current state is READY
    if (currentState !== CArtifactEvent.READY) {
      return false;
    }

    // Check state machine allows transition
    const artifactType = this.getArtifactType(artifactWithId.artifact);
    const canTransit = canTransition(
      artifactType,
      currentState,
      CArtifactEvent.IN_PROGRESS,
    );
    if (!canTransit) {
      return false;
    }

    // Check readiness
    const ready = await this.isReady(id);
    return ready;
  }

  /**
   * Loads an artifact by ID.
   *
   * @param id - The artifact ID
   * @returns The artifact with ID
   * @throws {ArtifactNotFoundError} If artifact doesn't exist
   */
  private async loadArtifact(id: string): Promise<ArtifactWithId> {
    try {
      // Use getDependencies to validate artifact exists
      await this.depService.getDependencies(id);

      // Now get the artifact via tree traversal
      const tree = await this.queryService.getTree();
      const artifact = this.findArtifactInTree(tree, id);

      if (!artifact) {
        throw new ArtifactNotFoundError(id, `Artifact ${id} not found`);
      }

      return artifact;
    } catch (error) {
      if (error instanceof ArtifactNotFoundError) {
        throw error;
      }
      throw new ArtifactNotFoundError(
        id,
        `Failed to load artifact ${id}: ${error}`,
      );
    }
  }

  /**
   * Finds an artifact in the tree by ID.
   *
   * @param node - The tree node to search
   * @param id - The artifact ID to find
   * @returns The artifact with ID, or null if not found
   */
  private findArtifactInTree(
    node: ArtifactTreeNode,
    id: string,
  ): ArtifactWithId | null {
    if (node.id === id && node.artifact) {
      return { id: node.id, artifact: node.artifact };
    }

    for (const child of node.children) {
      const found = this.findArtifactInTree(child, id);
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * Gets the current state of an artifact from its events.
   *
   * @param artifact - The artifact
   * @returns The current state
   */
  private getCurrentState(artifact: TAnyArtifact): TArtifactEvent {
    const events = artifact.metadata.events;
    if (events.length === 0) {
      return CArtifactEvent.DRAFT as TArtifactEvent;
    }
    return (
      (events[events.length - 1]?.event as TArtifactEvent) ??
      (CArtifactEvent.DRAFT as TArtifactEvent)
    );
  }

  /**
   * Checks if artifact has a READY event in its history.
   *
   * @param artifact - The artifact
   * @returns True if has READY event
   */
  private hasReadyEvent(artifact: TAnyArtifact): boolean {
    return artifact.metadata.events.some(
      (event) => event.event === CArtifactEvent.READY,
    );
  }

  /**
   * Checks if artifact has a COMPLETED event.
   *
   * @param artifact - The artifact
   * @returns True if has COMPLETED event
   */
  private hasCompletedEvent(artifact: TAnyArtifact): boolean {
    return artifact.metadata.events.some(
      (event) => event.event === CArtifactEvent.COMPLETED,
    );
  }

  /**
   * Checks if ancestor artifact is in a blocking state.
   *
   * An ancestor blocks its descendants if it's NOT in one of these states:
   * - ready: Ancestor has no blocking dependencies, children can start
   * - in_progress: At least one child started, other children can start
   *
   * Blocking states (children CANNOT proceed):
   * - draft: Not yet ready to start
   * - blocked: Blocked by dependencies
   * - cancelled: Will not be completed
   * - in_review: All children completed, ancestor being reviewed (no new children)
   * - completed: Ancestor done and merged (no new children)
   *
   * @param artifact - The ancestor artifact
   * @returns True if ancestor is blocking
   */
  private isParentBlocking(artifact: TAnyArtifact): boolean {
    const currentState = this.getCurrentState(artifact);
    const nonBlockingStates: TArtifactEvent[] = [
      CArtifactEvent.READY as TArtifactEvent,
      CArtifactEvent.IN_PROGRESS as TArtifactEvent,
    ];
    return !nonBlockingStates.includes(currentState);
  }

  /**
   * Flattens tree to get all artifact IDs.
   *
   * @param node - The tree node
   * @returns Array of artifact IDs
   */
  private flattenTree(node: ArtifactTreeNode): string[] {
    const ids: string[] = [];

    if (node.id !== "__root__") {
      ids.push(node.id);
    }

    for (const child of node.children) {
      ids.push(...this.flattenTree(child));
    }

    return ids;
  }

  /**
   * Gets the artifact type from the artifact.
   *
   * @param artifact - The artifact
   * @returns The artifact type
   */
  private getArtifactType(artifact: TAnyArtifact): TArtifactType {
    // Artifact type is determined by the schema version pattern
    // For now, we can infer from the content structure
    if ("deliverables" in artifact.content) {
      return CArtifact.MILESTONE;
    }
    if ("scopeIn" in artifact.content && "scopeOut" in artifact.content) {
      if ("deliverables" in artifact.content) {
        return CArtifact.MILESTONE;
      }
      return CArtifact.ISSUE;
    }
    return CArtifact.INITIATIVE;
  }

  /**
   * Clears the internal cache of underlying services.
   *
   * Useful for testing or forcing a reload of artifacts.
   */
  clearCache(): void {
    this.depService.clearCache();
    this.queryService.clearCache();
  }
}
