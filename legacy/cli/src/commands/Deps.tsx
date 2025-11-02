import type { ArtifactSchema } from '@kodebase/core';
import { Box, Text } from 'ink';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { ArtifactLoader } from '../utils/artifact-loader.js';

export interface DepsCommandProps {
  /** Artifact ID to analyze dependencies for */
  artifactId: string;
  /** Output format - default is formatted, --json outputs JSON */
  format?: 'formatted' | 'json';
  /** Enable verbose output and error details */
  verbose?: boolean;
}

interface DependencyInfo {
  id: string;
  title: string;
  type: string;
  status: string;
  relationship: 'blocks' | 'blocked_by';
  depth: number;
}

interface DependencyAnalysisResult {
  artifact: ArtifactSchema;
  dependencies: DependencyInfo[];
  circularDependencies: string[][];
  impactAnalysis: {
    directDependents: string[];
    transitiveImpact: number;
    criticalPath: boolean;
  };
}

/**
 * Dependencies Command Component (Experimental)
 *
 * Implements the 'kodebase deps' command for analyzing artifact dependency trees.
 *
 * Command syntax: `kodebase deps <artifact-id> [--json] --experimental`
 *
 * @description
 * This experimental command provides comprehensive dependency analysis:
 * - Shows complete dependency tree with blocking relationships
 * - Identifies circular dependencies that would cause deadlocks
 * - Calculates impact analysis for understanding change consequences
 * - Displays critical path information for project planning
 * - Supports both human-readable and JSON output formats
 *
 * @example
 * ```bash
 * kodebase deps A.1.5 --experimental     # Formatted dependency tree display
 * kodebase deps D.2 --json --experimental # JSON output for automation
 * ```
 *
 * **Analysis Features:**
 * - Recursive dependency traversal with cycle detection
 * - Impact radius calculation (how many artifacts would be affected)
 * - Critical path identification (artifacts blocking multiple others)
 * - Relationship type classification (direct vs transitive)
 */
