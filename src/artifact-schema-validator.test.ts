/**
 * Tests for artifact schema validation with line number tracking.
 */

import path from "node:path";
import { vol } from "memfs";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { validateArtifact } from "./artifact-schema-validator.js";

// Mock node:fs/promises with memfs
vi.mock("node:fs/promises", () => ({
  default: vol.promises,
}));

describe("artifact-schema-validator", () => {
  let testDir: string;
  let artifactPath: string;

  beforeEach(() => {
    vol.reset();
    testDir = "/test-workspace/.kodebase/artifacts";
    vol.mkdirSync(testDir, { recursive: true });
    artifactPath = path.join(testDir, "A.1.1.yml");
  });

  afterEach(() => {
    vol.reset();
  });

  describe("validateArtifact", () => {
    test("should validate a valid issue artifact", async () => {
      const validIssue = `metadata:
  title: Valid Issue
  priority: high
  estimation: S
  created_by: "Miguel Carvalho (m@kodebase.ai)"
  assignee: "Miguel Carvalho (m@kodebase.ai)"
  schema_version: "0.0.1"
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event: draft
      timestamp: "2025-11-04T12:00:00Z"
      actor: "Miguel Carvalho (m@kodebase.ai)"
      trigger: artifact_created
content:
  summary: This is a valid issue summary
  acceptance_criteria:
    - Criterion 1
`;

      vol.writeFileSync(artifactPath, validIssue);

      const result = await validateArtifact(artifactPath, {
        artifactId: "A.1.1",
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.artifact).toBeDefined();
    });

    test("should fail when title is missing", async () => {
      const invalidArtifact = `metadata:
  priority: high
  estimation: S
  created_by: "Miguel Carvalho (m@kodebase.ai)"
  assignee: "Miguel Carvalho (m@kodebase.ai)"
  schema_version: "0.0.1"
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event: draft
      timestamp: "2025-11-04T12:00:00Z"
      actor: "Miguel Carvalho (m@kodebase.ai)"
      trigger: artifact_created
content:
  summary: Summary without title
  acceptance_criteria:
    - Criterion 1
`;

      vol.writeFileSync(artifactPath, invalidArtifact);

      const result = await validateArtifact(artifactPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field?.includes("title"))).toBe(true);
    });

    test("should fail with invalid event state", async () => {
      const invalidArtifact = `metadata:
  title: Invalid State
  priority: high
  estimation: S
  created_by: "Miguel Carvalho (m@kodebase.ai)"
  assignee: "Miguel Carvalho (m@kodebase.ai)"
  schema_version: "0.0.1"
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event: invalid_state
      timestamp: "2025-11-04T12:00:00Z"
      actor: "Miguel Carvalho (m@kodebase.ai)"
      trigger: artifact_created
content:
  summary: Summary
  acceptance_criteria:
    - Criterion 1
`;

      vol.writeFileSync(artifactPath, invalidArtifact);

      const result = await validateArtifact(artifactPath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("should fail when events not in chronological order", async () => {
      const invalidArtifact = `metadata:
  title: Out of Order
  priority: high
  estimation: S
  created_by: "Miguel Carvalho (m@kodebase.ai)"
  assignee: "Miguel Carvalho (m@kodebase.ai)"
  schema_version: "0.0.1"
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event: draft
      timestamp: "2025-11-04T12:00:00Z"
      actor: "Miguel Carvalho (m@kodebase.ai)"
      trigger: artifact_created
    - event: ready
      timestamp: "2025-11-04T10:00:00Z"
      actor: "agent.cascade"
      trigger: dependencies_met
content:
  summary: Events out of order
  acceptance_criteria:
    - Criterion 1
`;

      vol.writeFileSync(artifactPath, invalidArtifact);

      const result = await validateArtifact(artifactPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "EVENT_ORDER_INVALID")).toBe(
        true,
      );
    });

    test("should fail when relationships are not arrays", async () => {
      const invalidArtifact = `metadata:
  title: Invalid Relationships
  priority: high
  estimation: S
  created_by: "Miguel Carvalho (m@kodebase.ai)"
  assignee: "Miguel Carvalho (m@kodebase.ai)"
  schema_version: "0.0.1"
  relationships:
    blocks: "not-an-array"
    blocked_by: []
  events:
    - event: draft
      timestamp: "2025-11-04T12:00:00Z"
      actor: "Miguel Carvalho (m@kodebase.ai)"
      trigger: artifact_created
content:
  summary: Test
  acceptance_criteria:
    - Criterion 1
`;

      vol.writeFileSync(artifactPath, invalidArtifact);

      const result = await validateArtifact(artifactPath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("should fail with invalid schema version", async () => {
      const invalidArtifact = `metadata:
  title: Invalid Version
  priority: high
  estimation: S
  created_by: "Miguel Carvalho (m@kodebase.ai)"
  assignee: "Miguel Carvalho (m@kodebase.ai)"
  schema_version: "invalid"
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event: draft
      timestamp: "2025-11-04T12:00:00Z"
      actor: "Miguel Carvalho (m@kodebase.ai)"
      trigger: artifact_created
content:
  summary: Test
  acceptance_criteria:
    - Criterion 1
`;

      vol.writeFileSync(artifactPath, invalidArtifact);

      const result = await validateArtifact(artifactPath);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === "SCHEMA_VERSION_INVALID"),
      ).toBe(true);
    });

    test("should handle file not found", async () => {
      const result = await validateArtifact("/nonexistent.yml");

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("FILE_NOT_FOUND");
    });

    test("should handle YAML syntax errors", async () => {
      vol.writeFileSync(artifactPath, "invalid: yaml: [[[");

      const result = await validateArtifact(artifactPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "YAML_SYNTAX_ERROR")).toBe(
        true,
      );
    });

    test("should return structured errors with line numbers", async () => {
      const invalidArtifact = `metadata:
  title: Test
  priority: invalid
  estimation: S
  created_by: "Miguel Carvalho (m@kodebase.ai)"
  assignee: "Miguel Carvalho (m@kodebase.ai)"
  schema_version: "0.0.1"
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event: draft
      timestamp: "2025-11-04T12:00:00Z"
      actor: "Miguel Carvalho (m@kodebase.ai)"
      trigger: artifact_created
content:
  summary: Test
  acceptance_criteria:
    - Criterion 1
`;

      vol.writeFileSync(artifactPath, invalidArtifact);

      const result = await validateArtifact(artifactPath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toHaveProperty("code");
      expect(result.errors[0]).toHaveProperty("message");
    });

    test("should provide suggested fixes", async () => {
      const invalidArtifact = `metadata:
  priority: high
  estimation: S
  created_by: "Miguel Carvalho (m@kodebase.ai)"
  assignee: "Miguel Carvalho (m@kodebase.ai)"
  schema_version: "0.0.1"
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event: draft
      timestamp: "2025-11-04T12:00:00Z"
      actor: "Miguel Carvalho (m@kodebase.ai)"
      trigger: artifact_created
content:
  summary: Missing title
  acceptance_criteria:
    - Criterion 1
`;

      vol.writeFileSync(artifactPath, invalidArtifact);

      const result = await validateArtifact(artifactPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.suggestedFix)).toBe(true);
    });
  });
});
