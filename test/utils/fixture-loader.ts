import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TAnyArtifact, TArtifactType } from "@kodebase/core";
import {
  CArtifact,
  readArtifact,
  scaffoldInitiative,
  scaffoldIssue,
  scaffoldMilestone,
} from "@kodebase/core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Base path to core package fixtures (A.9.1 artifacts-tree)
 */
const CORE_FIXTURES_PATH = path.resolve(
  __dirname,
  "../../../../core/test/fixtures",
);

/**
 * Load a fixture file from the core package fixtures directory.
 *
 * @param fixturePath - Relative path from the fixtures directory (e.g., 'artifacts/issue.valid.yaml')
 * @returns File content as string
 */
export async function loadFixtureFile(fixturePath: string): Promise<string> {
  const fullPath = path.join(CORE_FIXTURES_PATH, fixturePath);
  return await fs.readFile(fullPath, "utf-8");
}

/**
 * Load and parse an artifact fixture from the core package.
 *
 * @param fixturePath - Relative path from the fixtures directory (e.g., 'artifacts/issue.valid.yaml')
 * @returns Parsed artifact object
 */
export async function loadArtifactFixture(
  fixturePath: string,
): Promise<TAnyArtifact> {
  const fullPath = path.join(CORE_FIXTURES_PATH, fixturePath);
  return await readArtifact<TAnyArtifact>(fullPath);
}

/**
 * Load a complete artifact tree from the loader-tree fixtures.
 * This uses the A.9.1 artifacts-tree fixture structure.
 *
 * @param treeName - Name of the tree directory (e.g., 'A.cascade-initiative')
 * @returns Map of artifact IDs to parsed artifacts
 */
export async function loadArtifactTree(
  treeName: string,
): Promise<Map<string, TAnyArtifact>> {
  const treePath = path.join(CORE_FIXTURES_PATH, "loader-tree", treeName);
  const artifacts = new Map<string, TAnyArtifact>();

  /**
   * Extract artifact ID from filename.
   * Handles formats:
   * - Initiative: "A.yml" -> "A"
   * - Milestone: "A.1.yml" -> "A.1"
   * - Issue: "A.1.1.slug.yml" -> "A.1.1"
   */
  function extractArtifactId(filename: string): string {
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.(yml|yaml)$/, "");

    // Match artifact ID pattern: one or more segments of letters/numbers separated by dots
    // Initiative: A, AA, etc.
    // Milestone: A.1, AA.23, etc.
    // Issue: A.1.1, AA.23.4, etc.
    const idMatch = nameWithoutExt.match(/^([A-Z]+(?:\.\d+){0,2})/);

    if (!idMatch) {
      throw new Error(
        `Could not extract artifact ID from filename: ${filename}`,
      );
    }

    return idMatch[1];
  }

  async function walkDirectory(dirPath: string): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await walkDirectory(fullPath);
      } else if (entry.name.endsWith(".yml") || entry.name.endsWith(".yaml")) {
        const artifact = await readArtifact<TAnyArtifact>(fullPath);
        const artifactId = extractArtifactId(entry.name);
        artifacts.set(artifactId, artifact);
      }
    }
  }

  await walkDirectory(treePath);
  return artifacts;
}

/**
 * Predefined fixture paths for common test scenarios
 */
export const FIXTURES = {
  ARTIFACTS: {
    INITIATIVE_VALID: "artifacts/initiative.valid.yaml",
    INITIATIVE_VALID_JSON: "artifacts/initiative.valid.json",
    MILESTONE_VALID: "artifacts/milestone.valid.yaml",
    MILESTONE_VALID_JSON: "artifacts/milestone.valid.json",
    ISSUE_VALID: "artifacts/issue.valid.yaml",
    ISSUE_VALID_JSON: "artifacts/issue.valid.json",
    ISSUE_LIFECYCLE_VALID: "artifacts/issue.lifecycle.valid.yaml",
    MILESTONE_INVALID_MISSING_DELIVERABLES:
      "artifacts/milestone.invalid.missing-deliverables.yaml",
    ISSUE_INVALID_MISSING_CRITERIA:
      "artifacts/issue.invalid.missing-criteria.yaml",
  },
  TREES: {
    CASCADE_INITIATIVE: "A.cascade-initiative",
    LOADER_ENHANCEMENTS: "B.loader-enhancements",
  },
} as const;

/**
 * Create a test artifact with default values and optional overrides.
 * This is a factory function for quickly creating test artifacts.
 *
 * @param type - Artifact type (initiative, milestone, issue)
 * @param overrides - Partial artifact data to override defaults
 * @returns Scaffolded artifact
 */
export function createTestArtifact(
  type: CArtifact.INITIATIVE,
  overrides?: {
    title?: string;
    createdBy?: string;
    vision?: string;
    scopeIn?: string[];
    scopeOut?: string[];
    successCriteria?: string[];
  },
): TAnyArtifact;
export function createTestArtifact(
  type: CArtifact.MILESTONE,
  overrides?: {
    title?: string;
    createdBy?: string;
    summary?: string;
    deliverables?: string[];
  },
): TAnyArtifact;
export function createTestArtifact(
  type: CArtifact.ISSUE,
  overrides?: {
    title?: string;
    createdBy?: string;
    summary?: string;
    acceptanceCriteria?: string[];
  },
): TAnyArtifact;
export function createTestArtifact(
  type: TArtifactType,
  overrides?: Record<string, unknown>,
): TAnyArtifact {
  const defaults = {
    createdBy: "Test User (test@example.com)",
  };

  switch (type) {
    case CArtifact.INITIATIVE:
      return scaffoldInitiative({
        title: "Test Initiative",
        vision: "Test vision",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Success criterion"],
        ...defaults,
        ...overrides,
      });
    case CArtifact.MILESTONE:
      return scaffoldMilestone({
        title: "Test Milestone",
        summary: "Test summary",
        deliverables: ["Deliverable 1"],
        ...defaults,
        ...overrides,
      });
    case CArtifact.ISSUE:
      return scaffoldIssue({
        title: "Test Issue",
        summary: "Test summary",
        acceptanceCriteria: ["Acceptance criterion"],
        ...defaults,
        ...overrides,
      });
  }
}

/**
 * Load multiple artifact fixtures in parallel.
 *
 * @param fixturePaths - Array of fixture paths to load
 * @returns Array of parsed artifacts
 */
export async function loadArtifactFixtures(
  fixturePaths: string[],
): Promise<TAnyArtifact[]> {
  return await Promise.all(fixturePaths.map(loadArtifactFixture));
}