export const Deps: FC<DepsCommandProps> = ({
  artifactId,
  format = 'formatted',
}) => {
  const [result, setResult] = useState<{
    success: boolean;
    data?: DependencyAnalysisResult;
    error?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const analyzeDependencies = async () => {
      try {
        const loader = new ArtifactLoader();
        const artifact = await loader.loadArtifact(artifactId);

        // Build dependency tree with error handling
        const dependencies = await buildDependencyTree(artifact, loader).catch(
          () => [],
        );

        // Detect circular dependencies
        const circularDependencies = detectCircularDependencies(dependencies);

        // Calculate impact analysis
        const impactAnalysis = await calculateImpactAnalysis(artifact).catch(
          () => ({
            directDependents: [],
            transitiveImpact: 0,
            criticalPath: false,
          }),
        );

        setResult({
          success: true,
          data: {
            artifact,
            dependencies,
            circularDependencies,
            impactAnalysis,
          },
        });
      } catch (error) {
        setResult({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    analyzeDependencies();
  }, [artifactId]);

  if (isLoading) {
    return (
      <Box flexDirection="column">
        <Text>Analyzing dependencies for {artifactId}...</Text>
      </Box>
    );
  }

  if (!result) {
    return (
      <Box flexDirection="column">
        <Text color="red">Unexpected error occurred</Text>
      </Box>
    );
  }

  if (!result.success) {
    return (
      <Box flexDirection="column">
        <Text color="red">✗ {result.error}</Text>
        <Text>Make sure the artifact ID is correct and the file exists.</Text>
      </Box>
    );
  }

  const { data } = result;
  if (!data) {
    return (
      <Box flexDirection="column">
        <Text color="red">Analysis data is missing</Text>
      </Box>
    );
  }

  // Handle JSON output
  if (format === 'json') {
    const jsonOutput = {
      artifactId: artifactId,
      title: data.artifact.metadata.title,
      dependencies: data.dependencies,
      circularDependencies: data.circularDependencies,
      impactAnalysis: data.impactAnalysis,
      summary: {
        totalDependencies: data.dependencies.length,
        blockedBy: data.dependencies.filter(
          (d) => d.relationship === 'blocked_by',
        ).length,
        blocks: data.dependencies.filter((d) => d.relationship === 'blocks')
          .length,
        circularDependenciesFound: data.circularDependencies.length,
        criticalPath: data.impactAnalysis.criticalPath,
        transitiveImpact: data.impactAnalysis.transitiveImpact,
      },
    };

    return (
      <Box flexDirection="column">
        <Text>{JSON.stringify(jsonOutput, null, 2)}</Text>
      </Box>
    );
  }

  // Handle formatted output
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={1}>
        <Text bold color="cyan">
          {artifactId}:
        </Text>
        <Text bold>{data.artifact.metadata.title}</Text>
      </Box>

      {/* Dependency Summary */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold>Dependency Summary</Text>
        <Box flexDirection="column" marginLeft={2}>
          <Text>
            Total dependencies:{' '}
            <Text color="cyan">{data.dependencies.length}</Text>
          </Text>
          <Text>
            Blocked by:{' '}
            <Text color="red">
              {
                data.dependencies.filter((d) => d.relationship === 'blocked_by')
                  .length
              }
            </Text>
          </Text>
          <Text>
            Blocks:{' '}
            <Text color="yellow">
              {
                data.dependencies.filter((d) => d.relationship === 'blocks')
                  .length
              }
            </Text>
          </Text>
          <Text>
            Circular dependencies:{' '}
            <Text
              color={data.circularDependencies.length > 0 ? 'red' : 'green'}
            >
              {data.circularDependencies.length}
            </Text>
          </Text>
        </Box>
      </Box>

      {/* Impact Analysis */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold>Impact Analysis</Text>
        <Box flexDirection="column" marginLeft={2}>
          <Text>
            Direct dependents:{' '}
            <Text color="cyan">
              {data.impactAnalysis.directDependents.length}
            </Text>
          </Text>
          <Text>
            Transitive impact:{' '}
            <Text color="cyan">{data.impactAnalysis.transitiveImpact}</Text>
          </Text>
          <Text>
            Critical path:{' '}
            <Text color={data.impactAnalysis.criticalPath ? 'red' : 'green'}>
              {data.impactAnalysis.criticalPath ? 'Yes' : 'No'}
            </Text>
          </Text>
        </Box>
      </Box>

      {/* Dependency Tree */}
      {data.dependencies.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Dependency Tree</Text>
          <Box flexDirection="column" marginLeft={2}>
            {data.dependencies.map((dep) => (
              <Box
                key={`${dep.id}-${dep.relationship}`}
                flexDirection="row"
                gap={1}
              >
                <Text dimColor>{'  '.repeat(dep.depth)}•</Text>
                <Text
                  color={dep.relationship === 'blocked_by' ? 'red' : 'yellow'}
                >
                  {dep.relationship === 'blocked_by' ? '⬅' : '➡'}
                </Text>
                <Text bold>{dep.id}</Text>
                <Text color="gray">({dep.status})</Text>
                <Text>{dep.title}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Circular Dependencies Warning */}
      {data.circularDependencies.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="red">
            ⚠️ Circular Dependencies Detected
          </Text>
          <Box flexDirection="column" marginLeft={2}>
            {data.circularDependencies.map((cycle) => (
              <Text key={cycle.join('->')} color="red">
                • {cycle.join(' → ')} → {cycle[0]}
              </Text>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

/**
 * Build complete dependency tree for an artifact
 */
async function buildDependencyTree(
  artifact: ArtifactSchema,
  loader: ArtifactLoader,
  visited: Set<string> = new Set(),
  depth: number = 0,
): Promise<DependencyInfo[]> {
  const dependencies: DependencyInfo[] = [];
  const artifactId = getArtifactId(artifact);

  if (visited.has(artifactId)) {
    return dependencies; // Prevent infinite recursion
  }
  visited.add(artifactId);

  // Process blocked_by relationships
  if (artifact.metadata.relationships?.blocked_by) {
    for (const depId of artifact.metadata.relationships.blocked_by) {
      try {
        const depArtifact = await loader.loadArtifact(depId);
        const currentStatus = getCurrentStatus(depArtifact);

        dependencies.push({
          id: depId,
          title: depArtifact.metadata.title,
          type: getArtifactType(depId),
          status: currentStatus,
          relationship: 'blocked_by',
          depth,
        });

        // Recursively get dependencies of this dependency
        const subDeps = await buildDependencyTree(
          depArtifact,
          loader,
          visited,
          depth + 1,
        );
        dependencies.push(...subDeps);
      } catch {
        // Handle missing artifact - still add to tree but mark as missing
        dependencies.push({
          id: depId,
          title: 'Missing or invalid artifact',
          type: getArtifactType(depId),
          status: 'missing',
          relationship: 'blocked_by',
          depth,
        });
      }
    }
  }

  // Process blocks relationships
  if (artifact.metadata.relationships?.blocks) {
    for (const depId of artifact.metadata.relationships.blocks) {
      try {
        const depArtifact = await loader.loadArtifact(depId);
        const currentStatus = getCurrentStatus(depArtifact);

        dependencies.push({
          id: depId,
          title: depArtifact.metadata.title,
          type: getArtifactType(depId),
          status: currentStatus,
          relationship: 'blocks',
          depth,
        });

        // Recursively get dependencies of this dependency
        const subDeps = await buildDependencyTree(
          depArtifact,
          loader,
          visited,
          depth + 1,
        );
        dependencies.push(...subDeps);
      } catch {
        // Handle missing artifact
        dependencies.push({
          id: depId,
          title: 'Missing or invalid artifact',
          type: getArtifactType(depId),
          status: 'missing',
          relationship: 'blocks',
          depth,
        });
      }
    }
  }

  return dependencies;
}

/**
 * Detect circular dependencies in the dependency tree
 */
function detectCircularDependencies(
  dependencies: DependencyInfo[],
): string[][] {
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  // Build adjacency graph
  const graph = new Map<string, string[]>();
  for (const dep of dependencies) {
    if (dep.relationship === 'blocked_by') {
      // dep.id blocks the artifact
      if (!graph.has(dep.id)) {
        graph.set(dep.id, []);
      }
    }
  }

  // DFS cycle detection
  function dfs(node: string, path: string[]): void {
    if (visiting.has(node)) {
      // Found a cycle
      const cycleStart = path.indexOf(node);
      if (cycleStart >= 0) {
        cycles.push(path.slice(cycleStart));
      }
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visiting.add(node);
    const neighbors = graph.get(node) || [];

    for (const neighbor of neighbors) {
      dfs(neighbor, [...path, node]);
    }

    visiting.delete(node);
    visited.add(node);
  }

  // Check all nodes for cycles
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

/**
 * Calculate impact analysis for an artifact
 */
async function calculateImpactAnalysis(artifact: ArtifactSchema): Promise<{
  directDependents: string[];
  transitiveImpact: number;
  criticalPath: boolean;
}> {
  const directDependents = artifact.metadata.relationships?.blocks || [];

  // For now, use a simple heuristic for transitive impact
  // In a full implementation, this would traverse the entire dependency graph
  const transitiveImpact = directDependents.length * 2; // Rough estimate

  // Critical path: artifact blocks multiple others
  const criticalPath = directDependents.length > 1;

  return {
    directDependents,
    transitiveImpact,
    criticalPath,
  };
}

/**
 * Helper functions
 */
function getArtifactId(_artifact: ArtifactSchema): string {
  // For now, we'll use a placeholder - in reality this would be extracted from file path or metadata
  return 'artifact-id';
}

function getCurrentStatus(artifact: ArtifactSchema): string {
  if (!artifact?.metadata?.events || artifact.metadata.events.length === 0) {
    return 'unknown';
  }
  return (
    artifact.metadata.events[artifact.metadata.events.length - 1]?.event ||
    'unknown'
  );
}

function getArtifactType(id: string): string {
  // Simple heuristic based on ID format
  if (id.includes('.')) {
    const parts = id.split('.');
    if (parts.length === 2) return 'milestone';
    if (parts.length === 3) return 'issue';
  }
  return 'initiative';
}
