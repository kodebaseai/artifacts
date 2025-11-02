/**
 * High-level service for artifact CRUD operations.
 *
 * Provides methods for creating, reading, updating, and appending events
 * to artifact files with proper directory structure handling.
 *
 * @module artifact-service
 */

import fs from "node:fs/promises";

import {
  readArtifact,
  resolveArtifactPaths,
  type TEvent,
  type TInitiative,
  type TIssue,
  type TMilestone,
  writeArtifact,
} from "@kodebase/core";

import { ArtifactNotFoundError } from "./errors.js";

/**
 * Union type of all artifact types.
 */
export type TAnyArtifact = TInitiative | TMilestone | TIssue;

/**
 * Options for creating an artifact.
 */
export interface CreateArtifactOptions {
  /** The artifact ID (e.g., "A", "A.1", "A.1.1") */
  id: string;
  /** The artifact data to create */
  artifact: TAnyArtifact;
  /** Optional human-readable slug for the artifact filename/directory */
  slug?: string;
  /** Base directory (defaults to process.cwd()) */
  baseDir?: string;
}

/**
 * Options for getting an artifact.
 */
export interface GetArtifactOptions {
  /** The artifact ID (e.g., "A", "A.1", "A.1.1") */
  id: string;
  /** Optional slug if the artifact has one */
  slug?: string;
  /** Base directory (defaults to process.cwd()) */
  baseDir?: string;
}

/**
 * Options for updating artifact metadata.
 */
export interface UpdateMetadataOptions {
  /** The artifact ID */
  id: string;
  /** Partial metadata updates to apply */
  updates: Partial<TAnyArtifact["metadata"]>;
  /** Optional slug if the artifact has one */
  slug?: string;
  /** Base directory (defaults to process.cwd()) */
  baseDir?: string;
}

/**
 * Options for appending an event to an artifact.
 */
export interface AppendEventOptions {
  /** The artifact ID */
  id: string;
  /** The event to append */
  event: TEvent;
  /** Optional slug if the artifact has one */
  slug?: string;
  /** Base directory (defaults to process.cwd()) */
  baseDir?: string;
}

/**
 * High-level artifact service providing CRUD operations.
 */
export class ArtifactService {
  /**
   * Creates a new artifact with proper directory structure.
   *
   * - Initiatives: Creates directory and file
   * - Milestones: Creates directory and file within parent initiative
   * - Issues: Creates file within parent milestone directory
   *
   * @param options - Creation options
   * @returns Path to the created artifact file
   * @throws Error if directory creation or file write fails
   *
   * @example
   * ```ts
   * import { ArtifactService } from "@kodebase/artifacts";
   * import { scaffoldInitiative } from "@kodebase/core";
   *
   * const service = new ArtifactService();
   * const initiative = scaffoldInitiative({
   *   title: "New Initiative",
   *   createdBy: "Alice (alice@example.com)",
   *   vision: "Build something great",
   *   scopeIn: ["Feature A"],
   *   scopeOut: ["Feature B"],
   *   successCriteria: ["All tests pass"]
   * });
   *
   * const filePath = await service.createArtifact({
   *   id: "A",
   *   artifact: initiative,
   *   slug: "new-initiative"
   * });
   * ```
   */
  async createArtifact(options: CreateArtifactOptions): Promise<string> {
    const { id, artifact, slug, baseDir = process.cwd() } = options;

    // Resolve paths
    const { dirPath, filePath } = await resolveArtifactPaths({
      id,
      slug,
      baseDir,
    });

    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });

    // Write artifact file
    await writeArtifact(filePath, artifact);

    return filePath;
  }

  /**
   * Retrieves an artifact by its ID.
   *
   * @param options - Get options
   * @returns The artifact data
   * @throws ArtifactNotFoundError if the artifact file doesn't exist
   *
   * @example
   * ```ts
   * import { ArtifactService } from "@kodebase/artifacts";
   *
   * const service = new ArtifactService();
   * const artifact = await service.getArtifact({ id: "A" });
   * console.log(artifact.metadata.title);
   * ```
   */
  async getArtifact(options: GetArtifactOptions): Promise<TAnyArtifact> {
    const { id, slug, baseDir = process.cwd() } = options;

    // Resolve paths
    const { filePath } = await resolveArtifactPaths({
      id,
      slug,
      baseDir,
    });

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new ArtifactNotFoundError(id, filePath);
      }
      throw error;
    }

    // Read and return artifact
    return await readArtifact<TAnyArtifact>(filePath);
  }

  /**
   * Updates artifact metadata while preserving the events array.
   *
   * This method reads the existing artifact, applies metadata updates,
   * and writes the modified artifact back to disk. The events array
   * is explicitly preserved to prevent accidental overwrites.
   *
   * @param options - Update options
   * @returns The updated artifact
   * @throws ArtifactNotFoundError if the artifact doesn't exist
   *
   * @example
   * ```ts
   * import { ArtifactService } from "@kodebase/artifacts";
   *
   * const service = new ArtifactService();
   * const updated = await service.updateMetadata({
   *   id: "A",
   *   updates: {
   *     title: "Updated Title",
   *     priority: "high"
   *   }
   * });
   * ```
   */
  async updateMetadata(options: UpdateMetadataOptions): Promise<TAnyArtifact> {
    const { id, updates, slug, baseDir = process.cwd() } = options;

    // Get existing artifact
    const artifact = await this.getArtifact({ id, slug, baseDir });

    // Preserve events array and apply updates
    const preservedEvents = artifact.metadata.events;
    const updatedArtifact = {
      ...artifact,
      metadata: {
        ...artifact.metadata,
        ...updates,
        events: preservedEvents, // Explicitly preserve events
      },
    };

    // Resolve paths
    const { filePath } = await resolveArtifactPaths({
      id,
      slug,
      baseDir,
    });

    // Write updated artifact
    await writeArtifact(filePath, updatedArtifact);

    return updatedArtifact;
  }

  /**
   * Appends a new event to an artifact's events array.
   *
   * This method maintains immutability by creating a new events array
   * with the new event appended to the end.
   *
   * @param options - Append event options
   * @returns The updated artifact
   * @throws ArtifactNotFoundError if the artifact doesn't exist
   *
   * @example
   * ```ts
   * import { ArtifactService } from "@kodebase/artifacts";
   *
   * const service = new ArtifactService();
   * const updated = await service.appendEvent({
   *   id: "A.1",
   *   event: {
   *     event: "ready",
   *     timestamp: "2025-11-02T12:00:00Z",
   *     actor: "Alice (alice@example.com)",
   *     trigger: "dependencies_met"
   *   }
   * });
   * ```
   */
  async appendEvent(options: AppendEventOptions): Promise<TAnyArtifact> {
    const { id, event, slug, baseDir = process.cwd() } = options;

    // Get existing artifact
    const artifact = await this.getArtifact({ id, slug, baseDir });

    // Create new events array with appended event (immutability)
    const updatedArtifact = {
      ...artifact,
      metadata: {
        ...artifact.metadata,
        events: [...artifact.metadata.events, event],
      },
    };

    // Resolve paths
    const { filePath } = await resolveArtifactPaths({
      id,
      slug,
      baseDir,
    });

    // Write updated artifact
    await writeArtifact(filePath, updatedArtifact);

    return updatedArtifact;
  }
}
