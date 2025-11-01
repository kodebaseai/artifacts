/**
 * Dependency validation utilities for artifact relationships.
 *
 * Provides functions to detect and validate dependency graphs across artifacts:
 * - Circular dependency detection
 * - Cross-level dependency validation
 * - Bidirectional relationship consistency checks
 *
 * @module dependency-validator
 */

import {
  CArtifact,
  INITIATIVE_ID_REGEX,
  ISSUE_ID_REGEX,
  MILESTONE_ID_REGEX,
  type TArtifactType,
} from "../constants.js";
import type { TInitiative, TIssue, TMilestone } from "../schemas/schemas.js";

/**
 * Minimal artifact interface containing relationship metadata.
 *
 * Used for dependency validation across artifact collections.
 */
export type ArtifactWithRelationships = Pick<
  TInitiative | TMilestone | TIssue,
  "metadata"
>;

/**
 * Internal node representation for dependency graph traversal.
 * @internal
 */
type DependencyNode = {
  id: string;
  dependencies: readonly string[];
  visited: boolean;
  inStack: boolean;
};

/**
 * Validation issue for circular dependencies.
 *
 * Circular dependencies occur when artifacts form a cycle in their blocked_by
 * relationships (e.g., A depends on B, B depends on C, C depends on A).
 */
export type CircularDependencyIssue = {
  /** Error code identifying this as a circular dependency */
  code: "CIRCULAR_DEPENDENCY";
  /** Array of artifact IDs forming the cycle (e.g., ["A.1", "A.2", "A.3", "A.1"]) */
  cycle: string[];
  /** Human-readable error message with formatted cycle path */
  message: string;
};

/**
 * Validation issue for cross-level dependencies.
 *
 * Cross-level dependencies violate hierarchy rules where artifacts should only
 * depend on artifacts at the same level (initiatives depend on initiatives, etc.).
 */
export type CrossLevelDependencyIssue = {
  /** Error code identifying this as a cross-level dependency */
  code: "CROSS_LEVEL_DEPENDENCY";
  /** ID of the artifact declaring the dependency */
  sourceId: string;
  /** Type of the source artifact */
  sourceType: TArtifactType;
  /** ID of the artifact being depended upon */
  dependencyId: string;
  /** Type of the dependency artifact */
  dependencyType: TArtifactType;
  /** Human-readable error message */
  message: string;
};

/**
 * Validation issue for relationship consistency.
 *
 * Relationships must be bidirectional: if A blocks B, then B must list A in blocked_by.
 * Also validates that all referenced artifacts exist in the collection.
 */
export type RelationshipConsistencyIssue = {
  /** Error code: unknown artifact or inconsistent bidirectional pair */
  code: "RELATIONSHIP_UNKNOWN_ARTIFACT" | "RELATIONSHIP_INCONSISTENT_PAIR";
  /** JSON path to the relationship field with the issue */
  path: string;
  /** Human-readable error message */
  message: string;
};

function inferArtifactType(id: string): TArtifactType | null {
  if (ISSUE_ID_REGEX.test(id)) {
    return CArtifact.ISSUE;
  }
  if (MILESTONE_ID_REGEX.test(id)) {
    return CArtifact.MILESTONE;
  }
  if (INITIATIVE_ID_REGEX.test(id)) {
    return CArtifact.INITIATIVE;
  }
  return null;
}

const LABEL_BY_TYPE: Record<TArtifactType, string> = {
  [CArtifact.INITIATIVE]: "initiative",
  [CArtifact.MILESTONE]: "milestone",
  [CArtifact.ISSUE]: "issue",
};

function formatArtifactLabel(type: TArtifactType, id: string): string {
  return `${LABEL_BY_TYPE[type]} ${id}`;
}

