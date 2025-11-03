/**
 * Service for querying and traversing the artifact tree.
 *
 * Provides methods for tree traversal operations with lazy loading
 * and caching for optimal performance.
 *
 * @module query-service
 */

import {
  getArtifactIdFromPath,
  loadAllArtifactPaths,
  readArtifact,
  type TAnyArtifact,
  type TArtifactEvent,
  type TArtifactType,
  type TPriority,
  type TSortBy,
  type TSortOrder,
} from "@kodebase/core";

import { ArtifactNotFoundError } from "./errors.js";

/**
 * Artifact with its ID attached.
 */
export interface ArtifactWithId {
  /** The artifact ID (e.g., "A", "A.1", "A.1.3") */
  id: string;
  /** The artifact data */
  artifact: TAnyArtifact;
}

/**
 * Represents a node in the artifact tree hierarchy.
 */
export interface ArtifactTreeNode {
  /** The artifact ID (e.g., "A", "A.1", "A.1.3") */
  id: string;
  /** The full artifact data */
  artifact: TAnyArtifact;
  /** Child nodes in the tree */
  children: ArtifactTreeNode[];
  /** Parent artifact ID (undefined for root initiatives) */
  parentId?: string;
}

/**
 * Criteria for querying and filtering artifacts.
 */
export interface QueryCriteria {
  /** Filter by current state (draft, ready, in_progress, completed, etc.) */
  state?: TArtifactEvent;
  /** Filter by artifact type (initiative, milestone, issue) */
  type?: TArtifactType;
  /** Filter by assignee (exact match) */
  assignee?: string;
  /** Filter by priority level */
  priority?: TPriority;
  /** Sort field */
  sortBy?: TSortBy;
  /** Sort order (default: asc) */
  sortOrder?: TSortOrder;
  /** Pagination offset (default: 0) */
  offset?: number;
  /** Pagination limit (default: no limit) */
  limit?: number;
}

/**
 * Error thrown when a circular reference is detected in the artifact tree.
 */
export class CircularReferenceError extends Error {
  constructor(
    public readonly artifactId: string,
    public readonly chain: string[],
  ) {
    super(
      `Circular reference detected at artifact "${artifactId}". Chain: ${chain.join(" → ")}`,
    );
    this.name = "CircularReferenceError";
    Error.captureStackTrace(this, CircularReferenceError);
  }
}

/**
 * Service for querying and traversing artifact trees.
 *
 * Implements lazy loading and caching for efficient tree operations.
 *
 * @example
 * ```ts
 * const queryService = new QueryService("/path/to/project");
 *
 * // Get the full tree
 * const tree = await queryService.getTree();
 *
 * // Get children of a milestone
 * const issues = await queryService.getChildren("A.1");
 *
 * // Get ancestors of an issue
 * const ancestors = await queryService.getAncestors("A.1.3");
 *
 * // Get siblings
 * const siblings = await queryService.getSiblings("A.1.2");
 * ```
 */
export class QueryService {
  private readonly cache: Map<string, TAnyArtifact> = new Map();
  private pathCache: Map<string, string> | null = null;
  private readonly artifactsPath: string;

  /**
   * Creates a new QueryService instance.
   *
   * @param baseDir - Base directory of the project (defaults to process.cwd())
   */
  constructor(baseDir: string = process.cwd()) {
    this.artifactsPath = `${baseDir}/.kodebase/artifacts`;
  }

  /**
   * Loads the path mapping for all artifacts (lazy initialization).
   *
   * @returns Map of artifact ID to file path
   */
  private async loadPathCache(): Promise<Map<string, string>> {
    if (this.pathCache) {
      return this.pathCache;
    }

    const paths = await loadAllArtifactPaths(this.artifactsPath);
    this.pathCache = new Map();

    for (const path of paths) {
      const id = getArtifactIdFromPath(path);
      if (id) {
        this.pathCache.set(id, path);
      }
    }

    return this.pathCache;
  }

