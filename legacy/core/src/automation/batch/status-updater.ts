/**
 * Bulk Status Updater
 *
 * Implements parallel status updates for multiple artifacts with error isolation,
 * transition validation, and progress reporting.
 */

import type { Artifact, TArtifactEvent } from '../../data/types';
import { canTransition, performTransition } from '../validation/state-helpers';
import type {
  BatchResult,
  BulkStatusUpdateConfig,
  BulkStatusUpdater,
} from './index';
import { BatchProcessor } from './processor';

/**
 * Implementation of bulk status updates
 */
class BulkStatusUpdaterImpl implements BulkStatusUpdater {
  private processor: BatchProcessor;

  constructor() {
    this.processor = new BatchProcessor();
  }

  /**
   * Update statuses for multiple artifacts in parallel
   *
   * @param artifacts - Array of artifacts to update
   * @param targetState - Target state to transition to
   * @param config - Update configuration
   * @returns Batch update result
   */
  async updateStatuses(
    artifacts: Artifact[],
    targetState: TArtifactEvent,
    config: BulkStatusUpdateConfig,
  ): Promise<BatchResult<void>> {
    const { validateTransitions = true } = config;

    return this.processor.processArtifacts(
      artifacts,
      async (artifact) => {
        // Validate transition if required
        if (validateTransitions && !canTransition(artifact, targetState)) {
          throw new Error(
            `Invalid transition to ${targetState} for artifact ${this.getArtifactId(artifact)}`,
          );
        }

        // Perform the transition (modifies artifact in place)
        performTransition(artifact, targetState, config.actor, config.metadata);

        // Return void as we're updating in place
        return undefined as undefined;
      },
      {
        maxConcurrency: config.maxConcurrency,
        progressCallback: config.progressCallback
          ? (current, total, _operation) =>
              config.progressCallback?.(
                current,
                total,
                `Updating to ${targetState}`,
              )
          : undefined,
      },
    );
  }

  /**
   * Update statuses for multiple artifacts by IDs in parallel
   *
   * @param artifactIds - Array of artifact IDs to update
   * @param targetState - Target state to transition to
   * @param artifactLoader - Function to load artifacts by ID
   * @param config - Update configuration
   * @returns Batch update result
   */
  async updateStatusesByIds(
    artifactIds: string[],
    targetState: TArtifactEvent,
    artifactLoader: (id: string) => Promise<Artifact>,
    config: BulkStatusUpdateConfig,
  ): Promise<BatchResult<void>> {
    // Create dummy artifacts with ID information for processing
    const dummyArtifacts = artifactIds.map((id) => ({
      metadata: { title: `Updating ${id}` },
      content: {},
      _artifactId: id,
    })) as unknown as Artifact[];

    const { validateTransitions = true } = config;

    return this.processor.processArtifacts(
      dummyArtifacts,
      async (dummyArtifact) => {
        // biome-ignore lint/suspicious/noExplicitAny: Accessing custom property on dummy artifact carrier object - _artifactId is not part of Artifact but temporarily attached for batch processing
        const artifactId = (dummyArtifact as any)._artifactId;

        try {
          // Load the actual artifact
          const artifact = await artifactLoader(artifactId);

          // Validate transition if required
          if (validateTransitions && !canTransition(artifact, targetState)) {
            throw new Error(
              `Invalid transition to ${targetState} for artifact ${artifactId}`,
            );
          }

          // Perform the transition (modifies artifact in place)
          performTransition(
            artifact,
            targetState,
            config.actor,
            config.metadata,
          );

          // Return void as we're updating in place
          return undefined as undefined;
        } catch (error) {
          throw new Error(
            `Failed to update artifact ${artifactId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
      {
        maxConcurrency: config.maxConcurrency,
        progressCallback: config.progressCallback
          ? (current, total, _operation) =>
              config.progressCallback?.(
                current,
                total,
                `Updating to ${targetState}`,
              )
          : undefined,
      },
    );
  }

  /**
   * Get artifact ID for tracking
   */
  private getArtifactId(artifact: Artifact): string {
    // Try to extract ID from common patterns
    if ('id' in artifact && typeof artifact.id === 'string') {
      return artifact.id;
    }

    // Fallback to title
    return artifact.metadata.title || 'unknown';
  }
}

/**
 * Factory function to create a bulk status updater
 */
export function createBulkStatusUpdater(): BulkStatusUpdater {
  return new BulkStatusUpdaterImpl();
}

/**
 * Convenience function for parallel status updates
 *
 * @param artifacts - Array of artifacts to update
 * @param targetState - Target state to transition to
 * @param config - Update configuration
 * @returns Batch update result
 */
export async function updateStatusesInParallel(
  artifacts: Artifact[],
  targetState: TArtifactEvent,
  config: BulkStatusUpdateConfig,
): Promise<BatchResult<void>> {
  const updater = createBulkStatusUpdater();
  return updater.updateStatuses(artifacts, targetState, config);
}

/**
 * Convenience function for parallel status updates by IDs
 *
 * @param artifactIds - Array of artifact IDs to update
 * @param targetState - Target state to transition to
 * @param artifactLoader - Function to load artifacts by ID
 * @param config - Update configuration
 * @returns Batch update result
 */
export async function updateStatusesByIdsInParallel(
  artifactIds: string[],
  targetState: TArtifactEvent,
  artifactLoader: (id: string) => Promise<Artifact>,
  config: BulkStatusUpdateConfig,
): Promise<BatchResult<void>> {
  const updater = createBulkStatusUpdater();
  return updater.updateStatusesByIds(
    artifactIds,
    targetState,
    artifactLoader,
    config,
  );
}
