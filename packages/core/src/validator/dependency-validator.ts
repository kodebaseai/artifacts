import type { TInitiative, TMilestone, TIssue } from "../schemas/schemas.js";

export type ArtifactWithRelationships = Pick<
  TInitiative | TMilestone | TIssue,
  "metadata"
>;

type DependencyNode = {
  id: string;
  dependencies: readonly string[];
  visited: boolean;
  inStack: boolean;
};

export type CircularDependencyIssue = {
  code: "CIRCULAR_DEPENDENCY";
  cycle: string[];
  message: string;
};

/**
 * Detect circular dependencies in the blocked_by relationship graph.
 * Returns one issue per detected cycle, including the ordered cycle path.
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
      const cyclePath =
        cycleStart >= 0
          ? path.slice(cycleStart).concat(nodeId)
          : path.concat(nodeId);
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