  /**
   * Loads an artifact by ID with caching.
   *
   * @param id - The artifact ID
   * @returns The loaded artifact
   * @throws {ArtifactNotFoundError} If artifact doesn't exist
   */
  private async loadArtifact(id: string): Promise<TAnyArtifact> {
    // Check cache first
    const cached = this.cache.get(id);
    if (cached) {
      return cached;
    }

    // Load path mapping
    const pathCache = await this.loadPathCache();
    const path = pathCache.get(id);

    if (!path) {
      throw new ArtifactNotFoundError(id, `Unknown path for artifact ${id}`);
    }

    // Read and cache artifact
    const artifact = await readArtifact<TAnyArtifact>(path);
    this.cache.set(id, artifact);

    return artifact;
  }

  /**
   * Extracts the parent ID from an artifact ID.
   *
   * @param id - The artifact ID
   * @returns Parent ID or undefined for root artifacts
   *
   * @example
   * ```ts
   * getParentId("A.1.3") // "A.1"
   * getParentId("A.1")   // "A"
   * getParentId("A")     // undefined
   * ```
   */
  private getParentId(id: string): string | undefined {
    const segments = id.split(".");
    if (segments.length <= 1) {
      return undefined;
    }
    return segments.slice(0, -1).join(".");
  }

  /**
   * Gets all artifact IDs that are direct children of the given parent.
   *
   * @param parentId - The parent artifact ID (undefined for root level)
   * @returns Array of child artifact IDs
   */
  private async getChildIds(parentId?: string): Promise<string[]> {
    const pathCache = await this.loadPathCache();
    const allIds = Array.from(pathCache.keys());

    if (!parentId) {
      // Root level: only single-segment IDs
      return allIds.filter((id) => !id.includes("."));
    }

    // Direct children: parent segments + 1 additional segment
    const parentSegments = parentId.split(".");
    const targetDepth = parentSegments.length + 1;

    return allIds.filter((id) => {
      const segments = id.split(".");
      if (segments.length !== targetDepth) {
        return false;
      }
      // Check if parent segments match
      return segments.slice(0, -1).join(".") === parentId;
    });
  }

  /**
   * Builds a tree node recursively with lazy loading.
   *
   * @param id - The artifact ID to build a tree for
   * @param visited - Set of visited IDs for circular reference detection
   * @returns The tree node with its children
   * @throws {CircularReferenceError} If a circular reference is detected
   */
  private async buildTreeNode(
    id: string,
    visited: Set<string> = new Set(),
  ): Promise<ArtifactTreeNode> {
    // Circular reference detection
    if (visited.has(id)) {
      throw new CircularReferenceError(id, Array.from(visited));
    }

    visited.add(id);

    // Load artifact
    const artifact = await this.loadArtifact(id);
    const parentId = this.getParentId(id);

    // Get child IDs and build child nodes
    const childIds = await this.getChildIds(id);
    const children: ArtifactTreeNode[] = [];

    for (const childId of childIds) {
      const childNode = await this.buildTreeNode(childId, new Set(visited));
      children.push(childNode);
    }

    visited.delete(id);

    return {
      id,
      artifact,
      children,
      parentId,
    };
  }

  /**
   * Returns the full artifact tree hierarchy.
   *
   * Loads initiatives → milestones → issues with lazy loading.
   *
   * @returns Root tree node containing all initiatives and their descendants
   *
   * @example
   * ```ts
   * const tree = await queryService.getTree();
   * console.log(tree.children.length); // Number of root initiatives
   * ```
   */
  async getTree(): Promise<ArtifactTreeNode> {
    // Get all root initiative IDs
    const rootIds = await this.getChildIds();

    // Build tree for each root and combine
    const rootChildren: ArtifactTreeNode[] = [];

    for (const rootId of rootIds) {
      const node = await this.buildTreeNode(rootId);
      rootChildren.push(node);
    }

    // Return a virtual root node
    return {
      id: "__root__",
      artifact: {} as TAnyArtifact, // Virtual root has no artifact
      children: rootChildren,
      parentId: undefined,
    };
  }

