/**
 * Service for traversing and analyzing artifact dependency graphs.
 *
 * Provides methods for dependency relationship operations (blocks/blocked_by)
 * with validation and graph traversal capabilities.
 *
 * @module dependency-graph-service
 */

import {
  type CircularDependencyIssue,
  type CrossLevelDependencyIssue,
  detectCircularDependencies,
  detectCrossLevelDependencies,
  getArtifactIdFromPath,
  loadAllArtifactPaths,
  type RelationshipConsistencyIssue,
  readArtifact,
  type TAnyArtifact,
  validateRelationshipConsistency,
} from "@kodebase/core";

import { ArtifactNotFoundError } from "./errors.js";
import type { ArtifactWithId } from "./query-service.js";

/**
 * Service for dependency graph operations on artifacts.
 *
 * Implements relationship traversal (blocks/blocked_by) with lazy loading,
 * caching, and validation capabilities.
 *
 * @example
 * ```ts
 * const depService = new DependencyGraphService("/path/to/project");
 *
 * // Get artifacts that block this one
 * const deps = await depService.getDependencies("A.1.2");
 *
 * // Get artifacts blocked by this one
 * const blocked = await depService.getBlockedArtifacts("A.1.1");
 *
 * // Check if artifact is blocked by incomplete dependencies
 * const isBlocked = await depService.isBlocked("A.1.3");
 *
 * // Get full dependency chain
 * const chain = await depService.resolveDependencyChain("A.1.2");
 * ```
 */
export class DependencyGraphService {
  /** Internal cache mapping artifact IDs to loaded artifacts */
  private readonly cache: Map<string, TAnyArtifact> = new Map();

  /** Lazy-loaded cache mapping artifact IDs to file paths */
  private pathCache: Map<string, string> | null = null;

  /** Absolute path to the artifacts directory */
  private readonly artifactsPath: string;

  /**
   * Creates a new DependencyGraphService instance.
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
   * @returns The loaded artifact or null if not found
   */
  private async loadArtifact(id: string): Promise<TAnyArtifact | null> {
    // Check cache first
    const cached = this.cache.get(id);
    if (cached) {
      return cached;
    }

    // Load path mapping
    const pathCache = await this.loadPathCache();
    const path = pathCache.get(id);

    if (!path) {
      return null;
    }

    try {
      // Read and cache artifact
      const artifact = await readArtifact<TAnyArtifact>(path);
      this.cache.set(id, artifact);
      return artifact;
    } catch {
      return null;
    }
  }

  /**
   * Loads all artifacts with caching.
   *
   * @returns Map of artifact ID to artifact
   */
  private async loadAllArtifacts(): Promise<Map<string, TAnyArtifact>> {
    const pathCache = await this.loadPathCache();
    const artifacts = new Map<string, TAnyArtifact>();

    for (const [id, path] of pathCache) {
      const cached = this.cache.get(id);
      if (cached) {
        artifacts.set(id, cached);
      } else {
        try {
          const artifact = await readArtifact<TAnyArtifact>(path);
          this.cache.set(id, artifact);
          artifacts.set(id, artifact);
        } catch {}
      }
    }

    return artifacts;
  }

  /**
   * Returns artifacts that block the given artifact.
   *
   * Reads the `blocked_by` array and loads each dependency artifact.
   * Handles missing artifacts gracefully by warning and continuing.
   *
   * @param id - The artifact ID
   * @returns Array of artifacts that block this one
   * @throws {ArtifactNotFoundError} If the artifact itself doesn't exist
   *
   * @example
   * ```ts
   * // Get dependencies for issue A.1.2
   * const deps = await depService.getDependencies("A.1.2");
   * // Returns: [{id: "A.1.1", artifact: ...}]
   * ```
   */
  async getDependencies(id: string): Promise<ArtifactWithId[]> {
    const artifact = await this.loadArtifact(id);
    if (!artifact) {
      throw new ArtifactNotFoundError(id, `Artifact ${id} not found`);
    }

    const blockedBy = artifact.metadata.relationships?.blocked_by ?? [];
    const dependencies: ArtifactWithId[] = [];

    for (const depId of blockedBy) {
      const depArtifact = await this.loadArtifact(depId);
      if (depArtifact) {
        dependencies.push({ id: depId, artifact: depArtifact });
      } else {
        // Warn about missing dependency but continue
        console.warn(
          `Dependency ${depId} referenced by ${id} not found, skipping`,
        );
      }
    }

    return dependencies;
  }

  /**
   * Returns artifacts that are blocked by the given artifact.
   *
   * This is the inverse of getDependencies - finds all artifacts that
   * list this artifact in their `blocked_by` array.
   *
   * @param id - The artifact ID
   * @returns Array of artifacts blocked by this one
   * @throws {ArtifactNotFoundError} If the artifact itself doesn't exist
   *
   * @example
   * ```ts
   * // Get artifacts blocked by A.1.1
   * const blocked = await depService.getBlockedArtifacts("A.1.1");
   * // Returns: [{id: "A.1.2", artifact: ...}, {id: "A.1.3", artifact: ...}]
   * ```
   */
  async getBlockedArtifacts(id: string): Promise<ArtifactWithId[]> {
    // Verify artifact exists
    const artifact = await this.loadArtifact(id);
    if (!artifact) {
      throw new ArtifactNotFoundError(id, `Artifact ${id} not found`);
    }

    // Load all artifacts and filter
    const allArtifacts = await this.loadAllArtifacts();
    const blocked: ArtifactWithId[] = [];

    for (const [artifactId, artifactData] of allArtifacts) {
      const blockedBy = artifactData.metadata.relationships?.blocked_by ?? [];
      if (blockedBy.includes(id)) {
        blocked.push({ id: artifactId, artifact: artifactData });
      }
    }

    return blocked;
  }

