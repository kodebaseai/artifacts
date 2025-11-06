/**
 * Tests for standalone dependency validation.
 */

import type { TAnyArtifact } from "@kodebase/core";
import { describe, expect, test } from "vitest";
import { validateDependencies } from "./dependency-validator.js";

describe("dependency-validator", () => {
  describe("validateDependencies", () => {
    test("should validate artifacts with no dependencies", () => {
      const artifacts = new Map<string, TAnyArtifact>([
        [
          "A.1.1",
          {
            metadata: {
              title: "Issue 1",
              priority: "high",
              schema_version: "0.0.1",
              relationships: {
                blocks: [],
                blocked_by: [],
              },
              events: [],
            },
            content: {
              summary: "Test issue",
            },
          } as TAnyArtifact,
        ],
      ]);

      const result = validateDependencies(artifacts);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should detect circular dependencies", () => {
      const artifacts = new Map<string, TAnyArtifact>([
        [
          "A.1.1",
          {
            metadata: {
              title: "Issue 1",
              priority: "high",
              schema_version: "0.0.1",
              relationships: {
                blocks: [],
                blocked_by: ["A.1.2"],
              },
              events: [],
            },
            content: {
              summary: "Issue blocked by A.1.2",
            },
          } as TAnyArtifact,
        ],
        [
          "A.1.2",
          {
            metadata: {
              title: "Issue 2",
              priority: "high",
              schema_version: "0.0.1",
              relationships: {
                blocks: [],
                blocked_by: ["A.1.1"],
              },
              events: [],
            },
            content: {
              summary: "Issue blocked by A.1.1",
            },
          } as TAnyArtifact,
        ],
      ]);

      const result = validateDependencies(artifacts);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.code === "CIRCULAR_DEPENDENCY")).toBe(
        true,
      );
    });

    test("should detect unknown artifact references", () => {
      const artifacts = new Map<string, TAnyArtifact>([
        [
          "A.1.1",
          {
            metadata: {
              title: "Issue 1",
              priority: "high",
              schema_version: "0.0.1",
              relationships: {
                blocks: [],
                blocked_by: ["A.1.999"], // Doesn't exist
              },
              events: [],
            },
            content: {
              summary: "Issue with bad reference",
            },
          } as TAnyArtifact,
        ],
      ]);

      const result = validateDependencies(artifacts);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === "UNKNOWN_ARTIFACT_REFERENCE"),
      ).toBe(true);
      expect(result.errors[0].referencedId).toBe("A.1.999");
    });

    test("should detect inconsistent bidirectional relationships", () => {
      const artifacts = new Map<string, TAnyArtifact>([
        [
          "A.1.1",
          {
            metadata: {
              title: "Issue 1",
              priority: "high",
              schema_version: "0.0.1",
              relationships: {
                blocks: ["A.1.2"], // Says it blocks A.1.2
                blocked_by: [],
              },
              events: [],
            },
            content: {
              summary: "Issue 1",
            },
          } as TAnyArtifact,
        ],
        [
          "A.1.2",
          {
            metadata: {
              title: "Issue 2",
              priority: "high",
              schema_version: "0.0.1",
              relationships: {
                blocks: [],
                blocked_by: [], // But A.1.2 doesn't list A.1.1 in blocked_by
              },
              events: [],
            },
            content: {
              summary: "Issue 2",
            },
          } as TAnyArtifact,
        ],
      ]);

      const result = validateDependencies(artifacts);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === "INCONSISTENT_RELATIONSHIP"),
      ).toBe(true);
    });

    test("should detect cross-level dependencies", () => {
      const artifacts = new Map<string, TAnyArtifact>([
        [
          "A.1",
          {
            metadata: {
              title: "Milestone 1",
              priority: "high",
              schema_version: "0.0.1",
              relationships: {
                blocks: [],
                blocked_by: ["A.1.1"], // Milestone blocked by issue
              },
              events: [],
            },
            content: {
              summary: "Milestone",
              outcomes: [],
            },
          } as TAnyArtifact,
        ],
        [
          "A.1.1",
          {
            metadata: {
              title: "Issue 1",
              priority: "high",
              schema_version: "0.0.1",
              relationships: {
                blocks: ["A.1"],
                blocked_by: [],
              },
              events: [],
            },
            content: {
              summary: "Issue",
            },
          } as TAnyArtifact,
        ],
      ]);

      const result = validateDependencies(artifacts);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === "CROSS_LEVEL_DEPENDENCY"),
      ).toBe(true);
    });

    test("should validate consistent bidirectional relationships", () => {
      const artifacts = new Map<string, TAnyArtifact>([
        [
          "A.1.1",
          {
            metadata: {
              title: "Issue 1",
              priority: "high",
              schema_version: "0.0.1",
              relationships: {
                blocks: ["A.1.2"],
                blocked_by: [],
              },
              events: [],
            },
            content: {
              summary: "Issue 1 blocks Issue 2",
            },
          } as TAnyArtifact,
        ],
        [
          "A.1.2",
          {
            metadata: {
              title: "Issue 2",
              priority: "high",
              schema_version: "0.0.1",
              relationships: {
                blocks: [],
                blocked_by: ["A.1.1"],
              },
              events: [],
            },
            content: {
              summary: "Issue 2 blocked by Issue 1",
            },
          } as TAnyArtifact,
        ],
      ]);

      const result = validateDependencies(artifacts);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should handle empty artifact map", () => {
      const artifacts = new Map<string, TAnyArtifact>();

      const result = validateDependencies(artifacts);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should provide suggested fixes for errors", () => {
      const artifacts = new Map<string, TAnyArtifact>([
        [
          "A.1.1",
          {
            metadata: {
              title: "Issue 1",
              priority: "high",
              schema_version: "0.0.1",
              relationships: {
                blocks: [],
                blocked_by: ["A.1.999"],
              },
              events: [],
            },
            content: {
              summary: "Issue with bad reference",
            },
          } as TAnyArtifact,
        ],
      ]);

      const result = validateDependencies(artifacts);

      expect(result.valid).toBe(false);
      expect(result.errors[0].suggestedFix).toBeDefined();
      expect(result.errors[0].suggestedFix).toContain("A.1.999");
    });

    test("should support disabling circular dependency checks", () => {
      const artifacts = new Map<string, TAnyArtifact>([
        [
          "A.1.1",
          {
            metadata: {
              title: "Issue 1",
              priority: "high",
              schema_version: "0.0.1",
              relationships: {
                blocks: [],
                blocked_by: ["A.1.2"],
              },
              events: [],
            },
            content: {
              summary: "Issue blocked by A.1.2",
            },
          } as TAnyArtifact,
        ],
        [
          "A.1.2",
          {
            metadata: {
              title: "Issue 2",
              priority: "high",
              schema_version: "0.0.1",
              relationships: {
                blocks: [],
                blocked_by: ["A.1.1"],
              },
              events: [],
            },
            content: {
              summary: "Issue blocked by A.1.1",
            },
          } as TAnyArtifact,
        ],
      ]);

      const result = validateDependencies(artifacts, undefined, {
        checkCircular: false,
      });

      // Should not detect circular dependency
      expect(
        result.errors.some((e) => e.code === "CIRCULAR_DEPENDENCY"),
      ).toBe(false);
    });

    test("should support disabling cross-level dependency checks", () => {
      const artifacts = new Map<string, TAnyArtifact>([
        [
          "A.1",
          {
            metadata: {
              title: "Milestone 1",
              priority: "high",
              schema_version: "0.0.1",
              relationships: {
                blocks: [],
                blocked_by: ["A.1.1"],
              },
              events: [],
            },
            content: {
              summary: "Milestone",
              outcomes: [],
            },
          } as TAnyArtifact,
        ],
        [
          "A.1.1",
          {
            metadata: {
              title: "Issue 1",
              priority: "high",
              schema_version: "0.0.1",
              relationships: {
                blocks: ["A.1"],
                blocked_by: [],
              },
              events: [],
            },
            content: {
              summary: "Issue",
            },
          } as TAnyArtifact,
        ],
      ]);

      const result = validateDependencies(artifacts, undefined, {
        checkCrossLevel: false,
        checkConsistency: false, // Also disable consistency to avoid inconsistent relationship errors
      });

      // Should not detect cross-level dependency
      expect(
        result.errors.some((e) => e.code === "CROSS_LEVEL_DEPENDENCY"),
      ).toBe(false);
    });

    test("should support disabling consistency checks", () => {
      const artifacts = new Map<string, TAnyArtifact>([
        [
          "A.1.1",
          {
            metadata: {
              title: "Issue 1",
              priority: "high",
              schema_version: "0.0.1",
              relationships: {
                blocks: ["A.1.2"],
                blocked_by: [],
              },
              events: [],
            },
            content: {
              summary: "Issue 1",
            },
          } as TAnyArtifact,
        ],
        [
          "A.1.2",
          {
            metadata: {
              title: "Issue 2",
              priority: "high",
              schema_version: "0.0.1",
              relationships: {
                blocks: [],
                blocked_by: [],
              },
              events: [],
            },
            content: {
              summary: "Issue 2",
            },
          } as TAnyArtifact,
        ],
      ]);

      const result = validateDependencies(artifacts, undefined, {
        checkConsistency: false,
      });

      // Should not detect inconsistent relationship
      expect(
        result.errors.some((e) => e.code === "INCONSISTENT_RELATIONSHIP"),
      ).toBe(false);
    });
  });
});