/**
 * Detect circular dependencies in the artifact dependency graph.
 *
 * Uses depth-first search with cycle detection to find circular chains in
 * blocked_by relationships. Returns one issue per detected cycle with the
 * complete path showing the circular chain.
 *
 * @param artifacts - Map of artifact IDs to their relationship metadata
 * @returns Array of circular dependency issues (empty if no cycles found)
 *
 * @example
 * ```ts
 * import { detectCircularDependencies } from "@kodebase/core";
 *
 * const artifacts = new Map([
 *   ["A.1", { metadata: { relationships: { blocked_by: ["A.2"] } } }],
 *   ["A.2", { metadata: { relationships: { blocked_by: ["A.3"] } } }],
 *   ["A.3", { metadata: { relationships: { blocked_by: ["A.1"] } } }],
 * ]);
 *
 * const issues = detectCircularDependencies(artifacts);
 * // issues[0].cycle: ["A.1", "A.2", "A.3", "A.1"]
 * // issues[0].message: "Circular dependency detected: A.1 -> A.2 -> A.3 -> A.1"
 * ```
 */
export function detectCircularDependencies(
  artifacts: ReadonlyMap<string, ArtifactWithRelationships>,
): CircularDependencyIssue[] {
  const nodes = new Map<string, DependencyNode>();

  for (const [id, artifact] of artifacts) {
    const blockedBy =
      artifact.metadata.relationships?.blocked_by?.slice() ?? [];
    nodes.set(id, {
      id,
      dependencies: blockedBy,
      visited: false,
      inStack: false,
    });
  }

  const issues: CircularDependencyIssue[] = [];

  const explore = (nodeId: string, path: string[]): string[] | null => {
    const node = nodes.get(nodeId);
    if (!node) {
      return null;
    }

    if (node.inStack) {
      const cycleStart = path.indexOf(nodeId);
      const cyclePath = path.slice(Math.max(0, cycleStart)).concat(nodeId);
      return cyclePath;
    }

    if (node.visited) {
      return null;
    }

    node.visited = true;
    node.inStack = true;
    path.push(nodeId);

    for (const dependencyId of node.dependencies) {
      if (!nodes.has(dependencyId)) {
        continue;
      }

      const cycle = explore(dependencyId, [...path]);
      if (cycle) {
        node.inStack = false;
        return cycle;
      }
    }

    node.inStack = false;
    return null;
  };

  for (const [id, node] of nodes) {
    if (node.visited) {
      continue;
    }

    const cycle = explore(id, []);
    if (cycle) {
      const formatted = cycle.join(" -> ");
      issues.push({
        code: "CIRCULAR_DEPENDENCY",
        cycle,
        message: `Circular dependency detected: ${formatted}`,
      });
    }
  }

  return issues;
}

/**
 * Detect cross-level dependencies between different artifact types.
 *
 * Validates that artifacts only depend on artifacts of the same type:
 * - Initiatives can only depend on initiatives
 * - Milestones can only depend on milestones
 * - Issues can only depend on issues
 *
 * @param artifacts - Map of artifact IDs to their relationship metadata
 * @returns Array of cross-level dependency issues (empty if all valid)
 *
 * @example
 * ```ts
 * import { detectCrossLevelDependencies } from "@kodebase/core";
 *
 * const artifacts = new Map([
 *   ["A", { metadata: { relationships: { blocked_by: ["B.1"] } } }],
 *   ["B.1", { metadata: { relationships: {} } }],
 * ]);
 *
 * const issues = detectCrossLevelDependencies(artifacts);
 * // issues[0].message: "Cross-level dependency detected: initiative A cannot depend on milestone B.1."
 * ```
 */
export function detectCrossLevelDependencies(
  artifacts: ReadonlyMap<string, ArtifactWithRelationships>,
): CrossLevelDependencyIssue[] {
  const issues: CrossLevelDependencyIssue[] = [];

  for (const [id, artifact] of artifacts) {
    const sourceType = inferArtifactType(id);
    if (!sourceType) {
      continue;
    }

    const dependencies = artifact.metadata.relationships?.blocked_by ?? [];

    for (const dependencyId of dependencies) {
      const dependencyArtifact = artifacts.get(dependencyId);
      if (!dependencyArtifact) {
        continue;
      }

      const dependencyType = inferArtifactType(dependencyId);
      if (!dependencyType) {
        continue;
      }

      if (sourceType === dependencyType) {
        continue;
      }

      const sourceLabel = formatArtifactLabel(sourceType, id);
      const dependencyLabel = formatArtifactLabel(dependencyType, dependencyId);

      issues.push({
        code: "CROSS_LEVEL_DEPENDENCY",
        sourceId: id,
        sourceType,
        dependencyId,
        dependencyType,
        message: `Cross-level dependency detected: ${sourceLabel} cannot depend on ${dependencyLabel}.`,
      });
    }
  }

  return issues;
}

