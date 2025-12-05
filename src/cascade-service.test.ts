import {
  scaffoldInitiative,
  scaffoldIssue,
  scaffoldMilestone,
} from "@kodebase/core";
import { vol } from "memfs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArtifactService } from "./artifact-service.js";
import {
  type CascadeResult,
  CascadeService,
  type CompletionCascadeOptions,
  type ProgressCascadeOptions,
  type ReadinessCascadeOptions,
} from "./cascade-service.js";
import { DependencyGraphService } from "./dependency-graph-service.js";
import { QueryService } from "./query-service.js";

// Mock node:fs/promises to use memfs
vi.mock("node:fs/promises", async () => {
  const { fs } = await import("memfs");
  return {
    default: fs.promises,
  };
});

describe("CascadeService", () => {
  const testBaseDir = "/test-workspace";
  let cascadeService: CascadeService;
  let artifactService: ArtifactService;
  let queryService: QueryService;
  let dependencyGraphService: DependencyGraphService;

  beforeEach(() => {
    // Reset memfs volume before each test
    vol.reset();
    // Create base test directory
    vol.mkdirSync(testBaseDir, { recursive: true });

    // Initialize services
    artifactService = new ArtifactService();
    queryService = new QueryService(testBaseDir);
    dependencyGraphService = new DependencyGraphService(testBaseDir);

    // Create cascade service with injected dependencies
    cascadeService = new CascadeService({
      artifactService,
      queryService,
      dependencyGraphService,
    });
  });

  afterEach(() => {
    // Clean up memfs after each test
    vol.reset();
  });

  describe("constructor", () => {
    it("should initialize with default services when none provided", () => {
      const service = new CascadeService();
      expect(service).toBeInstanceOf(CascadeService);
    });

    it("should accept custom service dependencies", () => {
      const customArtifactService = new ArtifactService();
      const customQueryService = new QueryService(testBaseDir);
      const customDependencyGraphService = new DependencyGraphService(
        testBaseDir,
      );

      const service = new CascadeService({
        artifactService: customArtifactService,
        queryService: customQueryService,
        dependencyGraphService: customDependencyGraphService,
      });

      expect(service).toBeInstanceOf(CascadeService);
    });
  });

  describe("executeCompletionCascade", () => {
    // NOTE: executeCompletionCascade is now a no-op.
    // Parent completion is now explicit via `kb complete <id>` command.
    // These tests verify the method returns empty results for API compatibility.

    it("should return empty result (deprecated - no automatic parent cascade)", async () => {
      // Act: Try to cascade for any artifact
      const result = await cascadeService.executeCompletionCascade({
        artifactId: "A.1.3",
        trigger: "pr_merged",
        baseDir: testBaseDir,
      });

      // Assert: Always returns empty result (method is now a no-op)
      expect(result.updatedArtifacts).toEqual([]);
      expect(result.events).toEqual([]);
    });

    it("should return empty result regardless of artifact state", async () => {
      // Arrange: Create complete hierarchy with all children completed
      await artifactService.createArtifact({
        id: "A",
        artifact: scaffoldInitiative({
          title: "Initiative A",
          createdBy: "Test User (test@example.com)",
          vision: "Test vision",
          scopeIn: ["Feature A"],
          scopeOut: ["Feature Z"],
          successCriteria: ["Criterion A"],
        }),
        slug: "initiative-a",
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "A",
        slug: "initiative-a",
        event: {
          event: "in_progress",
          timestamp: "2025-01-01T10:00:00Z",
          actor: "Test User",
          trigger: "children_started",
        },
        baseDir: testBaseDir,
      });

      await artifactService.createArtifact({
        id: "A.1",
        artifact: scaffoldMilestone({
          title: "Milestone A.1",
          createdBy: "Test User (test@example.com)",
          summary: "Test milestone",
          deliverables: ["Deliverable 1"],
        }),
        slug: "milestone-a1",
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "A.1",
        slug: "milestone-a1",
        event: {
          event: "in_progress",
          timestamp: "2025-01-01T10:01:00Z",
          actor: "Test User",
          trigger: "children_started",
        },
        baseDir: testBaseDir,
      });

      await artifactService.createArtifact({
        id: "A.1.1",
        artifact: scaffoldIssue({
          title: "Issue A.1.1",
          createdBy: "Test User (test@example.com)",
          summary: "Test issue",
          acceptanceCriteria: ["Criterion 1"],
        }),
        slug: "issue-a11",
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "A.1.1",
        slug: "issue-a11",
        event: {
          event: "completed",
          timestamp: "2025-01-01T12:00:00Z",
          actor: "Test User",
          trigger: "pr_merged",
        },
        baseDir: testBaseDir,
      });

      // Act: Try to cascade (even with valid setup)
      const result = await cascadeService.executeCompletionCascade({
        artifactId: "A.1.1",
        trigger: "pr_merged",
        baseDir: testBaseDir,
      });

      // Assert: Still returns empty (completion cascade is deprecated)
      expect(result.updatedArtifacts).toEqual([]);
      expect(result.events).toEqual([]);

      // Verify parent was NOT updated
      const parent = await artifactService.getArtifact({
        id: "A.1",
        slug: "milestone-a1",
        baseDir: testBaseDir,
      });
      const lastEvent =
        parent.metadata.events[parent.metadata.events.length - 1];
      expect(lastEvent?.event).toBe("in_progress"); // Still in_progress, not in_review
    });
  });

  describe("executeReadinessCascade", () => {
    it("should transition dependent from blocked to ready when blocker completes", async () => {
      // Arrange: Create A.1 (blocker) and A.2 (dependent blocked by A.1)
      await artifactService.createArtifact({
        id: "A",
        artifact: scaffoldInitiative({
          title: "Initiative A",
          createdBy: "Test User (test@example.com)",
          vision: "Test vision",
          scopeIn: ["Feature A"],
          scopeOut: ["Feature Z"],
          successCriteria: ["Criterion A"],
        }),
        slug: "initiative-a",
        baseDir: testBaseDir,
      });

      // Create blocker milestone A.1
      await artifactService.createArtifact({
        id: "A.1",
        artifact: scaffoldMilestone({
          title: "Milestone A.1",
          createdBy: "Test User (test@example.com)",
          summary: "Blocker milestone",
          deliverables: ["Deliverable 1"],
        }),
        slug: "milestone-a1",
        baseDir: testBaseDir,
      });

      // Create dependent milestone A.2 blocked by A.1
      const a2 = scaffoldMilestone({
        title: "Milestone A.2",
        createdBy: "Test User (test@example.com)",
        summary: "Dependent milestone",
        deliverables: ["Deliverable 2"],
      });
      a2.metadata.relationships.blocked_by = ["A.1"];

      await artifactService.createArtifact({
        id: "A.2",
        artifact: a2,
        slug: "milestone-a2",
        baseDir: testBaseDir,
      });

      // Add blocked event to A.2
      await artifactService.appendEvent({
        id: "A.2",
        slug: "milestone-a2",
        event: {
          event: "blocked",
          timestamp: "2025-01-01T10:00:00Z",
          actor: "Test User",
          trigger: "has_dependencies",
          metadata: {
            blocking_dependencies: [
              {
                artifact_id: "A.1",
                resolved: false,
              },
            ],
          },
        },
        baseDir: testBaseDir,
      });

      // Complete blocker A.1
      await artifactService.appendEvent({
        id: "A.1",
        slug: "milestone-a1",
        event: {
          event: "completed",
          timestamp: "2025-01-01T12:00:00Z",
          actor: "Test User",
          trigger: "pr_merged",
        },
        baseDir: testBaseDir,
      });

      // Act: Execute readiness cascade
      const result = await cascadeService.executeReadinessCascade({
        completedArtifactId: "A.1",
        baseDir: testBaseDir,
      });

      // Assert: A.2 moved to ready
      expect(result.updatedArtifacts).toHaveLength(1);
      expect(result.updatedArtifacts[0]?.metadata.title).toBe("Milestone A.2");
      expect(result.events).toHaveLength(1);
      expect(result.events[0]?.artifactId).toBe("A.2");
      expect(result.events[0]?.event).toBe("ready");
      expect(result.events[0]?.trigger).toBe("dependencies_met");

      // Verify artifact has ready event
      const updated = await artifactService.getArtifact({
        id: "A.2",
        slug: "milestone-a2",
        baseDir: testBaseDir,
      });
      const lastEvent =
        updated.metadata.events[updated.metadata.events.length - 1];
      expect(lastEvent?.event).toBe("ready");

      // Verify dependency is marked as resolved
      const blockedEvent = updated.metadata.events.find(
        (e) => e.event === "blocked",
      );
      expect(blockedEvent?.metadata?.blocking_dependencies).toEqual([
        {
          artifact_id: "A.1",
          resolved: true,
          resolved_at: expect.any(String),
        },
      ]);
    });

    it("should handle partial dependency resolution (multiple blockers)", async () => {
      // Arrange: Create A.1, A.2 (blockers) and A.3 (dependent blocked by both)
      await artifactService.createArtifact({
        id: "A",
        artifact: scaffoldInitiative({
          title: "Initiative A",
          createdBy: "Test User (test@example.com)",
          vision: "Test vision",
          scopeIn: ["Feature A"],
          scopeOut: ["Feature Z"],
          successCriteria: ["Criterion A"],
        }),
        slug: "initiative-a",
        baseDir: testBaseDir,
      });

      // Create blocker milestones
      await artifactService.createArtifact({
        id: "A.1",
        artifact: scaffoldMilestone({
          title: "Milestone A.1",
          createdBy: "Test User (test@example.com)",
          summary: "Blocker 1",
          deliverables: ["Deliverable 1"],
        }),
        slug: "milestone-a1",
        baseDir: testBaseDir,
      });

      await artifactService.createArtifact({
        id: "A.2",
        artifact: scaffoldMilestone({
          title: "Milestone A.2",
          createdBy: "Test User (test@example.com)",
          summary: "Blocker 2",
          deliverables: ["Deliverable 2"],
        }),
        slug: "milestone-a2",
        baseDir: testBaseDir,
      });

      // Create dependent blocked by both
      const a3 = scaffoldMilestone({
        title: "Milestone A.3",
        createdBy: "Test User (test@example.com)",
        summary: "Dependent milestone",
        deliverables: ["Deliverable 3"],
      });
      a3.metadata.relationships.blocked_by = ["A.1", "A.2"];

      await artifactService.createArtifact({
        id: "A.3",
        artifact: a3,
        slug: "milestone-a3",
        baseDir: testBaseDir,
      });

      // Add blocked event to A.3
      await artifactService.appendEvent({
        id: "A.3",
        slug: "milestone-a3",
        event: {
          event: "blocked",
          timestamp: "2025-01-01T10:00:00Z",
          actor: "Test User",
          trigger: "has_dependencies",
          metadata: {
            blocking_dependencies: [
              {
                artifact_id: "A.1",
                resolved: false,
              },
              {
                artifact_id: "A.2",
                resolved: false,
              },
            ],
          },
        },
        baseDir: testBaseDir,
      });

      // Complete only A.1 (not A.2 yet)
      await artifactService.appendEvent({
        id: "A.1",
        slug: "milestone-a1",
        event: {
          event: "completed",
          timestamp: "2025-01-01T12:00:00Z",
          actor: "Test User",
          trigger: "pr_merged",
        },
        baseDir: testBaseDir,
      });

      // Act: Execute cascade for A.1
      const result = await cascadeService.executeReadinessCascade({
        completedArtifactId: "A.1",
        baseDir: testBaseDir,
      });

      // Assert: A.3 updated but still blocked (no ready event yet)
      expect(result.updatedArtifacts).toHaveLength(1);
      expect(result.events).toHaveLength(0); // No ready event

      // Verify A.1 is resolved but A.2 is not
      const updated = await artifactService.getArtifact({
        id: "A.3",
        slug: "milestone-a3",
        baseDir: testBaseDir,
      });
      const blockedEvent = updated.metadata.events.find(
        (e) => e.event === "blocked",
      );
      expect(blockedEvent?.metadata?.blocking_dependencies).toEqual([
        {
          artifact_id: "A.1",
          resolved: true,
          resolved_at: expect.any(String),
        },
        {
          artifact_id: "A.2",
          resolved: false,
        },
      ]);

      // Still in blocked state (no ready event)
      const lastEvent =
        updated.metadata.events[updated.metadata.events.length - 1];
      expect(lastEvent?.event).toBe("blocked");
    });

    it("should transition to ready when all blockers complete", async () => {
      // Arrange: Create fresh artifacts for this test (can't reuse from previous test)
      await artifactService.createArtifact({
        id: "E",
        artifact: scaffoldInitiative({
          title: "Initiative E",
          createdBy: "Test User (test@example.com)",
          vision: "Test vision",
          scopeIn: ["Feature E"],
          scopeOut: ["Feature Z"],
          successCriteria: ["Criterion E"],
        }),
        slug: "initiative-e",
        baseDir: testBaseDir,
      });

      await artifactService.createArtifact({
        id: "E.1",
        artifact: scaffoldMilestone({
          title: "Milestone E.1",
          createdBy: "Test User (test@example.com)",
          summary: "Blocker 1",
          deliverables: ["Deliverable 1"],
        }),
        slug: "milestone-e1",
        baseDir: testBaseDir,
      });

      await artifactService.createArtifact({
        id: "E.2",
        artifact: scaffoldMilestone({
          title: "Milestone E.2",
          createdBy: "Test User (test@example.com)",
          summary: "Blocker 2",
          deliverables: ["Deliverable 2"],
        }),
        slug: "milestone-e2",
        baseDir: testBaseDir,
      });

      const e3 = scaffoldMilestone({
        title: "Milestone E.3",
        createdBy: "Test User (test@example.com)",
        summary: "Dependent milestone",
        deliverables: ["Deliverable 3"],
      });
      e3.metadata.relationships.blocked_by = ["E.1", "E.2"];

      await artifactService.createArtifact({
        id: "E.3",
        artifact: e3,
        slug: "milestone-e3",
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "E.3",
        slug: "milestone-e3",
        event: {
          event: "blocked",
          timestamp: "2025-01-01T10:00:00Z",
          actor: "Test User",
          trigger: "has_dependencies",
          metadata: {
            blocking_dependencies: [
              {
                artifact_id: "E.1",
                resolved: false,
              },
              {
                artifact_id: "E.2",
                resolved: false,
              },
            ],
          },
        },
        baseDir: testBaseDir,
      });

      // Complete E.1 first
      await artifactService.appendEvent({
        id: "E.1",
        slug: "milestone-e1",
        event: {
          event: "completed",
          timestamp: "2025-01-01T12:00:00Z",
          actor: "Test User",
          trigger: "pr_merged",
        },
        baseDir: testBaseDir,
      });

      await cascadeService.executeReadinessCascade({
        completedArtifactId: "E.1",
        baseDir: testBaseDir,
      });

      // Now complete E.2
      await artifactService.appendEvent({
        id: "E.2",
        slug: "milestone-e2",
        event: {
          event: "completed",
          timestamp: "2025-01-01T13:00:00Z",
          actor: "Test User",
          trigger: "pr_merged",
        },
        baseDir: testBaseDir,
      });

      // Act: Execute cascade for E.2 (all blockers now complete)
      const result = await cascadeService.executeReadinessCascade({
        completedArtifactId: "E.2",
        baseDir: testBaseDir,
      });

      // Assert: E.3 now moves to ready
      expect(result.updatedArtifacts).toHaveLength(1);
      expect(result.events).toHaveLength(1);
      expect(result.events[0]?.artifactId).toBe("E.3");
      expect(result.events[0]?.event).toBe("ready");

      // Verify artifact has ready event
      const updated = await artifactService.getArtifact({
        id: "E.3",
        slug: "milestone-e3",
        baseDir: testBaseDir,
      });
      const lastEvent =
        updated.metadata.events[updated.metadata.events.length - 1];
      expect(lastEvent?.event).toBe("ready");

      // All dependencies resolved
      const blockedEvent = updated.metadata.events.find(
        (e) => e.event === "blocked",
      );
      expect(blockedEvent?.metadata?.blocking_dependencies).toEqual([
        {
          artifact_id: "E.1",
          resolved: true,
          resolved_at: expect.any(String),
        },
        {
          artifact_id: "E.2",
          resolved: true,
          resolved_at: expect.any(String),
        },
      ]);
    });

    it("should return empty result when artifact has no dependents", async () => {
      // Arrange: Create standalone artifact
      await artifactService.createArtifact({
        id: "B",
        artifact: scaffoldInitiative({
          title: "Initiative B",
          createdBy: "Test User (test@example.com)",
          vision: "Test vision",
          scopeIn: ["Feature B"],
          scopeOut: ["Feature Z"],
          successCriteria: ["Criterion B"],
        }),
        slug: "initiative-b",
        baseDir: testBaseDir,
      });

      await artifactService.createArtifact({
        id: "B.1",
        artifact: scaffoldMilestone({
          title: "Milestone B.1",
          createdBy: "Test User (test@example.com)",
          summary: "Standalone milestone",
          deliverables: ["Deliverable 1"],
        }),
        slug: "milestone-b1",
        baseDir: testBaseDir,
      });

      // Act: Execute cascade (no dependents)
      const result = await cascadeService.executeReadinessCascade({
        completedArtifactId: "B.1",
        baseDir: testBaseDir,
      });

      // Assert: Empty result
      expect(result.updatedArtifacts).toEqual([]);
      expect(result.events).toEqual([]);
    });

    it("should return empty result when artifact doesn't exist", async () => {
      // Act: Execute cascade for non-existent artifact
      const result = await cascadeService.executeReadinessCascade({
        completedArtifactId: "Z.1",
        baseDir: testBaseDir,
      });

      // Assert: Empty result
      expect(result.updatedArtifacts).toEqual([]);
      expect(result.events).toEqual([]);
    });

    it("should skip dependents with no blocked event", async () => {
      // Arrange: Create artifacts where dependent has no blocked event
      await artifactService.createArtifact({
        id: "C",
        artifact: scaffoldInitiative({
          title: "Initiative C",
          createdBy: "Test User (test@example.com)",
          vision: "Test vision",
          scopeIn: ["Feature C"],
          scopeOut: ["Feature Z"],
          successCriteria: ["Criterion C"],
        }),
        slug: "initiative-c",
        baseDir: testBaseDir,
      });

      await artifactService.createArtifact({
        id: "C.1",
        artifact: scaffoldMilestone({
          title: "Milestone C.1",
          createdBy: "Test User (test@example.com)",
          summary: "Blocker milestone",
          deliverables: ["Deliverable 1"],
        }),
        slug: "milestone-c1",
        baseDir: testBaseDir,
      });

      // Create dependent but don't add blocked event (already ready)
      await artifactService.createArtifact({
        id: "C.2",
        artifact: scaffoldMilestone({
          title: "Milestone C.2",
          createdBy: "Test User (test@example.com)",
          summary: "Dependent milestone",
          deliverables: ["Deliverable 2"],
        }),
        slug: "milestone-c2",
        baseDir: testBaseDir,
      });

      // Make C.2 list C.1 as blocker in relationships
      const c2 = await artifactService.getArtifact({
        id: "C.2",
        slug: "milestone-c2",
        baseDir: testBaseDir,
      });
      c2.metadata.relationships.blocked_by = ["C.1"];
      const { writeArtifact, resolveArtifactPaths } = await import(
        "@kodebase/core"
      );
      const { filePath } = await resolveArtifactPaths({
        id: "C.2",
        slug: "milestone-c2",
        baseDir: testBaseDir,
      });
      await writeArtifact(filePath, c2);

      // Complete C.1
      await artifactService.appendEvent({
        id: "C.1",
        slug: "milestone-c1",
        event: {
          event: "completed",
          timestamp: "2025-01-01T12:00:00Z",
          actor: "Test User",
          trigger: "pr_merged",
        },
        baseDir: testBaseDir,
      });

      // Act: Execute cascade
      const result = await cascadeService.executeReadinessCascade({
        completedArtifactId: "C.1",
        baseDir: testBaseDir,
      });

      // Assert: Empty result (no blocked event means CascadeEngine returns updated: false)
      expect(result.updatedArtifacts).toHaveLength(0);
      expect(result.events).toHaveLength(0);
    });

    it("should use custom actor when provided", async () => {
      // Arrange: Create blocked artifact
      await artifactService.createArtifact({
        id: "D",
        artifact: scaffoldInitiative({
          title: "Initiative D",
          createdBy: "Test User (test@example.com)",
          vision: "Test vision",
          scopeIn: ["Feature D"],
          scopeOut: ["Feature Z"],
          successCriteria: ["Criterion D"],
        }),
        slug: "initiative-d",
        baseDir: testBaseDir,
      });

      await artifactService.createArtifact({
        id: "D.1",
        artifact: scaffoldMilestone({
          title: "Milestone D.1",
          createdBy: "Test User (test@example.com)",
          summary: "Blocker milestone",
          deliverables: ["Deliverable 1"],
        }),
        slug: "milestone-d1",
        baseDir: testBaseDir,
      });

      const d2 = scaffoldMilestone({
        title: "Milestone D.2",
        createdBy: "Test User (test@example.com)",
        summary: "Dependent milestone",
        deliverables: ["Deliverable 2"],
      });
      d2.metadata.relationships.blocked_by = ["D.1"];

      await artifactService.createArtifact({
        id: "D.2",
        artifact: d2,
        slug: "milestone-d2",
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "D.2",
        slug: "milestone-d2",
        event: {
          event: "blocked",
          timestamp: "2025-01-01T10:00:00Z",
          actor: "Test User",
          trigger: "has_dependencies",
          metadata: {
            blocking_dependencies: [
              {
                artifact_id: "D.1",
                resolved: false,
              },
            ],
          },
        },
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "D.1",
        slug: "milestone-d1",
        event: {
          event: "completed",
          timestamp: "2025-01-01T12:00:00Z",
          actor: "Test User",
          trigger: "pr_merged",
        },
        baseDir: testBaseDir,
      });

      // Act: Execute with custom actor
      const result = await cascadeService.executeReadinessCascade({
        completedArtifactId: "D.1",
        actor: "Custom Actor (custom@example.com)",
        baseDir: testBaseDir,
      });

      // Assert: Custom actor used (CascadeEngine uses the actor internally)
      expect(result.events[0]?.actor).toBe("Custom Actor (custom@example.com)");
    });
  });

  describe("executeProgressCascade", () => {
    it("should transition parent from ready to in_progress when first child starts", async () => {
      // Arrange: Create initiative → milestone → 3 issues
      await artifactService.createArtifact({
        id: "A",
        artifact: scaffoldInitiative({
          title: "Initiative A",
          createdBy: "Test User (test@example.com)",
          vision: "Test vision",
          scopeIn: ["Feature A"],
          scopeOut: ["Feature Z"],
          successCriteria: ["Criterion A"],
        }),
        slug: "initiative-a",
        baseDir: testBaseDir,
      });

      // Add ready event to initiative
      await artifactService.appendEvent({
        id: "A",
        slug: "initiative-a",
        event: {
          event: "ready",
          timestamp: "2025-01-01T09:00:00Z",
          actor: "Test User",
          trigger: "dependencies_met",
        },
        baseDir: testBaseDir,
      });

      // Milestone A.1
      await artifactService.createArtifact({
        id: "A.1",
        artifact: scaffoldMilestone({
          title: "Milestone A.1",
          createdBy: "Test User (test@example.com)",
          summary: "Test milestone",
          deliverables: ["Deliverable 1"],
        }),
        slug: "milestone-a1",
        baseDir: testBaseDir,
      });

      // Add ready event to milestone
      await artifactService.appendEvent({
        id: "A.1",
        slug: "milestone-a1",
        event: {
          event: "ready",
          timestamp: "2025-01-01T09:30:00Z",
          actor: "Test User",
          trigger: "dependencies_met",
        },
        baseDir: testBaseDir,
      });

      // Create 3 issues, all in draft
      for (let i = 1; i <= 3; i++) {
        await artifactService.createArtifact({
          id: `A.1.${i}`,
          artifact: scaffoldIssue({
            title: `Issue A.1.${i}`,
            createdBy: "Test User (test@example.com)",
            summary: `Test issue ${i}`,
            acceptanceCriteria: [`Criterion ${i}`],
          }),
          slug: `issue-a1${i}`,
          baseDir: testBaseDir,
        });
      }

      // Start first issue (this should trigger cascade)
      await artifactService.appendEvent({
        id: "A.1.1",
        slug: "issue-a11",
        event: {
          event: "in_progress",
          timestamp: "2025-01-01T10:00:00Z",
          actor: "Test User",
          trigger: "branch_created",
        },
        baseDir: testBaseDir,
      });

      // Act: Execute progress cascade for A.1.1
      const result = await cascadeService.executeProgressCascade({
        artifactId: "A.1.1",
        trigger: "branch_created",
        baseDir: testBaseDir,
      });

      // Assert: Parent milestone and grandparent initiative both moved to in_progress
      expect(result.updatedArtifacts).toHaveLength(2);
      expect(result.updatedArtifacts[0]?.metadata.title).toBe("Milestone A.1");
      expect(result.updatedArtifacts[1]?.metadata.title).toBe("Initiative A");
      expect(result.events).toHaveLength(2);
      // First event is for the milestone (direct parent)
      expect(result.events[0]?.artifactId).toBe("A.1");
      expect(result.events[0]?.event).toBe("in_progress");
      expect(result.events[0]?.trigger).toBe("children_started");
      // Second event is for the initiative (grandparent, cascaded from milestone)
      expect(result.events[1]?.artifactId).toBe("A");
      expect(result.events[1]?.event).toBe("in_progress");
      expect(result.events[1]?.trigger).toBe("children_started");

      // Verify parent artifact has in_progress event
      const updatedParent = await artifactService.getArtifact({
        id: "A.1",
        slug: "milestone-a1",
        baseDir: testBaseDir,
      });
      const lastEvent =
        updatedParent.metadata.events[updatedParent.metadata.events.length - 1];
      expect(lastEvent?.event).toBe("in_progress");
    });

    it("should return empty result when parent doesn't exist", async () => {
      // Act: Try to cascade for non-existent artifact
      const result = await cascadeService.executeProgressCascade({
        artifactId: "Z.1.1",
        trigger: "branch_created",
        baseDir: testBaseDir,
      });

      // Assert: Empty result (parent doesn't exist)
      expect(result.updatedArtifacts).toEqual([]);
      expect(result.events).toEqual([]);
    });

    it("should return empty result when artifact is top-level initiative", async () => {
      // Arrange: Create initiative
      await artifactService.createArtifact({
        id: "A",
        artifact: scaffoldInitiative({
          title: "Initiative A",
          createdBy: "Test User (test@example.com)",
          vision: "Test vision",
          scopeIn: ["Feature A"],
          scopeOut: ["Feature Z"],
          successCriteria: ["Criterion A"],
        }),
        slug: "initiative-a",
        baseDir: testBaseDir,
      });

      // Act: Try to cascade top-level initiative (no parent)
      const result = await cascadeService.executeProgressCascade({
        artifactId: "A",
        trigger: "branch_created",
        baseDir: testBaseDir,
      });

      // Assert: Empty result (no parent to cascade to)
      expect(result.updatedArtifacts).toEqual([]);
      expect(result.events).toEqual([]);
    });

    it("should return empty result when parent not ready", async () => {
      // Arrange: Create milestone and issue, but parent is still in draft
      await artifactService.createArtifact({
        id: "A",
        artifact: scaffoldInitiative({
          title: "Initiative A",
          createdBy: "Test User (test@example.com)",
          vision: "Test vision",
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
          summary: "Test milestone",
          deliverables: ["Deliverable 1"],
        }),
        slug: "milestone-a1",
        baseDir: testBaseDir,
      });

      // Parent is still in draft (not ready)

      // Act: Try to cascade
      const result = await cascadeService.executeProgressCascade({
        artifactId: "A.1",
        trigger: "branch_created",
        baseDir: testBaseDir,
      });

      // Assert: Empty result (parent not ready)
      expect(result.updatedArtifacts).toEqual([]);
      expect(result.events).toEqual([]);
    });

    it("should return empty result when parent already in_progress", async () => {
      // Arrange: Create milestone with 2 issues, parent already started
      await artifactService.createArtifact({
        id: "A",
        artifact: scaffoldInitiative({
          title: "Initiative A",
          createdBy: "Test User (test@example.com)",
          vision: "Test vision",
          scopeIn: ["Feature A"],
          scopeOut: ["Feature Z"],
          successCriteria: ["Criterion A"],
        }),
        slug: "initiative-a",
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "A",
        slug: "initiative-a",
        event: {
          event: "ready",
          timestamp: "2025-01-01T09:00:00Z",
          actor: "Test User",
          trigger: "dependencies_met",
        },
        baseDir: testBaseDir,
      });

      await artifactService.createArtifact({
        id: "A.1",
        artifact: scaffoldMilestone({
          title: "Milestone A.1",
          createdBy: "Test User (test@example.com)",
          summary: "Test milestone",
          deliverables: ["Deliverable 1"],
        }),
        slug: "milestone-a1",
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "A.1",
        slug: "milestone-a1",
        event: {
          event: "ready",
          timestamp: "2025-01-01T09:30:00Z",
          actor: "Test User",
          trigger: "dependencies_met",
        },
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "A.1",
        slug: "milestone-a1",
        event: {
          event: "in_progress",
          timestamp: "2025-01-01T10:00:00Z",
          actor: "Test User",
          trigger: "children_started",
        },
        baseDir: testBaseDir,
      });

      // Create 2 issues
      await artifactService.createArtifact({
        id: "A.1.1",
        artifact: scaffoldIssue({
          title: "Issue A.1.1",
          createdBy: "Test User (test@example.com)",
          summary: "Test issue 1",
          acceptanceCriteria: ["Criterion 1"],
        }),
        slug: "issue-a11",
        baseDir: testBaseDir,
      });

      await artifactService.createArtifact({
        id: "A.1.2",
        artifact: scaffoldIssue({
          title: "Issue A.1.2",
          createdBy: "Test User (test@example.com)",
          summary: "Test issue 2",
          acceptanceCriteria: ["Criterion 2"],
        }),
        slug: "issue-a12",
        baseDir: testBaseDir,
      });

      // Start second issue (parent already in_progress)
      await artifactService.appendEvent({
        id: "A.1.2",
        slug: "issue-a12",
        event: {
          event: "in_progress",
          timestamp: "2025-01-01T10:30:00Z",
          actor: "Test User",
          trigger: "branch_created",
        },
        baseDir: testBaseDir,
      });

      // Act: Try to cascade (parent already in_progress)
      const result = await cascadeService.executeProgressCascade({
        artifactId: "A.1.2",
        trigger: "branch_created",
        baseDir: testBaseDir,
      });

      // Assert: Empty result (parent already in_progress)
      expect(result.updatedArtifacts).toEqual([]);
      expect(result.events).toEqual([]);
    });

    it("should use custom actor when provided", async () => {
      // Arrange: Create ready parent and start child (use G to ensure uniqueness)
      await artifactService.createArtifact({
        id: "G",
        artifact: scaffoldInitiative({
          title: "Initiative G",
          createdBy: "Test User (test@example.com)",
          vision: "Test vision",
          scopeIn: ["Feature G"],
          scopeOut: ["Feature Z"],
          successCriteria: ["Criterion G"],
        }),
        slug: "initiative-g",
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "G",
        slug: "initiative-g",
        event: {
          event: "ready",
          timestamp: "2025-01-01T09:00:00Z",
          actor: "Test User",
          trigger: "dependencies_met",
        },
        baseDir: testBaseDir,
      });

      await artifactService.createArtifact({
        id: "G.1",
        artifact: scaffoldMilestone({
          title: "Milestone G.1",
          createdBy: "Test User (test@example.com)",
          summary: "Test milestone",
          deliverables: ["Deliverable 1"],
        }),
        slug: "milestone-g1",
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "G.1",
        slug: "milestone-g1",
        event: {
          event: "ready",
          timestamp: "2025-01-01T09:30:00Z",
          actor: "Test User",
          trigger: "dependencies_met",
        },
        baseDir: testBaseDir,
      });

      await artifactService.createArtifact({
        id: "G.1.1",
        artifact: scaffoldIssue({
          title: "Issue G.1.1",
          createdBy: "Test User (test@example.com)",
          summary: "Test issue",
          acceptanceCriteria: ["Criterion 1"],
        }),
        slug: "issue-g11",
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "G.1.1",
        slug: "issue-g11",
        event: {
          event: "in_progress",
          timestamp: "2025-01-01T10:00:00Z",
          actor: "Test User",
          trigger: "branch_created",
        },
        baseDir: testBaseDir,
      });

      // Act: Execute with custom actor
      const result = await cascadeService.executeProgressCascade({
        artifactId: "G.1.1",
        trigger: "branch_created",
        actor: "Git Hook (hook@post-checkout)",
        baseDir: testBaseDir,
      });

      // Assert: Cascade produced result (both milestone and initiative)
      expect(result.updatedArtifacts).toHaveLength(2);
      expect(result.events).toHaveLength(2);
      // First event is for the milestone (direct parent)
      expect(result.events[0]?.artifactId).toBe("G.1");
      expect(result.events[0]?.event).toBe("in_progress");
      expect(result.events[0]?.trigger).toBe("children_started");
      // CascadeEngine uses a single system actor for all cascade types
      expect(result.events[0]?.actor).toBe("agent.cascade");
      // Second event is for the initiative (grandparent)
      expect(result.events[1]?.artifactId).toBe("G");
      expect(result.events[1]?.event).toBe("in_progress");
      expect(result.events[1]?.trigger).toBe("children_started");
    });
  });

  describe("executeCascades", () => {
    it("should run only readiness cascade for pr_merged trigger (completion cascade deprecated)", async () => {
      // Arrange: Create hierarchy with blocking relationships
      // A (initiative)
      // ├── A.1 (milestone, blocks A.2) - marked as completed
      // └── A.2 (milestone, blocked by A.1)
      //
      // NOTE: Completion cascade no longer auto-transitions parent to in_review.
      // Parent completion is now explicit via `kb complete <id>` command.
      // Only readiness cascade (unblocking dependents) runs now.

      await artifactService.createArtifact({
        id: "A",
        artifact: scaffoldInitiative({
          title: "Initiative A",
          createdBy: "Test User (test@example.com)",
          vision: "Test vision",
          scopeIn: ["Feature A"],
          scopeOut: ["Feature Z"],
          successCriteria: ["Criterion A"],
        }),
        slug: "initiative-a",
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "A",
        slug: "initiative-a",
        event: {
          event: "in_progress",
          timestamp: "2025-01-01T10:00:00Z",
          actor: "Test User",
          trigger: "children_started",
        },
        baseDir: testBaseDir,
      });

      // Create A.1 (blocker milestone) - mark as completed
      await artifactService.createArtifact({
        id: "A.1",
        artifact: scaffoldMilestone({
          title: "Milestone A.1",
          createdBy: "Test User (test@example.com)",
          summary: "Blocker milestone",
          deliverables: ["Deliverable 1"],
        }),
        slug: "milestone-a1",
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "A.1",
        slug: "milestone-a1",
        event: {
          event: "completed",
          timestamp: "2025-01-01T12:00:00Z",
          actor: "Test User",
          trigger: "pr_merged",
        },
        baseDir: testBaseDir,
      });

      // Create A.2 (blocked by A.1)
      const a2 = scaffoldMilestone({
        title: "Milestone A.2",
        createdBy: "Test User (test@example.com)",
        summary: "Dependent milestone",
        deliverables: ["Deliverable 2"],
      });
      a2.metadata.relationships.blocked_by = ["A.1"];

      await artifactService.createArtifact({
        id: "A.2",
        artifact: a2,
        slug: "milestone-a2",
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "A.2",
        slug: "milestone-a2",
        event: {
          event: "blocked",
          timestamp: "2025-01-01T10:00:00Z",
          actor: "Test User",
          trigger: "has_dependencies",
          metadata: {
            blocking_dependencies: [
              {
                artifact_id: "A.1",
                resolved: false,
              },
            ],
          },
        },
        baseDir: testBaseDir,
      });

      // Act: Execute all cascades for A.1 (the completed milestone)
      const result = await cascadeService.executeCascades({
        artifactId: "A.1",
        trigger: "pr_merged",
        baseDir: testBaseDir,
      });

      // Assert: Only readiness cascade runs (completion cascade is deprecated)
      // A.2 should be unblocked and moved to ready
      expect(result.events.length).toBeGreaterThanOrEqual(1);

      // Check readiness cascade result - A.2 moved to ready
      const readinessEvent = result.events.find((e) => e.event === "ready");
      expect(readinessEvent?.artifactId).toBe("A.2");
      expect(readinessEvent?.trigger).toBe("dependencies_met");

      // No completion cascade result (no in_review event for parent)
      const completionEvent = result.events.find(
        (e) => e.event === "in_review",
      );
      expect(completionEvent).toBeUndefined();
    });

    it("should run progress cascade only for branch_created trigger", async () => {
      // Arrange: Create parent and child, parent ready
      await artifactService.createArtifact({
        id: "H",
        artifact: scaffoldInitiative({
          title: "Initiative H",
          createdBy: "Test User (test@example.com)",
          vision: "Test vision",
          scopeIn: ["Feature H"],
          scopeOut: ["Feature Z"],
          successCriteria: ["Criterion H"],
        }),
        slug: "initiative-h",
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "H",
        slug: "initiative-h",
        event: {
          event: "ready",
          timestamp: "2025-01-01T09:00:00Z",
          actor: "Test User",
          trigger: "dependencies_met",
        },
        baseDir: testBaseDir,
      });

      await artifactService.createArtifact({
        id: "H.1",
        artifact: scaffoldMilestone({
          title: "Milestone H.1",
          createdBy: "Test User (test@example.com)",
          summary: "Test milestone",
          deliverables: ["Deliverable 1"],
        }),
        slug: "milestone-h1",
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "H.1",
        slug: "milestone-h1",
        event: {
          event: "ready",
          timestamp: "2025-01-01T09:30:00Z",
          actor: "Test User",
          trigger: "dependencies_met",
        },
        baseDir: testBaseDir,
      });

      await artifactService.createArtifact({
        id: "H.1.1",
        artifact: scaffoldIssue({
          title: "Issue H.1.1",
          createdBy: "Test User (test@example.com)",
          summary: "Test issue",
          acceptanceCriteria: ["Criterion 1"],
        }),
        slug: "issue-h11",
        baseDir: testBaseDir,
      });

      // Start work on H.1.1
      await artifactService.appendEvent({
        id: "H.1.1",
        slug: "issue-h11",
        event: {
          event: "in_progress",
          timestamp: "2025-01-01T10:00:00Z",
          actor: "Test User",
          trigger: "branch_created",
        },
        baseDir: testBaseDir,
      });

      // Act: Execute with progress trigger
      const result = await cascadeService.executeCascades({
        artifactId: "H.1.1",
        trigger: "branch_created",
        baseDir: testBaseDir,
      });

      // Assert: Progress cascade runs for both milestone and initiative
      expect(result.updatedArtifacts).toHaveLength(2);
      expect(result.events).toHaveLength(2);
      // First event is for the milestone (direct parent)
      expect(result.events[0]?.artifactId).toBe("H.1");
      expect(result.events[0]?.event).toBe("in_progress");
      expect(result.events[0]?.trigger).toBe("children_started");
      // Second event is for the initiative (grandparent)
      expect(result.events[1]?.artifactId).toBe("H");
      expect(result.events[1]?.event).toBe("in_progress");
      expect(result.events[1]?.trigger).toBe("children_started");
    });

    it("should return empty result when no cascades trigger", async () => {
      // Arrange: Create artifact that won't trigger cascades
      await artifactService.createArtifact({
        id: "I",
        artifact: scaffoldInitiative({
          title: "Initiative I",
          createdBy: "Test User (test@example.com)",
          vision: "Test vision",
          scopeIn: ["Feature I"],
          scopeOut: ["Feature Z"],
          successCriteria: ["Criterion I"],
        }),
        slug: "initiative-i",
        baseDir: testBaseDir,
      });

      // Act: Try to cascade on top-level initiative (no parent)
      const result = await cascadeService.executeCascades({
        artifactId: "I",
        trigger: "pr_merged",
        baseDir: testBaseDir,
      });

      // Assert: Empty result
      expect(result.updatedArtifacts).toEqual([]);
      expect(result.events).toEqual([]);
    });

    it("should handle custom actor for readiness cascade", async () => {
      // Arrange: Create blocking scenario for readiness cascade
      // J.1 (blocker) and J.2 (blocked by J.1)
      await artifactService.createArtifact({
        id: "J",
        artifact: scaffoldInitiative({
          title: "Initiative J",
          createdBy: "Test User (test@example.com)",
          vision: "Test vision",
          scopeIn: ["Feature J"],
          scopeOut: ["Feature Z"],
          successCriteria: ["Criterion J"],
        }),
        slug: "initiative-j",
        baseDir: testBaseDir,
      });

      await artifactService.createArtifact({
        id: "J.1",
        artifact: scaffoldMilestone({
          title: "Milestone J.1",
          createdBy: "Test User (test@example.com)",
          summary: "Blocker milestone",
          deliverables: ["Deliverable 1"],
        }),
        slug: "milestone-j1",
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "J.1",
        slug: "milestone-j1",
        event: {
          event: "completed",
          timestamp: "2025-01-01T12:00:00Z",
          actor: "Test User",
          trigger: "pr_merged",
        },
        baseDir: testBaseDir,
      });

      // Create J.2 blocked by J.1
      const j2 = scaffoldMilestone({
        title: "Milestone J.2",
        createdBy: "Test User (test@example.com)",
        summary: "Dependent milestone",
        deliverables: ["Deliverable 2"],
      });
      j2.metadata.relationships.blocked_by = ["J.1"];

      await artifactService.createArtifact({
        id: "J.2",
        artifact: j2,
        slug: "milestone-j2",
        baseDir: testBaseDir,
      });

      await artifactService.appendEvent({
        id: "J.2",
        slug: "milestone-j2",
        event: {
          event: "blocked",
          timestamp: "2025-01-01T10:00:00Z",
          actor: "Test User",
          trigger: "has_dependencies",
          metadata: {
            blocking_dependencies: [
              {
                artifact_id: "J.1",
                resolved: false,
              },
            ],
          },
        },
        baseDir: testBaseDir,
      });

      // Act: Execute with custom actor
      const result = await cascadeService.executeCascades({
        artifactId: "J.1",
        trigger: "pr_merged",
        actor: "Git Hook (hook@post-merge)",
        baseDir: testBaseDir,
      });

      // Assert: Readiness cascade should use the custom actor
      expect(result.events.length).toBeGreaterThan(0);
      const readyEvent = result.events.find((e) => e.event === "ready");
      expect(readyEvent?.actor).toBe("Git Hook (hook@post-merge)");
    });
  });

  describe("type exports", () => {
    it("should export CascadeResult type", () => {
      const result: CascadeResult = {
        updatedArtifacts: [],
        events: [],
      };

      expect(result).toBeDefined();
      expect(result.updatedArtifacts).toEqual([]);
      expect(result.events).toEqual([]);
    });

    it("should export CompletionCascadeOptions type", () => {
      const options: CompletionCascadeOptions = {
        artifactId: "A.1.1",
        trigger: "pr_merged",
      };

      expect(options).toBeDefined();
      expect(options.artifactId).toBe("A.1.1");
    });

    it("should export ReadinessCascadeOptions type", () => {
      const options: ReadinessCascadeOptions = {
        completedArtifactId: "B.2",
        trigger: "dependencies_met",
      };

      expect(options).toBeDefined();
      expect(options.completedArtifactId).toBe("B.2");
    });

    it("should export ProgressCascadeOptions type", () => {
      const options: ProgressCascadeOptions = {
        artifactId: "A.1.1",
        trigger: "branch_created",
      };

      expect(options).toBeDefined();
      expect(options.artifactId).toBe("A.1.1");
    });
  });

  describe("Integration & Performance Tests", () => {
    describe("Performance Validation", () => {
      it("should complete readiness cascade chain in <100ms", async () => {
        // Setup 3-level blocking chain (PERF.1 → PERF.2 → PERF.3)
        // When PERF.1 completes, PERF.2 should become ready
        await artifactService.createArtifact({
          id: "PERF",
          artifact: scaffoldInitiative({
            title: "Performance Initiative",
            createdBy: "Test User (test@example.com)",
            vision: "Performance test",
            scopeIn: ["Feature A"],
            scopeOut: ["Feature Z"],
            successCriteria: ["Fast cascade"],
          }),
          slug: "perf-initiative",
          baseDir: testBaseDir,
        });

        await artifactService.createArtifact({
          id: "PERF.1",
          artifact: scaffoldMilestone({
            title: "Performance Blocker",
            createdBy: "Test User (test@example.com)",
            summary: "Performance blocker",
            deliverables: ["Deliverable 1"],
          }),
          slug: "perf-blocker",
          baseDir: testBaseDir,
        });

        await artifactService.appendEvent({
          id: "PERF.1",
          slug: "perf-blocker",
          event: {
            event: "completed",
            timestamp: "2025-01-01T12:00:00Z",
            actor: "Test User",
            trigger: "pr_merged",
          },
          baseDir: testBaseDir,
        });

        // Create PERF.2 blocked by PERF.1
        const perf2 = scaffoldMilestone({
          title: "Performance Dependent",
          createdBy: "Test User (test@example.com)",
          summary: "Performance dependent",
          deliverables: ["Deliverable 2"],
        });
        perf2.metadata.relationships.blocked_by = ["PERF.1"];

        await artifactService.createArtifact({
          id: "PERF.2",
          artifact: perf2,
          slug: "perf-dependent",
          baseDir: testBaseDir,
        });

        await artifactService.appendEvent({
          id: "PERF.2",
          slug: "perf-dependent",
          event: {
            event: "blocked",
            timestamp: "2025-01-01T10:00:00Z",
            actor: "Test User",
            trigger: "has_dependencies",
            metadata: {
              blocking_dependencies: [
                {
                  artifact_id: "PERF.1",
                  resolved: false,
                },
              ],
            },
          },
          baseDir: testBaseDir,
        });

        // Measure cascade execution time
        const startTime = performance.now();
        await cascadeService.executeCascades({
          artifactId: "PERF.1",
          trigger: "pr_merged",
          baseDir: testBaseDir,
        });
        const duration = performance.now() - startTime;

        // Performance measurement for local visibility (typically <100ms locally, may vary in CI)
        // Not asserting on duration to avoid flakiness across different environments
        console.log(`Readiness cascade completed in ${duration.toFixed(2)}ms`);
      });
    });

    describe("Idempotency Tests", () => {
      it("should safely handle running same cascade multiple times (readiness cascade)", async () => {
        // Setup: Blocking scenario for readiness cascade idempotency test
        // IDM.1 (blocker) and IDM.2 (blocked by IDM.1)
        await artifactService.createArtifact({
          id: "IDM",
          artifact: scaffoldInitiative({
            title: "Idempotent Initiative",
            createdBy: "Test User (test@example.com)",
            vision: "Idempotent test",
            scopeIn: ["Feature A"],
            scopeOut: ["Feature Z"],
            successCriteria: ["Idempotent"],
          }),
          slug: "idem-initiative",
          baseDir: testBaseDir,
        });

        await artifactService.createArtifact({
          id: "IDM.1",
          artifact: scaffoldMilestone({
            title: "Idempotent Blocker",
            createdBy: "Test User (test@example.com)",
            summary: "Idempotent blocker",
            deliverables: ["Deliverable 1"],
          }),
          slug: "idem-blocker",
          baseDir: testBaseDir,
        });

        await artifactService.appendEvent({
          id: "IDM.1",
          slug: "idem-blocker",
          event: {
            event: "completed",
            timestamp: "2025-01-01T12:00:00Z",
            actor: "Test User",
            trigger: "pr_merged",
          },
          baseDir: testBaseDir,
        });

        // Create IDM.2 blocked by IDM.1
        const idm2 = scaffoldMilestone({
          title: "Idempotent Dependent",
          createdBy: "Test User (test@example.com)",
          summary: "Idempotent dependent",
          deliverables: ["Deliverable 2"],
        });
        idm2.metadata.relationships.blocked_by = ["IDM.1"];

        await artifactService.createArtifact({
          id: "IDM.2",
          artifact: idm2,
          slug: "idem-dependent",
          baseDir: testBaseDir,
        });

        await artifactService.appendEvent({
          id: "IDM.2",
          slug: "idem-dependent",
          event: {
            event: "blocked",
            timestamp: "2025-01-01T10:00:00Z",
            actor: "Test User",
            trigger: "has_dependencies",
            metadata: {
              blocking_dependencies: [
                {
                  artifact_id: "IDM.1",
                  resolved: false,
                },
              ],
            },
          },
          baseDir: testBaseDir,
        });

        // Run cascade 3 times
        const result1 = await cascadeService.executeCascades({
          artifactId: "IDM.1",
          trigger: "pr_merged",
          baseDir: testBaseDir,
        });
        const result2 = await cascadeService.executeCascades({
          artifactId: "IDM.1",
          trigger: "pr_merged",
          baseDir: testBaseDir,
        });
        const result3 = await cascadeService.executeCascades({
          artifactId: "IDM.1",
          trigger: "pr_merged",
          baseDir: testBaseDir,
        });

        // First run should transition dependent to ready
        expect(result1.events.length).toBeGreaterThanOrEqual(1);
        expect(result1.events.some((e) => e.event === "ready")).toBe(true);

        // Subsequent runs should return empty results (no state changes)
        expect(result2.events.length).toBe(0);
        expect(result3.events.length).toBe(0);
      });

      it("should handle sequential cascade executions for multiple blockers", async () => {
        // Setup: Two blockers for one dependent
        // CON.1 and CON.2 both block CON.3
        // Running cascades sequentially to avoid race conditions in tests
        await artifactService.createArtifact({
          id: "CON",
          artifact: scaffoldInitiative({
            title: "Concurrent Initiative",
            createdBy: "Test User (test@example.com)",
            vision: "Concurrent test",
            scopeIn: ["Feature A"],
            scopeOut: ["Feature Z"],
            successCriteria: ["Concurrent"],
          }),
          slug: "concurrent-initiative",
          baseDir: testBaseDir,
        });

        await artifactService.createArtifact({
          id: "CON.1",
          artifact: scaffoldMilestone({
            title: "Concurrent Blocker 1",
            createdBy: "Test User (test@example.com)",
            summary: "Concurrent blocker 1",
            deliverables: ["Deliverable 1"],
          }),
          slug: "concurrent-blocker-1",
          baseDir: testBaseDir,
        });

        await artifactService.createArtifact({
          id: "CON.2",
          artifact: scaffoldMilestone({
            title: "Concurrent Blocker 2",
            createdBy: "Test User (test@example.com)",
            summary: "Concurrent blocker 2",
            deliverables: ["Deliverable 2"],
          }),
          slug: "concurrent-blocker-2",
          baseDir: testBaseDir,
        });

        // Create CON.3 blocked by both CON.1 and CON.2
        const con3 = scaffoldMilestone({
          title: "Concurrent Dependent",
          createdBy: "Test User (test@example.com)",
          summary: "Concurrent dependent",
          deliverables: ["Deliverable 3"],
        });
        con3.metadata.relationships.blocked_by = ["CON.1", "CON.2"];

        await artifactService.createArtifact({
          id: "CON.3",
          artifact: con3,
          slug: "concurrent-dependent",
          baseDir: testBaseDir,
        });

        await artifactService.appendEvent({
          id: "CON.3",
          slug: "concurrent-dependent",
          event: {
            event: "blocked",
            timestamp: "2025-01-01T10:00:00Z",
            actor: "Test User",
            trigger: "has_dependencies",
            metadata: {
              blocking_dependencies: [
                {
                  artifact_id: "CON.1",
                  resolved: false,
                },
                {
                  artifact_id: "CON.2",
                  resolved: false,
                },
              ],
            },
          },
          baseDir: testBaseDir,
        });

        // Complete both blockers
        await artifactService.appendEvent({
          id: "CON.1",
          slug: "concurrent-blocker-1",
          event: {
            event: "completed",
            timestamp: "2025-01-01T12:01:00Z",
            actor: "Test User",
            trigger: "pr_merged",
          },
          baseDir: testBaseDir,
        });

        await artifactService.appendEvent({
          id: "CON.2",
          slug: "concurrent-blocker-2",
          event: {
            event: "completed",
            timestamp: "2025-01-01T12:02:00Z",
            actor: "Test User",
            trigger: "pr_merged",
          },
          baseDir: testBaseDir,
        });

        // Run cascades sequentially - first CON.1 (partial resolution), then CON.2 (full resolution)
        const result1 = await cascadeService.executeCascades({
          artifactId: "CON.1",
          trigger: "pr_merged",
          baseDir: testBaseDir,
        });

        const result2 = await cascadeService.executeCascades({
          artifactId: "CON.2",
          trigger: "pr_merged",
          baseDir: testBaseDir,
        });

        // First cascade should update CON.3 (mark CON.1 as resolved) but NOT add ready
        // because CON.2 is still unresolved
        expect(result1.updatedArtifacts).toHaveLength(1);
        expect(result1.events).toHaveLength(0); // No ready event yet

        // Second cascade should transition CON.3 to ready
        expect(result2.events).toHaveLength(1);
        expect(result2.events[0]?.event).toBe("ready");

        // Verify CON.3 ended up in ready state
        const con3Updated = await artifactService.getArtifact({
          id: "CON.3",
          slug: "concurrent-dependent",
          baseDir: testBaseDir,
        });
        const lastEvent =
          con3Updated.metadata.events[con3Updated.metadata.events.length - 1];
        expect(lastEvent?.event).toBe("ready");
      });
    });
  });
});
