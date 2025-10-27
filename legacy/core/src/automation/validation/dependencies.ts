/**
 * Dependency Validation for Kodebase
 *
 * Validates dependency relationships between artifacts to ensure consistency
 * and prevent circular dependencies or orphaned artifacts.
 */

import type { RelationshipsMetadata } from '../../data/types';

/**
 * Custom error class for dependency validation errors
 * @class DependencyValidationError
 * @description Custom error class for dependency validation errors
 * @param message - The error message
 * @returns DependencyValidationError
 */
export class DependencyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DependencyValidationError';
  }
}

/**
 * Validates all dependency relationships in a set of artifacts
 *
 * @param artifacts - Map of artifact IDs to their relationships
 * @returns void
 * @throws DependencyValidationError if validation fails
 */
export function validateDependencies(
  artifacts: Map<string, RelationshipsMetadata>,
): void {
  // Check for missing dependencies
  for (const [artifactId, relationships] of artifacts) {
    for (const blockedBy of relationships.blocked_by) {
      if (!artifacts.has(blockedBy)) {
        throw new DependencyValidationError(
          `Artifact ${artifactId} depends on non-existent artifact ${blockedBy}`,
        );
      }
    }

    for (const blocks of relationships.blocks) {
      if (!artifacts.has(blocks)) {
        throw new DependencyValidationError(
          `Artifact ${artifactId} blocks non-existent artifact ${blocks}`,
        );
      }
    }
  }

  // Check for bidirectional consistency
  for (const [artifactId, relationships] of artifacts) {
    // For each artifact this one blocks, ensure that artifact knows it's blocked
    for (const blockedId of relationships.blocks) {
      const blockedArtifact = artifacts.get(blockedId);
      if (blockedArtifact && !blockedArtifact.blocked_by.includes(artifactId)) {
        throw new DependencyValidationError(
          `Inconsistent dependency: ${artifactId} blocks ${blockedId}, but ${blockedId} doesn't list ${artifactId} in blocked_by`,
        );
      }
    }

    // For each artifact that blocks this one, ensure that artifact knows it blocks this one
    for (const blockerId of relationships.blocked_by) {
      const blockerArtifact = artifacts.get(blockerId);
      if (blockerArtifact && !blockerArtifact.blocks.includes(artifactId)) {
        throw new DependencyValidationError(
          `Inconsistent dependency: ${blockerId} should block ${artifactId}, but doesn't list it in blocks`,
        );
      }
    }
  }

  // Check for circular dependencies
  for (const artifactId of artifacts.keys()) {
    if (hasCircularDependency(artifactId, artifacts)) {
      throw new DependencyValidationError(
        `Circular dependency detected involving artifact ${artifactId}`,
      );
    }
  }
}

/**
 * Checks if an artifact has circular dependencies
 *
 * @param artifactId - The artifact to check
 * @param artifacts - Map of all artifacts and their relationships
 * @param visited - Set of visited artifacts (used for recursion)
 * @param path - Current path (used for cycle detection)
 * @returns True if circular dependency exists
 */
export function hasCircularDependency(
  artifactId: string,
  artifacts: Map<string, RelationshipsMetadata>,
  visited: Set<string> = new Set(),
  path: Set<string> = new Set(),
): boolean {
  if (path.has(artifactId)) {
    return true; // Found a cycle
  }

  if (visited.has(artifactId)) {
    return false; // Already checked this path
  }

  visited.add(artifactId);
  path.add(artifactId);

  const relationships = artifacts.get(artifactId);
  if (relationships) {
    for (const dependency of relationships.blocked_by) {
      if (hasCircularDependency(dependency, artifacts, visited, path)) {
        return true;
      }
    }
  }

  path.delete(artifactId);
  return false;
}

/**
 * Finds artifacts that are blocked by cancelled dependencies
 *
 * @param artifacts - Map of artifact IDs to their relationships
 * @param statuses - Map of artifact IDs to their current status
 * @returns Array of orphaned artifact IDs
 * @throws DependencyValidationError if validation fails
 */
export function findOrphanedArtifacts(
  artifacts: Map<string, RelationshipsMetadata>,
  statuses: Map<string, string>,
): string[] {
  const orphaned: string[] = [];

  for (const [artifactId, relationships] of artifacts) {
    const status = statuses.get(artifactId);

    // Only check blocked artifacts
    if (status === 'blocked') {
      // Check if any of its dependencies are cancelled
      const hasCancelledDependency = relationships.blocked_by.some(
        (dep) => statuses.get(dep) === 'cancelled',
      );

      if (hasCancelledDependency) {
        orphaned.push(artifactId);
      }
    }
  }

  return orphaned;
}

/**
 * Gets all artifacts that depend on a given artifact
 *
 * @param artifactId - The artifact to find dependents for
 * @param artifacts - Map of all artifacts and their relationships
 * @returns Array of dependent artifact IDs
 * @throws DependencyValidationError if validation fails
 */
export function getDependents(
  artifactId: string,
  artifacts: Map<string, RelationshipsMetadata>,
): string[] {
  const dependents: string[] = [];

  for (const [id, relationships] of artifacts) {
    if (relationships.blocked_by.includes(artifactId)) {
      dependents.push(id);
    }
  }

  return dependents;
}

/**
 * Gets all dependencies of a given artifact (transitive closure)
 *
 * @param artifactId - The artifact to find dependencies for
 * @param artifacts - Map of all artifacts and their relationships
 * @returns Array of all dependency artifact IDs
 * @throws DependencyValidationError if validation fails
 */
export function getAllDependencies(
  artifactId: string,
  artifacts: Map<string, RelationshipsMetadata>,
): string[] {
  const dependencies = new Set<string>();
  const toProcess = [artifactId];

  while (toProcess.length > 0) {
    const current = toProcess.pop();
    if (!current) continue;
    const relationships = artifacts.get(current);

    if (relationships) {
      for (const dep of relationships.blocked_by) {
        if (!dependencies.has(dep)) {
          dependencies.add(dep);
          toProcess.push(dep);
        }
      }
    }
  }

  return Array.from(dependencies);
}
