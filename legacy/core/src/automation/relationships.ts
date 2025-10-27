/**
 * Bidirectional Relationship Management for Kodebase Artifacts
 *
 * This module provides utilities for managing bidirectional relationships
 * between artifacts, ensuring data consistency and referential integrity.
 * All operations update both sides of the relationship atomically.
 */

import type { Artifact } from '../data/types';
import { hasCircularDependency } from './validation/dependencies';

/**
 * Result of a relationship operation
 */
export interface RelationshipOperationResult {
  success: boolean;
  updatedArtifacts: Map<string, Artifact>;
  error?: string;
}

/**
 * Deep clones an artifact to ensure immutability
 */
function cloneArtifact(artifact: Artifact): Artifact {
  return JSON.parse(JSON.stringify(artifact));
}

/**
 * Adds a blocking relationship between two artifacts
 * Updates both artifacts atomically: A blocks B, B is blocked by A
 *
 * @param blockerId - The artifact that blocks
 * @param blockedId - The artifact that is blocked
 * @param artifacts - Map of all artifacts
 * @returns Operation result with updated artifacts
 */
export function addBlocks(
  blockerId: string,
  blockedId: string,
  artifacts: Map<string, Artifact>,
): RelationshipOperationResult {
  // Validate both artifacts exist
  const blocker = artifacts.get(blockerId);
  const blocked = artifacts.get(blockedId);

  if (!blocker) {
    return {
      success: false,
      updatedArtifacts: new Map(),
      error: `Artifact ${blockerId} does not exist`,
    };
  }

  if (!blocked) {
    return {
      success: false,
      updatedArtifacts: new Map(),
      error: `Artifact ${blockedId} does not exist`,
    };
  }

  // Check if relationship already exists
  if (
    blocker.metadata.relationships.blocks.includes(blockedId) &&
    blocked.metadata.relationships.blocked_by.includes(blockerId)
  ) {
    // Relationship already exists, return current state
    return {
      success: true,
      updatedArtifacts: new Map([
        [blockerId, blocker],
        [blockedId, blocked],
      ]),
    };
  }

  // Clone artifacts for immutability
  const updatedBlocker = cloneArtifact(blocker);
  const updatedBlocked = cloneArtifact(blocked);

  // Add the relationship if it doesn't exist
  if (!updatedBlocker.metadata.relationships.blocks.includes(blockedId)) {
    updatedBlocker.metadata.relationships.blocks.push(blockedId);
  }
  if (!updatedBlocked.metadata.relationships.blocked_by.includes(blockerId)) {
    updatedBlocked.metadata.relationships.blocked_by.push(blockerId);
  }

  // Check for circular dependencies
  const testArtifacts = new Map(artifacts);
  testArtifacts.set(blockerId, updatedBlocker);
  testArtifacts.set(blockedId, updatedBlocked);

  const testRelationships = new Map(
    Array.from(testArtifacts.entries()).map(([id, artifact]) => [
      id,
      artifact.metadata.relationships,
    ]),
  );

  if (hasCircularDependency(blockerId, testRelationships)) {
    return {
      success: false,
      updatedArtifacts: new Map(),
      error: 'Adding this relationship would create a circular dependency',
    };
  }

  return {
    success: true,
    updatedArtifacts: new Map([
      [blockerId, updatedBlocker],
      [blockedId, updatedBlocked],
    ]),
  };
}

/**
 * Removes a blocking relationship between two artifacts
 * Updates both artifacts atomically
 *
 * @param blockerId - The artifact that blocks
 * @param blockedId - The artifact that is blocked
 * @param artifacts - Map of all artifacts
 * @returns Operation result with updated artifacts
 */
export function removeBlocks(
  blockerId: string,
  blockedId: string,
  artifacts: Map<string, Artifact>,
): RelationshipOperationResult {
  // Validate both artifacts exist
  const blocker = artifacts.get(blockerId);
  const blocked = artifacts.get(blockedId);

  if (!blocker) {
    return {
      success: false,
      updatedArtifacts: new Map(),
      error: `Artifact ${blockerId} does not exist`,
    };
  }

  if (!blocked) {
    return {
      success: false,
      updatedArtifacts: new Map(),
      error: `Artifact ${blockedId} does not exist`,
    };
  }

  // Check if relationship exists
  const blockerHasRelation =
    blocker.metadata.relationships.blocks.includes(blockedId);
  const blockedHasRelation =
    blocked.metadata.relationships.blocked_by.includes(blockerId);

  if (!blockerHasRelation && !blockedHasRelation) {
    // No relationship exists, nothing to remove
    return {
      success: true,
      updatedArtifacts: new Map(),
    };
  }

  // Clone artifacts for immutability
  const updatedBlocker = cloneArtifact(blocker);
  const updatedBlocked = cloneArtifact(blocked);

  // Remove the relationships
  updatedBlocker.metadata.relationships.blocks =
    updatedBlocker.metadata.relationships.blocks.filter(
      (id) => id !== blockedId,
    );
  updatedBlocked.metadata.relationships.blocked_by =
    updatedBlocked.metadata.relationships.blocked_by.filter(
      (id) => id !== blockerId,
    );

  return {
    success: true,
    updatedArtifacts: new Map([
      [blockerId, updatedBlocker],
      [blockedId, updatedBlocked],
    ]),
  };
}

/**
 * Adds a blocked-by relationship (inverse of addBlocks)
 * Updates both artifacts atomically: A is blocked by B, B blocks A
 *
 * @param blockedId - The artifact that is blocked
 * @param blockerId - The artifact that blocks
 * @param artifacts - Map of all artifacts
 * @returns Operation result with updated artifacts
 */
export function addBlockedBy(
  blockedId: string,
  blockerId: string,
  artifacts: Map<string, Artifact>,
): RelationshipOperationResult {
  // This is the inverse of addBlocks
  return addBlocks(blockerId, blockedId, artifacts);
}

/**
 * Removes a blocked-by relationship (inverse of removeBlocks)
 * Updates both artifacts atomically
 *
 * @param blockedId - The artifact that is blocked
 * @param blockerId - The artifact that blocks
 * @param artifacts - Map of all artifacts
 * @returns Operation result with updated artifacts
 */
export function removeBlockedBy(
  blockedId: string,
  blockerId: string,
  artifacts: Map<string, Artifact>,
): RelationshipOperationResult {
  // This is the inverse of removeBlocks
  return removeBlocks(blockerId, blockedId, artifacts);
}