  /**
   * Returns direct children of a parent artifact.
   *
   * Only returns immediate children, not grandchildren.
   *
   * @param parentId - The parent artifact ID
   * @returns Array of child artifacts with IDs
   * @throws {ArtifactNotFoundError} If parent artifact doesn't exist
   *
   * @example
   * ```ts
   * // Get all milestones under initiative A
   * const milestones = await queryService.getChildren("A");
   * // Returns: [{id: "A.1", artifact: ...}, {id: "A.2", artifact: ...}, ...]
   *
   * // Get all issues under milestone A.1
   * const issues = await queryService.getChildren("A.1");
   * // Returns: [{id: "A.1.1", artifact: ...}, {id: "A.1.2", artifact: ...}, ...]
   * ```
   */
  async getChildren(parentId: string): Promise<ArtifactWithId[]> {
    // Verify parent exists (this will throw if it doesn't)
    await this.loadArtifact(parentId);

    const childIds = await this.getChildIds(parentId);
    const children: ArtifactWithId[] = [];

    for (const childId of childIds) {
      const artifact = await this.loadArtifact(childId);
      children.push({ id: childId, artifact });
    }

    return children;
  }

  /**
   * Returns all ancestors of an artifact from root to parent.
   *
   * @param id - The artifact ID
   * @returns Array of ancestor artifacts with IDs, ordered from root to parent
   *
   * @example
   * ```ts
   * // Get ancestors of issue A.1.3
   * const ancestors = await queryService.getAncestors("A.1.3");
   * // Returns: [{id: "A", artifact: ...}, {id: "A.1", artifact: ...}]
   *
   * // Get ancestors of milestone A.2
   * const ancestors = await queryService.getAncestors("A.2");
   * // Returns: [{id: "A", artifact: ...}]
   *
   * // Get ancestors of initiative A
   * const ancestors = await queryService.getAncestors("A");
   * // Returns: []
   * ```
   */
  async getAncestors(id: string): Promise<ArtifactWithId[]> {
    const segments = id.split(".");
    const ancestors: ArtifactWithId[] = [];

    // Build ancestor chain from root to parent
    for (let i = 1; i < segments.length; i++) {
      const ancestorId = segments.slice(0, i).join(".");
      const ancestor = await this.loadArtifact(ancestorId);
      ancestors.push({ id: ancestorId, artifact: ancestor });
    }

    return ancestors;
  }

  /**
   * Returns all sibling artifacts (same parent, excluding self).
   *
   * @param id - The artifact ID
   * @returns Array of sibling artifacts with IDs
   * @throws {ArtifactNotFoundError} If artifact doesn't exist
   *
   * @example
   * ```ts
   * // Get siblings of issue A.1.2
   * const siblings = await queryService.getSiblings("A.1.2");
   * // Returns: [{id: "A.1.1", ...}, {id: "A.1.3", ...}, ...] (excludes A.1.2)
   *
   * // Get siblings of milestone A.2
   * const siblings = await queryService.getSiblings("A.2");
   * // Returns: [{id: "A.1", ...}, {id: "A.3", ...}, ...] (excludes A.2)
   * ```
   */
  async getSiblings(id: string): Promise<ArtifactWithId[]> {
    // Verify artifact exists (this will throw if it doesn't)
    await this.loadArtifact(id);

    const parentId = this.getParentId(id);

    // If no parent (root level), get all root artifacts
    let siblings: ArtifactWithId[];
    if (!parentId) {
      const rootIds = await this.getChildIds();
      siblings = [];
      for (const rootId of rootIds) {
        const artifact = await this.loadArtifact(rootId);
        siblings.push({ id: rootId, artifact });
      }
    } else {
      siblings = await this.getChildren(parentId);
    }

    // Filter out self
    return siblings.filter((item) => item.id !== id);
  }