  /**
   * Checks if an artifact is blocked by incomplete dependencies.
   *
   * Returns true if any artifact in `blocked_by` is not in `completed` state.
   *
   * @param id - The artifact ID
   * @returns True if blocked by incomplete dependencies
   * @throws {ArtifactNotFoundError} If the artifact itself doesn't exist
   *
   * @example
   * ```ts
   * const blocked = await depService.isBlocked("A.1.3");
   * if (blocked) {
   *   console.log("Artifact has incomplete dependencies");
   * }
   * ```
   */
  async isBlocked(id: string): Promise<boolean> {
    const dependencies = await this.getDependencies(id);

    // Check if any dependency is not completed
    for (const dep of dependencies) {
      const events = dep.artifact.metadata.events;
      const hasCompletedEvent = events.some(
        (event) => event.event === "completed",
      );

      if (!hasCompletedEvent) {
        return true;
      }
    }

    return false;
  }

  /**
   * Resolves the full dependency chain for an artifact.
   *
   * Returns the transitive closure of all dependencies (dependencies of dependencies).
   * Uses BFS traversal and detects circular dependencies.
   *
   * @param id - The artifact ID
   * @returns Array of all artifacts in the dependency chain (deduplicated)
   * @throws {ArtifactNotFoundError} If the artifact itself doesn't exist
   * @throws {Error} If circular dependency detected
   *
   * @example
   * ```ts
   * // Get full dependency chain for A.1.3
   * const chain = await depService.resolveDependencyChain("A.1.3");
   * // Returns all transitive dependencies: [{id: "A.1.1", ...}, {id: "A.1.2", ...}, ...]
   * ```
   */
  async resolveDependencyChain(id: string): Promise<ArtifactWithId[]> {
    const artifact = await this.loadArtifact(id);
    if (!artifact) {
      throw new ArtifactNotFoundError(id, `Artifact ${id} not found`);
    }

    const visited = new Set<string>();
    const chain: ArtifactWithId[] = [];
    const queue: Array<{ id: string; path: string[] }> = [{ id, path: [id] }];

    // BFS traversal with path-based circular detection
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const { id: currentId, path } = item;

      // Skip if already processed
      if (visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      const currentArtifact = await this.loadArtifact(currentId);
      if (!currentArtifact) {
        console.warn(
          `Artifact ${currentId} in dependency chain not found, skipping`,
        );
        continue;
      }

      // Add to chain (exclude the starting artifact)
      if (currentId !== id) {
        chain.push({ id: currentId, artifact: currentArtifact });
      }

      // Add dependencies to queue
      const blockedBy =
        currentArtifact.metadata.relationships?.blocked_by ?? [];
      for (const depId of blockedBy) {
        // Check if this dependency creates a cycle
        if (path.includes(depId)) {
          throw new Error(
            `Circular dependency detected: ${[...path, depId].join(" → ")}`,
          );
        }

        if (!visited.has(depId)) {
          queue.push({ id: depId, path: [...path, depId] });
        }
      }
    }

    return chain;
  }

  /**
   * Detects circular dependencies across all artifacts.
   *
   * Wrapper around core validator for convenience.
   *
   * @returns Array of circular dependency issues found
   *
   * @example
   * ```ts
   * const issues = await depService.detectCircularDependencies();
   * if (issues.length > 0) {
   *   console.error("Circular dependencies found:", issues);
   * }
   * ```
   */
  async detectCircularDependencies(): Promise<CircularDependencyIssue[]> {
    const artifacts = await this.loadAllArtifacts();
    return detectCircularDependencies(artifacts);
  }

  /**
   * Detects cross-level dependencies across all artifacts.
   *
   * Validates that dependencies are only between artifacts at the same level
   * (initiatives depend on initiatives, milestones on milestones, etc.).
   * Wrapper around core validator for convenience.
   *
   * @returns Array of cross-level dependency issues found
   *
   * @example
   * ```ts
   * const issues = await depService.detectCrossLevelDependencies();
   * if (issues.length > 0) {
   *   console.error("Cross-level dependencies found:", issues);
   * }
   * ```
   */
  async detectCrossLevelDependencies(): Promise<CrossLevelDependencyIssue[]> {
    const artifacts = await this.loadAllArtifacts();
    return detectCrossLevelDependencies(artifacts);
  }

  /**
   * Validates relationship consistency across all artifacts.
   *
   * Checks that all referenced artifacts exist and that bidirectional
   * relationships are consistent (if A blocks B, then B lists A in blocked_by).
   * Wrapper around core validator for convenience.
   *
   * @returns Array of relationship consistency issues found
   *
   * @example
   * ```ts
   * const issues = await depService.validateRelationshipConsistency();
   * if (issues.length > 0) {
   *   console.error("Relationship inconsistencies found:", issues);
   * }
   * ```
   */
  async validateRelationshipConsistency(): Promise<
    RelationshipConsistencyIssue[]
  > {
    const artifacts = await this.loadAllArtifacts();
    return validateRelationshipConsistency(artifacts);
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