function getRelationships(artifact: ArtifactWithRelationships): {
  blocks: readonly string[];
  blocked_by: readonly string[];
} {
  const relationships = artifact.metadata.relationships;
  if (!relationships) {
    return { blocks: [], blocked_by: [] };
  }
  return relationships;
}

/**
 * Validate bidirectional consistency of artifact relationships.
 *
 * Ensures that relationship declarations are bidirectional and consistent:
 * - If A lists B in "blocks", then B must list A in "blocked_by"
 * - If A lists B in "blocked_by", then B must list A in "blocks"
 * - All referenced artifact IDs must exist in the collection
 *
 * This prevents orphaned or one-way relationships that could break
 * dependency resolution and cascade propagation.
 *
 * @param artifacts - Map of artifact IDs to their relationship metadata
 * @returns Array of relationship consistency issues (empty if all valid)
 *
 * @example
 * ```ts
 * import { validateRelationshipConsistency } from "@kodebase/core";
 *
 * const artifacts = new Map([
 *   ["A.1", { metadata: { relationships: { blocks: ["A.2"] } } }],
 *   ["A.2", { metadata: { relationships: {} } }], // Missing blocked_by: ["A.1"]
 * ]);
 *
 * const issues = validateRelationshipConsistency(artifacts);
 * // issues[0].code: "RELATIONSHIP_INCONSISTENT_PAIR"
 * // issues[0].message: "'A.1' lists 'A.2' in blocks but the reciprocal blocked_by entry is missing."
 * ```
 */
export function validateRelationshipConsistency(
  artifacts: ReadonlyMap<string, ArtifactWithRelationships>,
): RelationshipConsistencyIssue[] {
  const issues: RelationshipConsistencyIssue[] = [];
  const reportedPairs = new Set<string>();

  const markInconsistent = (
    sourceId: string,
    targetId: string,
    path: string,
    message: string,
  ) => {
    const key = [sourceId, targetId].sort().join("::");
    if (reportedPairs.has(key)) {
      return;
    }
    reportedPairs.add(key);
    issues.push({
      code: "RELATIONSHIP_INCONSISTENT_PAIR",
      path,
      message,
    });
  };

  for (const [id, artifact] of artifacts) {
    const relationships = getRelationships(artifact);

    relationships.blocks.forEach((targetId, index) => {
      const path = `metadata.relationships.blocks[${index}]`;
      const target = artifacts.get(targetId);
      if (!target) {
        issues.push({
          code: "RELATIONSHIP_UNKNOWN_ARTIFACT",
          path,
          message: `'${targetId}' referenced by ${id} was not found.`,
        });
        return;
      }
      const targetRelationships = getRelationships(target);
      if (!targetRelationships.blocked_by.includes(id)) {
        markInconsistent(
          id,
          targetId,
          path,
          `'${id}' lists '${targetId}' in blocks but the reciprocal blocked_by entry is missing.`,
        );
      }
    });

    relationships.blocked_by.forEach((sourceId, index) => {
      const path = `metadata.relationships.blocked_by[${index}]`;
      const source = artifacts.get(sourceId);
      if (!source) {
        issues.push({
          code: "RELATIONSHIP_UNKNOWN_ARTIFACT",
          path,
          message: `'${sourceId}' referenced by ${id} was not found.`,
        });
        return;
      }
      const sourceRelationships = getRelationships(source);
      if (!sourceRelationships.blocks.includes(id)) {
        markInconsistent(
          sourceId,
          id,
          path,
          `'${id}' lists '${sourceId}' in blocked_by but the reciprocal blocks entry is missing.`,
        );
      }
    });
  }

  return issues;
}
