/**
 * Artifact file discovery and loading utilities.
 *
 * Functions for recursively scanning artifact directories and
 * filtering artifacts by type.
 *
 * @module artifact-loader
 */

import fs from "node:fs/promises";
import path from "node:path";

import { getArtifactIdFromPath } from "./artifact-paths.js";

/**
 * Recursively load all artifact file paths from the artifacts directory.
 *
 * Walks the artifacts directory tree, finds all valid artifact YAML files,
 * and returns their absolute paths sorted alphabetically.
 *
 * @param artifactsRoot - Root artifacts directory (e.g., .kodebase/artifacts)
 * @returns Sorted array of absolute file paths to artifact YAML files
 *
 * @example
 * ```ts
 * import { loadAllArtifactPaths } from "@kodebase/core";
 *
 * const paths = await loadAllArtifactPaths(".kodebase/artifacts");
 * // [
 * //   "/path/.kodebase/artifacts/A.initiative.yml",
 * //   "/path/.kodebase/artifacts/A.1.milestone.yml",
 * //   "/path/.kodebase/artifacts/A.1.1.issue.yml"
 * // ]
 * ```
 */
export async function loadAllArtifactPaths(
  artifactsRoot: string,
): Promise<string[]> {
  const result: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && getArtifactIdFromPath(fullPath)) {
        result.push(fullPath);
      }
    }
  }

  await walk(artifactsRoot);
  result.sort();
  return result;
}

/**
 * Filter artifact paths by type based on ID structure.
 *
 * Extracts artifact IDs from file paths and filters by type:
 * - Initiatives: single-segment IDs (A, B, AA)
 * - Milestones: two-segment IDs (A.1, B.2)
 * - Issues: three-segment IDs (A.1.1, B.2.3)
 *
 * @param artifactPaths - Array of artifact file paths
 * @param type - Artifact type to filter for
 * @returns Sorted array of artifact IDs matching the type
 *
 * @example
 * ```ts
 * import { loadAllArtifactPaths, loadArtifactsByType } from "@kodebase/core";
 *
 * const allPaths = await loadAllArtifactPaths(".kodebase/artifacts");
 * const initiatives = loadArtifactsByType(allPaths, "initiative");
 * // ["A", "B"]
 *
 * const milestones = loadArtifactsByType(allPaths, "milestone");
 * // ["A.1", "A.2", "B.1"]
 * ```
 */
export function loadArtifactsByType(
  artifactPaths: readonly string[],
  type: "initiative" | "milestone" | "issue",
): string[] {
  const segmentsByType = {
    initiative: 1,
    milestone: 2,
    issue: 3,
  } as const;

  const expectedSegments = segmentsByType[type];
  const ids: string[] = [];

  for (const filePath of artifactPaths) {
    const id = getArtifactIdFromPath(filePath);
    if (!id) continue;
    const segments = id.split(".").length;
    if (segments === expectedSegments) {
      ids.push(id);
    }
  }

  ids.sort();
  return ids;
}
