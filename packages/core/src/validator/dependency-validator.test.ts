import { describe, expect, it, vi } from "vitest";

import type { TArtifactMetadata } from "../schemas/registries/metadata-registry.js";
import {
  type ArtifactWithRelationships,
  detectCircularDependencies,
} from "./dependency-validator.js";

const baseMetadata: TArtifactMetadata = {
  title: "Example Artifact",
  priority: "medium",
  estimation: "S",
  created_by: "Tester (tester@example.com)",
  assignee: "Tester (tester@example.com)",
  schema_version: "0.0.1",
  relationships: { blocks: [], blocked_by: [] },
  events: [
    {
      event: "draft",
      timestamp: "2025-01-01T00:00:00Z",
      actor: "Tester (tester@example.com)",
      trigger: "artifact_created",
    },
  ],
};

const makeArtifact = (blockedBy: string[] = []): ArtifactWithRelationships => ({
  metadata: {
    ...baseMetadata,
    relationships: {
      blocks: [],
      blocked_by: blockedBy,
    },
  },
});

describe("detectCircularDependencies", () => {
  it("finds a simple cycle", () => {
    const artifacts = new Map<string, ArtifactWithRelationships>([
      ["A.1", makeArtifact(["A.2"])],
      ["A.2", makeArtifact(["A.3"])],
      ["A.3", makeArtifact(["A.1"])],
    ]);

    const issues = detectCircularDependencies(artifacts);
    expect(issues).toHaveLength(1);
    const issue = issues[0];

    expect(issue?.code).toBe("CIRCULAR_DEPENDENCY");
    expect(issue?.cycle).toEqual(["A.1", "A.2", "A.3", "A.1"]);
    expect(issue?.message).toBe(
      "Circular dependency detected: A.1 -> A.2 -> A.3 -> A.1",
    );
  });

  it("returns empty when the graph has no cycles", () => {
    const artifacts = new Map<string, ArtifactWithRelationships>([
      ["A.1", makeArtifact(["A.2"])],
      ["A.2", makeArtifact(["A.3"])],
      ["A.3", makeArtifact()],
      ["A.4", makeArtifact(["A.2"])],
    ]);

    const issues = detectCircularDependencies(artifacts);
    expect(issues).toEqual([]);
  });

  it("ignores dependencies that reference unknown artifacts", () => {
    const artifacts = new Map<string, ArtifactWithRelationships>([
      ["A.1", makeArtifact(["Z.9"])],
    ]);

    const issues = detectCircularDependencies(artifacts);
    expect(issues).toEqual([]);
  });

  it("handles inconsistent map state when a dependency disappears mid-traversal", () => {
    const artifacts = new Map<string, ArtifactWithRelationships>([
      ["A.1", makeArtifact(["A.2"])],
    ]);

    const originalHas = Map.prototype.has;
    const hasSpy = vi
      .spyOn<Map<string, ArtifactWithRelationships>, "has">(
        Map.prototype,
        "has",
      )
      .mockImplementation(function (this: Map<unknown, unknown>, key) {
        if (key === "A.2" && this !== (artifacts as unknown)) {
          return true;
        }
        return originalHas.call(this, key);
      });

    try {
      const issues = detectCircularDependencies(artifacts);
      expect(issues).toEqual([]);
    } finally {
      hasSpy.mockRestore();
    }
  });

  it("reports self-dependencies as cycles", () => {
    const artifacts = new Map<string, ArtifactWithRelationships>([
      ["A.1", makeArtifact(["A.1"])],
    ]);

    const issues = detectCircularDependencies(artifacts);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.cycle).toEqual(["A.1", "A.1"]);
    expect(issues[0]?.message).toBe("Circular dependency detected: A.1 -> A.1");
  });

  it("detects multiple disjoint cycles", () => {
    const artifacts = new Map<string, ArtifactWithRelationships>([
      ["A.1", makeArtifact(["A.2"])],
      ["A.2", makeArtifact(["A.1"])],
      ["B.1", makeArtifact(["B.2"])],
      ["B.2", makeArtifact(["B.3"])],
      ["B.3", makeArtifact(["B.1"])],
      ["C.1", makeArtifact()],
    ]);

    const issues = detectCircularDependencies(artifacts);
    expect(issues).toHaveLength(2);

    const cycles = issues.map((issue) => issue.cycle);
    expect(cycles).toContainEqual(["A.1", "A.2", "A.1"]);
    expect(cycles).toContainEqual(["B.1", "B.2", "B.3", "B.1"]);
  });
});