  /**
   * Finds artifacts by their current state.
   *
   * @param state - The state to filter by (draft, ready, in_progress, completed, etc.)
   * @returns Array of artifacts in the specified state
   *
   * @example
   * ```ts
   * // Get all artifacts in progress
   * const inProgress = await queryService.findByState("in_progress");
   *
   * // Get all completed artifacts
   * const completed = await queryService.findByState("completed");
   * ```
   */
  async findByState(state: TArtifactEvent): Promise<ArtifactWithId[]> {
    const allArtifacts = await this.getAllArtifacts();

    return allArtifacts.filter((item) => {
      const currentState = this.getCurrentState(item.artifact);
      return currentState === state;
    });
  }

  /**
   * Finds artifacts by their type.
   *
   * @param type - The artifact type (initiative, milestone, issue)
   * @returns Array of artifacts of the specified type
   *
   * @example
   * ```ts
   * // Get all initiatives
   * const initiatives = await queryService.findByType("initiative");
   *
   * // Get all milestones
   * const milestones = await queryService.findByType("milestone");
   * ```
   */
  async findByType(type: TArtifactType): Promise<ArtifactWithId[]> {
    const allArtifacts = await this.getAllArtifacts();

    return allArtifacts.filter((item) => {
      const artifactType = this.getArtifactType(item.id);
      return artifactType === type;
    });
  }

  /**
   * Finds artifacts by assignee.
   *
   * @param assignee - The assignee to filter by (exact match)
   * @returns Array of artifacts assigned to the specified person
   *
   * @example
   * ```ts
   * // Get all artifacts assigned to a specific person
   * const artifacts = await queryService.findByAssignee("John Doe (john@example.com)");
   * ```
   */
  async findByAssignee(assignee: string): Promise<ArtifactWithId[]> {
    const allArtifacts = await this.getAllArtifacts();

    return allArtifacts.filter((item) => {
      return item.artifact.metadata.assignee === assignee;
    });
  }

  /**
   * Finds artifacts by priority level.
   *
   * @param priority - The priority level (low, medium, high, critical)
   * @returns Array of artifacts with the specified priority
   *
   * @example
   * ```ts
   * // Get all high priority artifacts
   * const highPriority = await queryService.findByPriority("high");
   *
   * // Get all critical artifacts
   * const critical = await queryService.findByPriority("critical");
   * ```
   */
  async findByPriority(priority: TPriority): Promise<ArtifactWithId[]> {
    const allArtifacts = await this.getAllArtifacts();

    return allArtifacts.filter((item) => {
      return item.artifact.metadata.priority === priority;
    });
  }

  /**
   * Finds artifacts using complex query criteria with filtering, sorting, and pagination.
   *
   * @param criteria - Query criteria with optional filters, sorting, and pagination
   * @returns Array of filtered, sorted, and paginated artifacts
   *
   * @example
   * ```ts
   * // Get all high priority issues in progress
   * const results = await queryService.findArtifacts({
   *   type: "issue",
   *   state: "in_progress",
   *   priority: "high"
   * });
   *
   * // Get all artifacts assigned to John, sorted by priority
   * const results = await queryService.findArtifacts({
   *   assignee: "John Doe (john@example.com)",
   *   sortBy: "priority",
   *   sortOrder: "desc"
   * });
   *
   * // Get completed milestones with pagination
   * const results = await queryService.findArtifacts({
   *   type: "milestone",
   *   state: "completed",
   *   offset: 10,
   *   limit: 20
   * });
   * ```
   */
  async findArtifacts(criteria: QueryCriteria): Promise<ArtifactWithId[]> {
    let results = await this.getAllArtifacts();

    // Apply filters
    if (criteria.state !== undefined) {
      results = results.filter((item) => {
        const currentState = this.getCurrentState(item.artifact);
        return currentState === criteria.state;
      });
    }

    if (criteria.type !== undefined) {
      results = results.filter((item) => {
        const artifactType = this.getArtifactType(item.id);
        return artifactType === criteria.type;
      });
    }

    if (criteria.assignee !== undefined) {
      results = results.filter((item) => {
        return item.artifact.metadata.assignee === criteria.assignee;
      });
    }

    if (criteria.priority !== undefined) {
      results = results.filter((item) => {
        return item.artifact.metadata.priority === criteria.priority;
      });
    }

    // Apply sorting
    if (criteria.sortBy) {
      results = this.sortArtifacts(
        results,
        criteria.sortBy,
        criteria.sortOrder,
      );
    }

    // Apply pagination
    const offset = criteria.offset ?? 0;
    const limit = criteria.limit;

    if (limit !== undefined) {
      results = results.slice(offset, offset + limit);
    } else if (offset > 0) {
      results = results.slice(offset);
    }

    return results;
  }

