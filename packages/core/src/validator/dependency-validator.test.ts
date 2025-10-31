import { describe, expect, it, vi } from "vitest";

import type { TArtifactMetadata } from "../schemas/registries/metadata-registry.js";
import { readFixtureJson } from "../test-utils/load-fixture.js";
import {
  type ArtifactWithRelationships,
  detectCircularDependencies,
  detectCrossLevelDependencies,
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

function loadArtifactMap(
  fixture: string,
): Map<string, ArtifactWithRelationships> {
  const data =
    readFixtureJson<Record<string, ArtifactWithRelationships>>(fixture);
  return new Map(Object.entries(data));
}

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

  it("handles artifacts without blocked_by metadata", () => {
    const artifacts = new Map<string, ArtifactWithRelationships>([
      [
        "A.1",
        {
          metadata: {
            ...baseMetadata,
            relationships: undefined as unknown as {
              blocks: string[];
              blocked_by: string[];
            },
          },
        },
      ],
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

describe("detectCrossLevelDependencies", () => {
  it("returns no issues for sibling-only dependency fixtures", () => {
    const graph = loadArtifactMap("dependencies/valid-siblings.json");
    const issues = detectCrossLevelDependencies(graph);
    expect(issues).toEqual([]);
  });

  it("detects cross-level dependencies with clear messaging", () => {
    const graph = loadArtifactMap("dependencies/invalid-cross-level.json");
    const issues = detectCrossLevelDependencies(graph);

    expect(issues).toHaveLength(2);
    expect(issues.map((issue) => issue.code)).toEqual([
      "CROSS_LEVEL_DEPENDENCY",
      "CROSS_LEVEL_DEPENDENCY",
    ]);

    const messages = issues.map((issue) => issue.message);
    expect(messages).toContain(
      "Cross-level dependency detected: milestone A.1 cannot depend on initiative A.",
    );
    expect(messages).toContain(
      "Cross-level dependency detected: issue A.1.1 cannot depend on initiative A.",
    );
  });

  it("skips artifacts with unrecognised IDs", () => {
    const artifacts = new Map<string, ArtifactWithRelationships>([
      ["custom", makeArtifact(["A.1"])],
      ["A.1", makeArtifact([])],
    ]);
    const issues = detectCrossLevelDependencies(artifacts);
    expect(issues).toEqual([]);
  });

  it("skips dependencies that are not present in the graph", () => {
    const artifacts = new Map<string, ArtifactWithRelationships>([
      ["A.1.1", makeArtifact(["A.9.9"])],
    ]);
    const issues = detectCrossLevelDependencies(artifacts);
    expect(issues).toEqual([]);
  });

  it("ignores dependencies with unparseable IDs even when artifacts exist", () => {
    const artifacts = new Map<string, ArtifactWithRelationships>([
      ["A.1.1", makeArtifact(["custom-dependency"])],
      ["custom-dependency", makeArtifact([])],
    ]);
    const issues = detectCrossLevelDependencies(artifacts);
    expect(issues).toEqual([]);
  });

  it("handles artifacts missing relationship metadata", () => {
    const artifacts = new Map<string, ArtifactWithRelationships>([
      [
        "A.1",
        {
          metadata: {
            ...baseMetadata,
            relationships: undefined as unknown as {
              blocks: string[];
              blocked_by: string[];
            },
          },
        },
      ],
    ]);

    const issues = detectCrossLevelDependencies(artifacts);
    expect(issues).toEqual([]);
  });
});
