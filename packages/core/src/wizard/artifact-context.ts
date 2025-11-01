import path from "node:path";

import { CArtifact, type TArtifactType } from "../constants.js";
import { loadAllArtifactPaths } from "../loading/artifact-loader.js";
import { getArtifactIdFromPath } from "../loading/artifact-paths.js";

const ARTIFACTS_DIR = ".kodebase/artifacts";

/**
 * Detects what type of child artifact can be created under the given parent ID.
 * Used by the wizard to determine what artifacts to prompt for.
 *
 * @param parentId - Parent artifact ID, or null/undefined for new initiative
 * @returns Child artifact type that can be created under this parent
 *
 * @example
 * detectContextLevel(null) // "initiative" - no parent means creating new initiative
 * detectContextLevel("A") // "milestone" - parent is initiative, create milestone
 * detectContextLevel("A.1") // "issue" - parent is milestone, create issue
 * detectContextLevel("ABC") // "milestone" - multi-letter initiative
 */
export function detectContextLevel(parentId?: string | null): TArtifactType {
  // No parent → creating a new initiative
  if (!parentId) {
    return CArtifact.INITIATIVE;
  }

  // Validate parent ID format
  const idPattern = /^[A-Z]+(?:\.\d+)*$/;
  if (!idPattern.test(parentId)) {
    throw new Error(
      `Invalid parent ID "${parentId}". Expected format: A, AA, A.1, AB.123, etc.`,
    );
  }

  const segments = parentId.split(".");

  // Initiative parent (1 segment) → create milestone
  // Milestone parent (2 segments) → create issue
  // Issues (3+ segments) cannot be parents
  if (segments.length === 1) {
    return CArtifact.MILESTONE;
  }
  if (segments.length === 2) {
    return CArtifact.ISSUE;
  }

  throw new Error(
    `Cannot create child artifacts under issue "${parentId}". Issues cannot have children.`,
  );
}

/**
 * Allocates the next available ID for a new artifact under the given parent.
 * Scans siblings and returns the next numeric segment in order.
 * Handles sparse ranges (always uses max+1, never fills gaps).
 *
 * @param parentId - Parent artifact ID (e.g., "A" for milestones, "A.1" for issues)
 * @param baseDir - Base directory (defaults to process.cwd())
 * @returns Next ID (e.g., "A.2", "A.1.5")
 *
 * @example
 * // Parent "A" has milestones A.1, A.2 → returns "A.3"
 * allocateNextId("A") // "A.3"
 *
 * // Parent "A.1" has issues A.1.1, A.1.3 → returns "A.1.4" (handles sparse ranges)
 * allocateNextId("A.1") // "A.1.4"
 *
 * // Parent "A" has no milestones → returns "A.1"
 * allocateNextId("A") // "A.1"
 *
 * // Multi-letter initiatives work too
 * allocateNextId("ABC") // "ABC.1"
 */
export async function allocateNextId(
  parentId: string,
  baseDir: string = process.cwd(),
): Promise<string> {
  // Validate parent ID format
  const idPattern = /^[A-Z]+(?:\.\d+)*$/;
  if (!idPattern.test(parentId)) {
    throw new Error(
      `Invalid parent ID "${parentId}". Expected format: A, AA, A.1, AB.123, etc.`,
    );
  }

  const segments = parentId.split(".");
  const segmentCount = segments.length;

  // Parent must be initiative (1 segment) or milestone (2 segments)
  if (segmentCount > 2) {
    throw new Error(
      `Cannot allocate child ID for issue "${parentId}". Parent must be an initiative or milestone.`,
    );
  }

  const artifactsRoot = path.join(baseDir, ARTIFACTS_DIR);

  // Load all artifact paths and filter to children of this parent
  let allPaths: string[];
  try {
    allPaths = await loadAllArtifactPaths(artifactsRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // No artifacts directory yet, this will be the first child
      return `${parentId}.1`;
    }
    throw error;
  }

  // Extract IDs and filter to direct children
  const childIds: string[] = [];
  for (const filePath of allPaths) {
    const id = getArtifactIdFromPath(filePath);
    if (!id) continue;

    // Check if this is a direct child of the parent
    const idSegments = id.split(".");
    if (idSegments.length !== segmentCount + 1) continue;

    // Check if parent prefix matches
    const idParent = idSegments.slice(0, segmentCount).join(".");
    if (idParent === parentId) {
      childIds.push(id);
    }
  }

  // If no children exist, return .1
  if (childIds.length === 0) {
    return `${parentId}.1`;
  }

  // Extract numeric segments and find max
  const numericSegments = childIds.map((id) => {
    const segments = id.split(".");
    const lastSegment = segments[segments.length - 1];
    if (!lastSegment) {
      throw new Error(`Invalid artifact ID "${id}": missing numeric segment`);
    }
    return Number.parseInt(lastSegment, 10);
  });

  const maxSegment = Math.max(...numericSegments);
  return `${parentId}.${maxSegment + 1}`;
}