  /**
   * Sorts artifacts by the specified field and order.
   *
   * @param artifacts - Array of artifacts to sort
   * @param sortBy - Field to sort by (id, priority, timestamp)
   * @param sortOrder - Sort order (asc or desc, default: asc)
   * @returns Sorted array of artifacts
   */
  private sortArtifacts(
    artifacts: ArtifactWithId[],
    sortBy: TSortBy,
    sortOrder: TSortOrder = "asc",
  ): ArtifactWithId[] {
    const sorted = [...artifacts];

    sorted.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "id") {
        comparison = a.id.localeCompare(b.id);
      } else if (sortBy === "priority") {
        const priorityWeight: Record<TPriority, number> = {
          low: 1,
          medium: 2,
          high: 3,
          critical: 4,
        };
        const aWeight =
          priorityWeight[a.artifact.metadata.priority as TPriority] || 0;
        const bWeight =
          priorityWeight[b.artifact.metadata.priority as TPriority] || 0;
        comparison = aWeight - bWeight;
      } else if (sortBy === "timestamp") {
        const aTimestamp =
          a.artifact.metadata.events[a.artifact.metadata.events.length - 1]
            ?.timestamp || "";
        const bTimestamp =
          b.artifact.metadata.events[b.artifact.metadata.events.length - 1]
            ?.timestamp || "";
        comparison = aTimestamp.localeCompare(bTimestamp);
      }

      return sortOrder === "desc" ? -comparison : comparison;
    });

    return sorted;
  }

  /**
   * Gets the current state of an artifact from its events.
   *
   * @param artifact - The artifact
   * @returns The current state (last event) or null if no events
   */
  private getCurrentState(artifact: TAnyArtifact): TArtifactEvent | null {
    const events = artifact.metadata.events;
    if (!events || events.length === 0) {
      return null;
    }
    return (events[events.length - 1]?.event as TArtifactEvent) ?? null;
  }

  /**
   * Gets the artifact type from its ID structure.
   *
   * @param id - The artifact ID
   * @returns The artifact type
   *
   * @example
   * ```ts
   * getArtifactType("A")     // "initiative"
   * getArtifactType("A.1")   // "milestone"
   * getArtifactType("A.1.1") // "issue"
   * ```
   */
  private getArtifactType(id: string): TArtifactType {
    const segments = id.split(".");
    if (segments.length === 1) {
      return "initiative";
    }
    if (segments.length === 2) {
      return "milestone";
    }
    return "issue";
  }

  /**
   * Loads all artifacts from the path cache.
   *
   * @returns Array of all artifacts with IDs
   */
  private async getAllArtifacts(): Promise<ArtifactWithId[]> {
    const pathCache = await this.loadPathCache();
    const artifacts: ArtifactWithId[] = [];

    for (const [id, _path] of pathCache.entries()) {
      try {
        const artifact = await this.loadArtifact(id);
        artifacts.push({ id, artifact });
      } catch {}
    }

    return artifacts;
  }

  /**
   * Clears the internal cache.
   *
   * Useful for testing or forcing a reload of artifacts.
   */
  clearCache(): void {
    this.cache.clear();
    this.pathCache = null;
  }
}
