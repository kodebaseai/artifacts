import path from "node:path";
import type { TAnyArtifact } from "@kodebase/core";
import { expect } from "vitest";
import { setupMockFs, writeMockFile } from "../utils/filesystem-mock.js";
import { createTestArtifact } from "../utils/fixture-loader.js";

/**
 * Standard test context with common setup
 */
export interface TestContext {
  baseDir: string;
  artifactDir: string;
}

/**
 * Create a standard test context with filesystem setup.
 * This should be called in beforeEach() to ensure consistent test setup.
 *
 * @param basePath - Base directory for the test (defaults to /test-workspace)
 * @returns Test context object
 *
 * @example
 * ```typescript
 * let ctx: TestContext;
 *
 * beforeEach(() => {
 *   ctx = createTestContext();
 * });
 * ```
 */
export function createTestContext(basePath = "/test-workspace"): TestContext {
  const baseDir = setupMockFs(basePath);
  const artifactDir = path.join(baseDir, ".kodebase", "artifacts");

  return {
    baseDir,
    artifactDir,
  };
}

/**
 * Create a test artifact hierarchy in the mock filesystem.
 * This is useful for testing operations that require multiple related artifacts.
 *
 * @param baseDir - Base directory for the hierarchy
 * @param hierarchy - Hierarchy definition
 * @returns Map of artifact IDs to their file paths
 *
 * @example
 * ```typescript
 * const paths = await createTestHierarchy(ctx.baseDir, {
 *   initiative: { title: 'Test Initiative', id: 'A' },
 *   milestones: [
 *     { title: 'Milestone 1', id: 'A.1', parentId: 'A' },
 *     { title: 'Milestone 2', id: 'A.2', parentId: 'A' }
 *   ]
 * });
 * ```
 */
export async function createTestHierarchy(
  baseDir: string,
  hierarchy: {
    initiative?: { title: string; id: string };
    milestones?: Array<{ title: string; id: string; parentId: string }>;
    issues?: Array<{ title: string; id: string; parentId: string }>;
  },
): Promise<Map<string, string>> {
  const paths = new Map<string, string>();
  const artifactDir = path.join(baseDir, ".kodebase", "artifacts");

  if (hierarchy.initiative) {
    const { id, title } = hierarchy.initiative;
    const artifact = createTestArtifact("initiative", { title });
    artifact.metadata.id = id;

    const dirPath = path.join(artifactDir, id);
    const filePath = path.join(dirPath, `${id}.yml`);

    writeMockFile(filePath, serializeArtifact(artifact));
    paths.set(id, filePath);
  }

  if (hierarchy.milestones) {
    for (const milestone of hierarchy.milestones) {
      const { id, title, parentId } = milestone;
      const artifact = createTestArtifact("milestone", { title });
      artifact.metadata.id = id;
      artifact.metadata.relationships = {
        parent: parentId,
      };

      const dirPath = path.join(artifactDir, parentId, id);
      const filePath = path.join(dirPath, `${id}.yml`);

      writeMockFile(filePath, serializeArtifact(artifact));
      paths.set(id, filePath);
    }
  }

  if (hierarchy.issues) {
    for (const issue of hierarchy.issues) {
      const { id, title, parentId } = issue;
      const artifact = createTestArtifact("issue", { title });
      artifact.metadata.id = id;
      artifact.metadata.relationships = {
        parent: parentId,
      };

      const parentParts = parentId.split(".");
      const dirPath =
        parentParts.length === 1
          ? path.join(artifactDir, parentId, id)
          : path.join(artifactDir, parentParts[0], parentId, id);
      const filePath = path.join(dirPath, `${id}.yml`);

      writeMockFile(filePath, serializeArtifact(artifact));
      paths.set(id, filePath);
    }
  }

  return paths;
}

/**
 * Serialize an artifact to YAML format for writing to filesystem.
 * This is a simple YAML serializer for test purposes.
 *
 * @param artifact - Artifact to serialize
 * @returns YAML string
 */
