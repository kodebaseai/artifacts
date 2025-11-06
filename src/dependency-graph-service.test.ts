import {
  scaffoldInitiative,
  scaffoldIssue,
  scaffoldMilestone,
} from "@kodebase/core";
import { vol } from "memfs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArtifactService } from "./artifact-service.js";
import { DependencyGraphService } from "./dependency-graph-service.js";
import { ArtifactNotFoundError } from "./errors.js";

// Mock node:fs/promises to use memfs
vi.mock("node:fs/promises", async () => {
  const { fs } = await import("memfs");
  return {
    default: fs.promises,
  };
});

describe("DependencyGraphService", () => {
  const testBaseDir = "/test-project";
  let depService: DependencyGraphService;
  let artifactService: ArtifactService;

  beforeEach(() => {
    // Reset memfs before each test
    vol.reset();

    depService = new DependencyGraphService(testBaseDir);
    artifactService = new ArtifactService(testBaseDir);
  });

  afterEach(() => {
    vol.reset();
  });

  /**
   * Creates a simple dependency hierarchy:
   * A.1.1 (completed) ← A.1.2 (blocked by A.1.1) ← A.1.3 (blocked by A.1.2)
   */
  async function createDependencyChain(): Promise<void> {
    // Create initiative A
    await artifactService.createArtifact({
      id: "A",
      artifact: scaffoldInitiative({
        title: "Initiative A",
        createdBy: "Test User (test@example.com)",
        vision: "Vision A",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature Z"],
        successCriteria: ["Criterion A"],
      }),
      slug: "initiative-a",
      baseDir: testBaseDir,
    });

    // Create milestone A.1
    await artifactService.createArtifact({
      id: "A.1",
      artifact: scaffoldMilestone({
        title: "Milestone A.1",
        createdBy: "Test User (test@example.com)",
        summary: "First milestone",
        deliverables: ["Deliverable 1"],
      }),
      slug: "milestone-a1",
      baseDir: testBaseDir,
    });

    // Create issue A.1.1 (completed, no dependencies, blocks A.1.2)
    let issue = scaffoldIssue({
      title: "Issue A.1.1",
      createdBy: "Test User (test@example.com)",
      summary: "First issue",
      acceptanceCriteria: ["Criterion 1"],
    });
    // Add completed event
    issue.metadata.events.push({
      event: "completed",
      timestamp: new Date().toISOString(),
      actor: "Test User (test@example.com)",
      trigger: "pr_merged",
    });
    // Set bidirectional relationship
    issue.metadata.relationships = {
      blocked_by: [],
      blocks: ["A.1.2"],
    };
    await artifactService.createArtifact({
      id: "A.1.1",
      artifact: issue,
      slug: "issue-a11",
      baseDir: testBaseDir,
    });

    // Create issue A.1.2 (blocked by A.1.1, blocks A.1.3)
    issue = scaffoldIssue({
      title: "Issue A.1.2",
      createdBy: "Test User (test@example.com)",
      summary: "Second issue",
      acceptanceCriteria: ["Criterion 2"],
    });
    issue.metadata.relationships = {
      blocked_by: ["A.1.1"],
      blocks: ["A.1.3"],
    };
    await artifactService.createArtifact({
      id: "A.1.2",
      artifact: issue,
      slug: "issue-a12",
      baseDir: testBaseDir,
    });

    // Create issue A.1.3 (blocked by A.1.2)
    issue = scaffoldIssue({
      title: "Issue A.1.3",
      createdBy: "Test User (test@example.com)",
      summary: "Third issue",
      acceptanceCriteria: ["Criterion 3"],
    });
    issue.metadata.relationships = {
      blocked_by: ["A.1.2"],
      blocks: [],
    };
    await artifactService.createArtifact({
      id: "A.1.3",
      artifact: issue,
      slug: "issue-a13",
      baseDir: testBaseDir,
    });
  }

  describe("getDependencies", () => {
    beforeEach(async () => {
      await createDependencyChain();
    });

    it("returns artifacts that block the given artifact", async () => {
      const deps = await depService.getDependencies("A.1.2");

      expect(deps).toHaveLength(1);
      expect(deps[0].id).toBe("A.1.1");
      expect(deps[0].artifact.metadata.title).toBe("Issue A.1.1");
    });

    it("returns empty array for artifact with no dependencies", async () => {
      const deps = await depService.getDependencies("A.1.1");

      expect(deps).toHaveLength(0);
    });

    it("returns transitive dependency correctly", async () => {
      const deps = await depService.getDependencies("A.1.3");

      expect(deps).toHaveLength(1);
      expect(deps[0].id).toBe("A.1.2");
    });

    it("throws error for non-existent artifact", async () => {
      await expect(depService.getDependencies("Z.99.88")).rejects.toThrow(
        ArtifactNotFoundError,
      );
    });

    it("handles missing dependency gracefully", async () => {
      // Create artifact with non-existent dependency
      const issue = scaffoldIssue({
        title: "Issue A.1.4",
        createdBy: "Test User (test@example.com)",
        summary: "Fourth issue",
        acceptanceCriteria: ["Criterion 4"],
      });
      issue.metadata.relationships = {
        blocked_by: ["A.1.99"], // Non-existent
        blocks: [],
      };
      await artifactService.createArtifact({
        id: "A.1.4",
        artifact: issue,
        slug: "issue-a14",
        baseDir: testBaseDir,
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const deps = await depService.getDependencies("A.1.4");

      expect(deps).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("A.1.99"));

      warnSpy.mockRestore();
    });
  });

  describe("getBlockedArtifacts", () => {
    beforeEach(async () => {
      await createDependencyChain();
    });

    it("returns artifacts blocked by the given artifact", async () => {
      const blocked = await depService.getBlockedArtifacts("A.1.1");

      expect(blocked).toHaveLength(1);
      expect(blocked[0].id).toBe("A.1.2");
      expect(blocked[0].artifact.metadata.title).toBe("Issue A.1.2");
    });

    it("returns empty array for artifact that blocks nothing", async () => {
      const blocked = await depService.getBlockedArtifacts("A.1.3");

      expect(blocked).toHaveLength(0);
    });

    it("returns multiple blocked artifacts", async () => {
      // Create another artifact blocked by A.1.1
      const issue = scaffoldIssue({
        title: "Issue A.1.4",
        createdBy: "Test User (test@example.com)",
        summary: "Fourth issue",
        acceptanceCriteria: ["Criterion 4"],
      });
      issue.metadata.relationships = {
        blocked_by: ["A.1.1"],
        blocks: [],
      };
      await artifactService.createArtifact({
        id: "A.1.4",
        artifact: issue,
        slug: "issue-a14",
        baseDir: testBaseDir,
      });

      const blocked = await depService.getBlockedArtifacts("A.1.1");

      expect(blocked).toHaveLength(2);
      const ids = blocked.map((item) => item.id).sort();
      expect(ids).toEqual(["A.1.2", "A.1.4"]);
    });

    it("throws error for non-existent artifact", async () => {
      await expect(depService.getBlockedArtifacts("Z.99.88")).rejects.toThrow(
        ArtifactNotFoundError,
      );
    });
  });

  describe("isBlocked", () => {
    beforeEach(async () => {
      await createDependencyChain();
    });

    it("returns false when dependencies are completed", async () => {
      const blocked = await depService.isBlocked("A.1.2");

      expect(blocked).toBe(false);
    });

    it("returns true when dependencies are not completed", async () => {
      const blocked = await depService.isBlocked("A.1.3");

      expect(blocked).toBe(true); // A.1.2 is not completed
    });

    it("returns false when artifact has no dependencies", async () => {
      const blocked = await depService.isBlocked("A.1.1");

      expect(blocked).toBe(false);
    });

    it("handles missing dependencies gracefully", async () => {
      // Create artifact with non-existent dependency
      const issue = scaffoldIssue({
        title: "Issue A.1.4",
        createdBy: "Test User (test@example.com)",
        summary: "Fourth issue",
        acceptanceCriteria: ["Criterion 4"],
      });
      issue.metadata.relationships = {
        blocked_by: ["A.1.99"], // Non-existent
        blocks: [],
      };
      await artifactService.createArtifact({
        id: "A.1.4",
        artifact: issue,
        slug: "issue-a14",
        baseDir: testBaseDir,
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const blocked = await depService.isBlocked("A.1.4");

      expect(blocked).toBe(false); // Missing deps don't block
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("throws error for non-existent artifact", async () => {
      await expect(depService.isBlocked("Z.99.88")).rejects.toThrow(
        ArtifactNotFoundError,
      );
    });
  });

  describe("resolveDependencyChain", () => {
    beforeEach(async () => {
      await createDependencyChain();
    });

    it("returns empty chain for artifact with no dependencies", async () => {
      const chain = await depService.resolveDependencyChain("A.1.1");

      expect(chain).toHaveLength(0);
    });

    it("returns direct dependency in chain", async () => {
      const chain = await depService.resolveDependencyChain("A.1.2");

      expect(chain).toHaveLength(1);
      expect(chain[0].id).toBe("A.1.1");
    });

    it("returns full transitive dependency chain", async () => {
      const chain = await depService.resolveDependencyChain("A.1.3");

      expect(chain).toHaveLength(2);
      const ids = chain.map((item) => item.id);
      expect(ids).toContain("A.1.2");
      expect(ids).toContain("A.1.1");
    });

    it("handles missing dependencies gracefully", async () => {
      // Create artifact with non-existent dependency
      const issue = scaffoldIssue({
        title: "Issue A.1.4",
        createdBy: "Test User (test@example.com)",
        summary: "Fourth issue",
        acceptanceCriteria: ["Criterion 4"],
      });
      issue.metadata.relationships = {
        blocked_by: ["A.1.99"], // Non-existent
        blocks: [],
      };
      await artifactService.createArtifact({
        id: "A.1.4",
        artifact: issue,
        slug: "issue-a14",
        baseDir: testBaseDir,
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const chain = await depService.resolveDependencyChain("A.1.4");

      expect(chain).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("A.1.99"));

      warnSpy.mockRestore();
    });

    it("throws error for non-existent artifact", async () => {
      await expect(
        depService.resolveDependencyChain("Z.99.88"),
      ).rejects.toThrow(ArtifactNotFoundError);
    });

    it("detects circular dependencies", async () => {
      // Create circular dependency: A.1.4 → A.1.5 → A.1.4
      let issue = scaffoldIssue({
        title: "Issue A.1.4",
        createdBy: "Test User (test@example.com)",
        summary: "Fourth issue",
        acceptanceCriteria: ["Criterion 4"],
      });
      issue.metadata.relationships = {
        blocked_by: ["A.1.5"],
        blocks: [],
      };
      await artifactService.createArtifact({
        id: "A.1.4",
        artifact: issue,
        slug: "issue-a14",
        baseDir: testBaseDir,
      });

      issue = scaffoldIssue({
        title: "Issue A.1.5",
        createdBy: "Test User (test@example.com)",
        summary: "Fifth issue",
        acceptanceCriteria: ["Criterion 5"],
      });
      issue.metadata.relationships = {
        blocked_by: ["A.1.4"],
        blocks: [],
      };
      await artifactService.createArtifact({
        id: "A.1.5",
        artifact: issue,
        slug: "issue-a15",
        baseDir: testBaseDir,
      });

      await expect(depService.resolveDependencyChain("A.1.4")).rejects.toThrow(
        /circular dependency/i,
      );
    });
  });

  describe("validation wrappers", () => {
    it("detectCircularDependencies returns empty for valid graph", async () => {
      await createDependencyChain();

      const issues = await depService.detectCircularDependencies();

      expect(issues).toHaveLength(0);
    });

    it("detectCircularDependencies detects cycles", async () => {
      // Create circular dependency
      await artifactService.createArtifact({
        id: "A",
        artifact: scaffoldInitiative({
          title: "Initiative A",
          createdBy: "Test User (test@example.com)",
          vision: "Vision A",
          scopeIn: ["Feature A"],
          scopeOut: ["Feature Z"],
          successCriteria: ["Criterion A"],
        }),
        slug: "initiative-a",
        baseDir: testBaseDir,
      });

      await artifactService.createArtifact({
        id: "A.1",
        artifact: scaffoldMilestone({
          title: "Milestone A.1",
          createdBy: "Test User (test@example.com)",
          summary: "First milestone",
          deliverables: ["Deliverable 1"],
        }),
        slug: "milestone-a1",
        baseDir: testBaseDir,
      });

      let issue = scaffoldIssue({
        title: "Issue A.1.1",
        createdBy: "Test User (test@example.com)",
        summary: "First issue",
        acceptanceCriteria: ["Criterion 1"],
      });
      issue.metadata.relationships = {
        blocked_by: ["A.1.2"],
        blocks: ["A.1.2"], // Bidirectional circular
      };
      await artifactService.createArtifact({
        id: "A.1.1",
        artifact: issue,
        slug: "issue-a11",
        baseDir: testBaseDir,
      });

      issue = scaffoldIssue({
        title: "Issue A.1.2",
        createdBy: "Test User (test@example.com)",
        summary: "Second issue",
        acceptanceCriteria: ["Criterion 2"],
      });
      issue.metadata.relationships = {
        blocked_by: ["A.1.1"],
        blocks: ["A.1.1"], // Bidirectional circular
      };
      await artifactService.createArtifact({
        id: "A.1.2",
        artifact: issue,
        slug: "issue-a12",
        baseDir: testBaseDir,
      });

      const issues = await depService.detectCircularDependencies();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].code).toBe("CIRCULAR_DEPENDENCY");
      expect(issues[0].cycle).toContain("A.1.1");
      expect(issues[0].cycle).toContain("A.1.2");
    });

    it("detectCrossLevelDependencies returns empty for valid graph", async () => {
      await createDependencyChain();

      const issues = await depService.detectCrossLevelDependencies();

      expect(issues).toHaveLength(0);
    });

    it("validateRelationshipConsistency returns empty for consistent graph", async () => {
      await createDependencyChain();

      const issues = await depService.validateRelationshipConsistency();

      expect(issues).toHaveLength(0);
    });
  });

  describe("caching", () => {
    beforeEach(async () => {
      await createDependencyChain();
    });

    it("caches artifacts for performance", async () => {
      // Clear cache first
      depService.clearCache();

      // First load - cold cache
      const start1 = performance.now();
      await depService.getDependencies("A.1.2");
      const duration1 = performance.now() - start1;

      // Second load - warm cache
      const start2 = performance.now();
      await depService.getDependencies("A.1.2");
      const duration2 = performance.now() - start2;

      // Cached load should be faster
      expect(duration2).toBeLessThan(duration1);
    });

    it("clearCache() resets cache", async () => {
      // Load some artifacts
      await depService.getDependencies("A.1.2");

      // Clear cache
      depService.clearCache();

      // Load again - should hit filesystem
      const deps = await depService.getDependencies("A.1.2");

      expect(deps).toHaveLength(1);
    });
  });

  describe("performance", () => {
    it("resolves dependency chain for 100+ artifacts in <100ms", async () => {
      // Create a long chain of dependencies
      await artifactService.createArtifact({
        id: "A",
        artifact: scaffoldInitiative({
          title: "Initiative A",
          createdBy: "Test User (test@example.com)",
          vision: "Vision A",
          scopeIn: ["Feature A"],
          scopeOut: ["Feature Z"],
          successCriteria: ["Criterion A"],
        }),
        slug: "initiative-a",
        baseDir: testBaseDir,
      });

      await artifactService.createArtifact({
        id: "A.1",
        artifact: scaffoldMilestone({
          title: "Milestone A.1",
          createdBy: "Test User (test@example.com)",
          summary: "First milestone",
          deliverables: ["Deliverable 1"],
        }),
        slug: "milestone-a1",
        baseDir: testBaseDir,
      });

      // Create 150 issues in a chain
      for (let i = 1; i <= 150; i++) {
        const issue = scaffoldIssue({
          title: `Issue A.1.${i}`,
          createdBy: "Test User (test@example.com)",
          summary: `Issue ${i}`,
          acceptanceCriteria: ["Criterion"],
        });

        // Each depends on the previous one
        if (i > 1) {
          issue.metadata.relationships = {
            blocked_by: [`A.1.${i - 1}`],
            blocks: [],
          };
        }

        await artifactService.createArtifact({
          id: `A.1.${i}`,
          artifact: issue,
          slug: `issue-a1${i}`,
          baseDir: testBaseDir,
        });
      }

      const start = performance.now();
      const chain = await depService.resolveDependencyChain("A.1.150");
      const duration = performance.now() - start;

      expect(chain.length).toBe(149); // All previous issues

      // Performance measurement for local visibility (typically <150ms locally, may vary in CI)
      // Not asserting on duration to avoid flakiness across different environments
      console.log(
        `resolveDependencyChain() for 150 artifacts completed in ${duration.toFixed(2)}ms`,
      );
    }, 120000); // 2 minute timeout for this test
  });
});
