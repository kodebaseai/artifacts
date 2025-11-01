import path from "node:path";

import {
  CArtifact,
  CArtifactEvent,
  type TArtifactEvent,
} from "../constants.js";
import { readArtifact } from "../loading/artifact-file-service.js";
import { loadAllArtifactPaths } from "../loading/artifact-loader.js";
import { getArtifactIdFromPath } from "../loading/artifact-paths.js";

/**
 * Result of checking if an ancestor artifact is blocked or cancelled.
 */
export interface AncestorGatingResult {
  /** True if any ancestor is blocked or cancelled */
  isBlocked: boolean;
  /** Human-readable reason explaining the gating decision */
  reason: string;
}

/**
 * Minimal artifact structure needed for state checking.
 * We only care about the events array to determine current state.
 */
interface MinimalArtifact {
  metadata: {
    events: Array<{
      event: TArtifactEvent;
      timestamp: string;
      actor: string;
      trigger: string;
    }>;
  };
}

/**
 * Extracts the parent chain from an artifact ID.
 * Returns parents in order from immediate parent to root.
 *
 * @param artifactId - The artifact ID (e.g., "A.1.2")
 * @returns Array of parent IDs (e.g., ["A.1", "A"])
 *
 * @example
 * getParentChain("A.1.2") // ["A.1", "A"]
 * getParentChain("A.1")   // ["A"]
 * getParentChain("A")     // []
 */
function getParentChain(artifactId: string): string[] {
  const segments = artifactId.split(".");
  const parents: string[] = [];

  // Walk backward from immediate parent to root
  for (let i = segments.length - 1; i > 0; i--) {
    parents.push(segments.slice(0, i).join("."));
  }

  return parents;
}

/**
 * Gets the current state of an artifact by examining its last event.
 *
 * @param artifact - Minimal artifact with metadata.events
 * @returns The current state (event type) or null if no events
 */
function getCurrentState(artifact: MinimalArtifact): TArtifactEvent | null {
  const events = artifact.metadata.events;
  if (!events || events.length === 0) {
    return null;
  }

  const latestEvent = events[events.length - 1];
  return latestEvent?.event ?? null;
}

/**
 * Determines the artifact type name from its ID for better error messages.
 *
 * @param artifactId - The artifact ID
 * @returns Human-readable artifact type ("initiative", "milestone", or "issue")
 */
function getArtifactTypeName(artifactId: string): string {
  const segments = artifactId.split(".");
  if (segments.length === 1) return CArtifact.INITIATIVE;
  if (segments.length === 2) return CArtifact.MILESTONE;
  return CArtifact.ISSUE;
}

/**
 * Runtime gating helper: checks if any ancestor in the parent chain is blocked or cancelled.
 *
 * This enforces the implicit rule that parent state gates child operations:
 * - If a parent initiative is blocked/cancelled, its milestones and issues cannot progress
 * - If a parent milestone is blocked/cancelled, its issues cannot progress
 *
 * Used by CLI commands (e.g., `kodebase work --check-parent`) and pre-flight validation
 * to prevent operations on children of blocked/cancelled ancestors.
 *
 * **Note:** This only checks parent blocking (implicit). Sibling blocking (explicit via
 * relationships.blocked_by) is handled separately by the cascade engine.
 *
 * @param artifactId - The artifact ID to check (e.g., "A.1.2")
 * @param artifactsRoot - Base artifacts directory (defaults to process.cwd() + ".kodebase/artifacts")
 * @returns Result object with isBlocked flag and human-readable reason
 *
 * @example
 * // Check if can work on issue A.1.2
 * const result = await isAncestorBlockedOrCancelled("A.1.2");
 * if (result.isBlocked) {
 *   console.error(result.reason); // "Parent milestone A.1 is blocked"
 *   process.exit(1);
 * }
 *
 * @example
 * // All parents healthy
 * await isAncestorBlockedOrCancelled("A.1.2");
 * // { isBlocked: false, reason: "No blocking ancestors" }
 *
 * @example
 * // Initiative at root (no parents)
 * await isAncestorBlockedOrCancelled("A");
 * // { isBlocked: false, reason: "No ancestors to check" }
 */
export async function isAncestorBlockedOrCancelled(
  artifactId: string,
  artifactsRoot?: string,
): Promise<AncestorGatingResult> {
  // Validate artifact ID format
  const idPattern = /^[A-Z]+(?:\.\d+)*$/;
  if (!idPattern.test(artifactId)) {
    throw new Error(
      `Invalid artifact ID "${artifactId}". Expected format: A, AA, A.1, AB.123, etc.`,
    );
  }

  // Extract parent chain (immediate parent first, then grandparents)
  const parentChain = getParentChain(artifactId);

  // No parents = initiative at root level
  if (parentChain.length === 0) {
    return {
      isBlocked: false,
      reason: "No ancestors to check",
    };
  }

  // Default artifacts root to current working directory
  const root = artifactsRoot ?? path.join(process.cwd(), ".kodebase/artifacts");

  // Check each parent in order (closest first)
  for (const parentId of parentChain) {
    try {
      // Find parent artifact file by scanning artifacts directory
      const allPaths = await loadAllArtifactPaths(root);

      // Find the file that matches this parent ID
      let parentFilePath: string | null = null;
      for (const artifactPath of allPaths) {
        const id = getArtifactIdFromPath(artifactPath);
        if (id === parentId) {
          parentFilePath = artifactPath;
          break;
        }
      }

      if (!parentFilePath) {
        // Parent artifact not found
        // This is defensive: allow operation rather than blocking
        return {
          isBlocked: false,
          reason: `Parent ${parentId} not found (allowing operation)`,
        };
      }

      // Load parent artifact (only need metadata.events)
      const parentArtifact =
        await readArtifact<MinimalArtifact>(parentFilePath);

      // Get current state from last event
      const currentState = getCurrentState(parentArtifact);

      // Check if parent is blocked or cancelled
      if (
        currentState === CArtifactEvent.BLOCKED ||
        currentState === CArtifactEvent.CANCELLED
      ) {
        const parentType = getArtifactTypeName(parentId);
        return {
          isBlocked: true,
          reason: `Parent ${parentType} ${parentId} is ${currentState}`,
        };
      }

      // Parent is healthy, continue to next parent
    } catch {
      // Error loading artifacts directory or reading parent file
      // This is defensive: allow operation rather than blocking
      return {
        isBlocked: false,
        reason: `Parent ${parentId} not found (allowing operation)`,
      };
    }
  }

  // All parents checked and healthy
  return {
    isBlocked: false,
    reason: "No blocking ancestors",
  };
}