function serializeArtifact(artifact: TAnyArtifact): string {
  const yaml: string[] = [];

  yaml.push("metadata:");
  yaml.push(`  id: "${artifact.metadata.id}"`);
  yaml.push(`  title: "${artifact.metadata.title}"`);
  yaml.push(`  priority: ${artifact.metadata.priority}`);
  yaml.push(`  estimation: ${artifact.metadata.estimation}`);
  yaml.push(`  created_by: "${artifact.metadata.created_by}"`);

  if (artifact.metadata.assignee) {
    yaml.push(`  assignee: "${artifact.metadata.assignee}"`);
  }

  yaml.push(`  schema_version: "${artifact.metadata.schema_version}"`);

  if (artifact.metadata.relationships) {
    yaml.push("  relationships:");
    if (artifact.metadata.relationships.parent) {
      yaml.push(`    parent: "${artifact.metadata.relationships.parent}"`);
    }
    if (artifact.metadata.relationships.blocks) {
      yaml.push(
        `    blocks: [${artifact.metadata.relationships.blocks.join(", ")}]`,
      );
    }
    if (artifact.metadata.relationships.blocked_by) {
      yaml.push(
        `    blocked_by: [${artifact.metadata.relationships.blocked_by.join(", ")}]`,
      );
    }
  }

  yaml.push("  events:");
  for (const event of artifact.metadata.events || []) {
    yaml.push(`    - event: ${event.event}`);
    yaml.push(`      timestamp: "${event.timestamp}"`);
    yaml.push(`      actor: "${event.actor}"`);
    yaml.push(`      trigger: ${event.trigger}`);
  }

  yaml.push("content:");

  if ("vision" in artifact.content) {
    yaml.push(`  vision: "${artifact.content.vision}"`);
    yaml.push("  scope:");
    yaml.push("    in:");
    for (const item of artifact.content.scope.in) {
      yaml.push(`      - "${item}"`);
    }
    yaml.push("    out:");
    for (const item of artifact.content.scope.out) {
      yaml.push(`      - "${item}"`);
    }
    yaml.push("  success_criteria:");
    for (const item of artifact.content.success_criteria) {
      yaml.push(`    - "${item}"`);
    }
  } else if ("deliverables" in artifact.content) {
    yaml.push(`  summary: "${artifact.content.summary}"`);
    yaml.push("  deliverables:");
    for (const item of artifact.content.deliverables) {
      yaml.push(`    - "${item}"`);
    }
  } else if ("acceptance_criteria" in artifact.content) {
    yaml.push(`  summary: "${artifact.content.summary}"`);
    yaml.push("  acceptance_criteria:");
    for (const item of artifact.content.acceptance_criteria) {
      yaml.push(`    - "${item}"`);
    }
  }

  return yaml.join("\n");
}

/**
 * Custom assertion: expect artifact to be valid.
 * Checks that the artifact has required fields and proper structure.
 *
 * @param artifact - Artifact to validate
 */
export function expectArtifactValid(artifact: TAnyArtifact): void {
  expect(artifact).toBeDefined();
  expect(artifact.metadata).toBeDefined();
  expect(artifact.metadata.id).toBeDefined();
  expect(artifact.metadata.title).toBeDefined();
  expect(artifact.metadata.priority).toBeDefined();
  expect(artifact.metadata.created_by).toBeDefined();
  expect(artifact.content).toBeDefined();
}

/**
 * Custom assertion: expect artifact to have specific type.
 *
 * @param artifact - Artifact to check
 * @param type - Expected artifact type
 */
export function expectArtifactType(
  artifact: TAnyArtifact,
  type: "initiative" | "milestone" | "issue",
): void {
  expectArtifactValid(artifact);

  switch (type) {
    case "initiative":
      expect(artifact.content).toHaveProperty("vision");
      expect(artifact.content).toHaveProperty("scope");
      expect(artifact.content).toHaveProperty("scope.in");
      expect(artifact.content).toHaveProperty("scope.out");
      expect(artifact.content).toHaveProperty("success_criteria");
      break;
    case "milestone":
      expect(artifact.content).toHaveProperty("summary");
      expect(artifact.content).toHaveProperty("deliverables");
      break;
    case "issue":
      expect(artifact.content).toHaveProperty("summary");
      expect(artifact.content).toHaveProperty("acceptance_criteria");
      break;
  }
}

/**
 * Wait for a condition to be true with timeout.
 * Useful for testing async operations.
 *
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 * @param interval - Polling interval in milliseconds (default: 50)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 1000,
  interval = 50,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}
