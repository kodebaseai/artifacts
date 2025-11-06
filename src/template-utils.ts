/**
 * Utility functions for artifact template generation.
 *
 * Provides slug generation and other template-related utilities
 * for creating artifacts with consistent naming.
 *
 * @module template-utils
 */

import type { TAnyArtifact, TArtifactEvent } from "@kodebase/core";

/**
 * Regular expression pattern for matching artifact IDs.
 *
 * Matches patterns like: A.1, B.2.3, C.4.1.2
 * Format: Single uppercase letter, followed by dot-separated numbers
 *
 * @example
 * ```ts
 * const text = "Working on A.1.5 and B.2.3";
 * const matches = text.match(ARTIFACT_ID_REGEX);
 * // ["A.1.5", "B.2.3"]
 * ```
 */
export const ARTIFACT_ID_REGEX = /\b[A-Z]\.\d+(?:\.\d+)*\b/g;

/**
 * Generates a URL-safe slug from a title.
 *
 * Converts a human-readable title into a lowercase, hyphen-separated
 * slug suitable for URLs and file/directory names.
 *
 * @param title - The title to convert to a slug
 * @returns URL-safe slug (lowercase, hyphenated)
 *
 * @example
 * ```ts
 * generateSlug("My Feature Title")  // "my-feature-title"
 * generateSlug("API v2.0!")         // "api-v2-0"
 * generateSlug("User Auth")         // "user-auth"
 * ```
 */
export function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      // Replace sequences of non-alphanumeric characters with single hyphen
      .replace(/[^a-z0-9]+/g, "-")
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, "")
  );
}

/**
 * Gets the current state of an artifact from its event history.
 *
 * Returns the event type of the most recent event in the artifact's
 * event history, or null if no events exist.
 *
 * @param artifact - The artifact to check
 * @returns The current state (last event) or null if no events
 *
 * @example
 * ```ts
 * const artifact = await loadArtifact("A.1.1");
 * const state = getCurrentState(artifact);
 * // "in_progress" | "draft" | "blocked" | etc.
 * ```
 */
export function getCurrentState(artifact: TAnyArtifact): TArtifactEvent | null {
  const events = artifact.metadata.events;
  if (!events || events.length === 0) {
    return null;
  }
  return (events[events.length - 1]?.event as TArtifactEvent) ?? null;
}

/**
 * Extract artifact IDs from branch name, PR title, and PR body.
 *
 * Searches for patterns like A.1.5, B.2.3, C.4.1.2 across the provided
 * text sources and returns a sorted, deduplicated array of artifact IDs.
 *
 * @param branchName - Git branch name to search (e.g., "A.1.5-feature")
 * @param prTitle - Pull request title to search
 * @param prBody - Pull request body to search
 * @returns Sorted array of unique artifact IDs found
 *
 * @example
 * ```ts
 * const ids = extractArtifactIds(
 *   "A.1.5-implement-feature",
 *   "[A.1.5] Add new feature",
 *   "Implements A.1.5 and depends on B.2.3"
 * );
 * // ["A.1.5", "B.2.3"]
 * ```
 */
export function extractArtifactIds(
  branchName: string | null,
  prTitle: string | null,
  prBody: string | null,
): string[] {
  const artifacts = new Set<string>();

  // Extract from branch name
  if (branchName) {
    const matches = branchName.match(ARTIFACT_ID_REGEX);
    if (matches) {
      for (const match of matches) {
        artifacts.add(match);
      }
    }
  }

  // Extract from PR title
  if (prTitle) {
    const matches = prTitle.match(ARTIFACT_ID_REGEX);
    if (matches) {
      for (const match of matches) {
        artifacts.add(match);
      }
    }
  }

  // Extract from PR body
  if (prBody) {
    const matches = prBody.match(ARTIFACT_ID_REGEX);
    if (matches) {
      for (const match of matches) {
        artifacts.add(match);
      }
    }
  }

  return Array.from(artifacts).sort();
}

/**
 * Extracts the slug portion from an artifact's directory path.
 *
 * Given an artifact ID, locates its file in the artifacts directory and
 * extracts the slug from the directory name (format: "{id}-{slug}").
 *
 * @param artifactId - The artifact ID to find (e.g., "A.1.5")
 * @param baseDir - Base directory of the repository
 * @returns The slug portion or undefined if not found
 *
 * @example
 * ```ts
 * // For directory: .kodebase/artifacts/A.1.5-my-feature/A.1.5.yml
 * const slug = await getArtifactSlug("A.1.5", "/path/to/repo");
 * // "my-feature"
 * ```
 */
export async function getArtifactSlug(
  artifactId: string,
  baseDir: string,
): Promise<string | undefined> {
  const { loadAllArtifactPaths, getArtifactIdFromPath } = await import(
    "@kodebase/core"
  );

  const artifactsRoot = `${baseDir}/.kodebase/artifacts`;
  const allPaths = await loadAllArtifactPaths(artifactsRoot);

  // Find the path for this artifact
  const artifactPath = allPaths.find((p) => {
    const id = getArtifactIdFromPath(p);
    return id === artifactId;
  });

  if (!artifactPath) {
    return undefined;
  }

  // Extract slug based on artifact type
  const pathParts = artifactPath.split("/");
  const fileName = pathParts[pathParts.length - 1];
  const dirName = pathParts[pathParts.length - 2];

  if (!fileName || !dirName) {
    return undefined;
  }

  // Check if this is an issue artifact (3+ segments in ID)
  const idSegments = artifactId.split(".");
  if (idSegments.length >= 3) {
    // Issue: filename format is {id}.{slug}.yml or {id}.yml
    // Example: A.1.2.my-issue.yml
    const fileNameWithoutExt = fileName.replace(/\.yml$/, "");
    if (fileNameWithoutExt === artifactId) {
      // No slug (just A.1.2.yml)
      return undefined;
    }
    // Extract slug: remove artifact ID and dot
    const slug = fileNameWithoutExt.substring(artifactId.length + 1);
    return slug || undefined;
  }

  // Initiative or Milestone: directory format is {id}.{slug}
  // Example: A.my-init or A.1.my-milestone
  const slug = dirName.substring(artifactId.length + 1);
  return slug || undefined;
}
