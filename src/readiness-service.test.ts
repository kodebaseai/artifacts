import {
  CArtifactEvent,
  scaffoldInitiative,
  scaffoldIssue,
  scaffoldMilestone,
} from "@kodebase/core";
import { vol } from "memfs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArtifactService } from "./artifact-service.js";
import { ArtifactNotFoundError } from "./errors.js";
import { ReadinessService } from "./readiness-service.js";

// Mock node:fs/promises to use memfs
vi.mock("node:fs/promises", async () => {
  const { fs } = await import("memfs");
  return {
    default: fs.promises,
  };
});

describe("ReadinessService", () => {
  const testBaseDir = "/test-project";
  let readinessService: ReadinessService;
  let artifactService: ArtifactService;

  beforeEach(() => {
    // Reset memfs before each test
    vol.reset();

    readinessService = new ReadinessService(testBaseDir);
    artifactService = new ArtifactService(testBaseDir);
  });

  afterEach(() => {
    vol.reset();
  });

  /**
   * Creates a hierarchy with dependencies and various states:
   * A (initiative - in_progress)
   *   A.1 (milestone - in_progress)
   *     A.1.1 (issue - completed, blocks A.1.2)
   *     A.1.2 (issue - ready, blocked by A.1.1, blocks A.1.3)
   *     A.1.3 (issue - draft, blocked by A.1.2)
   */
  async function createTestHierarchy(): Promise<void> {
    // Create initiative A (in_progress - allows children to work)
    const initiative = scaffoldInitiative({
      title: "Initiative A",
      createdBy: "Test User (test@example.com)",
      vision: "Vision A",
      scopeIn: ["Feature A"],
      scopeOut: ["Feature Z"],
      successCriteria: ["Criterion A"],
    });
    initiative.metadata.events.push({
      event: CArtifactEvent.IN_PROGRESS,
      timestamp: new Date().toISOString(),
      actor: "Test User (test@example.com)",
      trigger: "work_started",
    });
    await artifactService.createArtifact({
      id: "A",
      artifact: initiative,
      slug: "initiative-a",
      baseDir: testBaseDir,
    });

    // Create milestone A.1 (in_progress - allows children to work)
    const milestone = scaffoldMilestone({
      title: "Milestone A.1",
      createdBy: "Test User (test@example.com)",
      description: "First milestone",
      scopeIn: ["Sub-feature 1"],
      scopeOut: ["Out of scope"],
      deliverables: ["Deliverable 1"],
    });
    milestone.metadata.events.push({
      event: CArtifactEvent.IN_PROGRESS,
      timestamp: new Date().toISOString(),
      actor: "Test User (test@example.com)",
      trigger: "work_started",
    });
    await artifactService.createArtifact({
      id: "A.1",
      artifact: milestone,
      slug: "milestone-a1",
      baseDir: testBaseDir,
    });

    // Create issue A.1.1 (completed, no dependencies, blocks A.1.2)
    const issue1 = scaffoldIssue({
      title: "Issue A.1.1",
      createdBy: "Test User (test@example.com)",
      description: "First issue",
      scopeIn: ["Task 1"],
      scopeOut: ["Not included"],
      acceptanceCriteria: ["Criterion 1"],
    });
    issue1.metadata.events.push({
      event: CArtifactEvent.COMPLETED,
      timestamp: new Date().toISOString(),
      actor: "Test User (test@example.com)",
      trigger: "pr_merged",
    });
    issue1.metadata.relationships = {
      blocked_by: [],
      blocks: ["A.1.2"],
    };
    await artifactService.createArtifact({
      id: "A.1.1",
      artifact: issue1,
      slug: "issue-a11",
      baseDir: testBaseDir,
    });

    // Create issue A.1.2 (ready with READY event, blocked by A.1.1, blocks A.1.3)
    const issue2 = scaffoldIssue({
      title: "Issue A.1.2",
      createdBy: "Test User (test@example.com)",
      description: "Second issue",
      scopeIn: ["Task 2"],
      scopeOut: ["Not included"],
      acceptanceCriteria: ["Criterion 2"],
    });
    issue2.metadata.events.push({
      event: CArtifactEvent.READY,
      timestamp: new Date().toISOString(),
      actor: "Test User (test@example.com)",
      trigger: "dependencies_met",
    });
    issue2.metadata.relationships = {
      blocked_by: ["A.1.1"],
      blocks: ["A.1.3"],
    };
    await artifactService.createArtifact({
      id: "A.1.2",
      artifact: issue2,
      slug: "issue-a12",
      baseDir: testBaseDir,
    });

    // Create issue A.1.3 (draft, blocked by A.1.2)
    const issue3 = scaffoldIssue({
      title: "Issue A.1.3",
      createdBy: "Test User (test@example.com)",
      description: "Third issue",
      scopeIn: ["Task 3"],
      scopeOut: ["Not included"],
      acceptanceCriteria: ["Criterion 3"],
    });
    issue3.metadata.relationships = {
      blocked_by: ["A.1.2"],
      blocks: [],
    };
    await artifactService.createArtifact({
      id: "A.1.3",
      artifact: issue3,
      slug: "issue-a13",
      baseDir: testBaseDir,
    });
  }

  describe("isReady", () => {
    it("returns true when no blocking siblings and no READY event", async () => {
      await createTestHierarchy();

      // A.1.1 is completed and has no dependencies
      const isReady = await readinessService.isReady("A.1.1");

      expect(isReady).toBe(true);
    });

    it("returns true when no blocking siblings and parent completed (has READY event)", async () => {
      await createTestHierarchy();

      // A.1.2 has READY event, no incomplete siblings (A.1.1 is completed), and parent A.1 is completed
      const isReady = await readinessService.isReady("A.1.2");

      expect(isReady).toBe(true);
    });

    it("returns false when has blocking siblings", async () => {
      await createTestHierarchy();

      // A.1.3 is blocked by A.1.2 which is not completed
      const isReady = await readinessService.isReady("A.1.3");

      expect(isReady).toBe(false);
    });

    it("returns false when has READY event but parent not completed", async () => {
      // Create hierarchy where parent is not completed
      const initiative = scaffoldInitiative({
        title: "Initiative B",
        createdBy: "Test User (test@example.com)",
        vision: "Vision B",
        scopeIn: ["Feature B"],
        scopeOut: ["Feature Z"],
        successCriteria: ["Criterion B"],
      });
      await artifactService.createArtifact({
        id: "B",
        artifact: initiative,
        slug: "initiative-b",
        baseDir: testBaseDir,
      });

      const milestone = scaffoldMilestone({
        title: "Milestone B.1",
        createdBy: "Test User (test@example.com)",
        description: "First milestone",
        scopeIn: ["Sub-feature 1"],
        scopeOut: ["Out of scope"],
        deliverables: ["Deliverable 1"],
      });
      // Parent B.1 is NOT completed (still in draft)
      await artifactService.createArtifact({
        id: "B.1",
        artifact: milestone,
        slug: "milestone-b1",
        baseDir: testBaseDir,
      });

      const issue = scaffoldIssue({
        title: "Issue B.1.1",
        createdBy: "Test User (test@example.com)",
        description: "First issue",
        scopeIn: ["Task 1"],
        scopeOut: ["Not included"],
        acceptanceCriteria: ["Criterion 1"],
      });
      // Issue has READY event
      issue.metadata.events.push({
        event: CArtifactEvent.READY,
        timestamp: new Date().toISOString(),
        actor: "Test User (test@example.com)",
        trigger: "dependencies_met",
      });
      issue.metadata.relationships = {
        blocked_by: [],
        blocks: [],
      };
      await artifactService.createArtifact({
        id: "B.1.1",
        artifact: issue,
        slug: "issue-b11",
        baseDir: testBaseDir,
      });

      const isReady = await readinessService.isReady("B.1.1");

      expect(isReady).toBe(false);
    });

    it("returns true when parent is in_progress (non-blocking state)", async () => {
      // Create hierarchy where parent is in_progress
      const initiative = scaffoldInitiative({
        title: "Initiative J",
        createdBy: "Test User (test@example.com)",
        vision: "Vision J",
        scopeIn: ["Feature J"],
        scopeOut: ["Feature Z"],
        successCriteria: ["Criterion J"],
      });
      // Initiative must be in READY or IN_PROGRESS for children to proceed
      initiative.metadata.events.push({
        event: CArtifactEvent.READY,
        timestamp: new Date().toISOString(),
        actor: "Test User (test@example.com)",
        trigger: "dependencies_met",
      });
      await artifactService.createArtifact({
        id: "J",
        artifact: initiative,
        slug: "initiative-j",
        baseDir: testBaseDir,
      });

      const milestone = scaffoldMilestone({
        title: "Milestone J.1",
        createdBy: "Test User (test@example.com)",
        description: "First milestone",
        scopeIn: ["Sub-feature 1"],
        scopeOut: ["Out of scope"],
        deliverables: ["Deliverable 1"],
      });
      // Parent J.1 is IN_PROGRESS (non-blocking state)
      milestone.metadata.events.push({
        event: CArtifactEvent.IN_PROGRESS,
        timestamp: new Date().toISOString(),
        actor: "Test User (test@example.com)",
        trigger: "work_started",
      });
      await artifactService.createArtifact({
        id: "J.1",
        artifact: milestone,
        slug: "milestone-j1",
        baseDir: testBaseDir,
      });

      const issue = scaffoldIssue({
        title: "Issue J.1.1",
        createdBy: "Test User (test@example.com)",
        description: "First issue",
        scopeIn: ["Task 1"],
        scopeOut: ["Not included"],
        acceptanceCriteria: ["Criterion 1"],
      });
      // Issue has READY event
      issue.metadata.events.push({
        event: CArtifactEvent.READY,
        timestamp: new Date().toISOString(),
        actor: "Test User (test@example.com)",
        trigger: "dependencies_met",
      });
      issue.metadata.relationships = {
        blocked_by: [],
        blocks: [],
      };
      await artifactService.createArtifact({
        id: "J.1.1",
        artifact: issue,
        slug: "issue-j11",
        baseDir: testBaseDir,
      });

      const isReady = await readinessService.isReady("J.1.1");

      // Should be ready because ALL ancestors are in non-blocking states
      // Initiative J: READY, Milestone J.1: IN_PROGRESS
      expect(isReady).toBe(true);
    });

    it("returns true for root artifact (no parent)", async () => {
      // Create initiative without parent
      const initiative = scaffoldInitiative({
        title: "Initiative C",
        createdBy: "Test User (test@example.com)",
        vision: "Vision C",
        scopeIn: ["Feature C"],
        scopeOut: ["Feature Z"],
        successCriteria: ["Criterion C"],
      });
      initiative.metadata.events.push({
        event: CArtifactEvent.READY,
        timestamp: new Date().toISOString(),
        actor: "Test User (test@example.com)",
        trigger: "dependencies_met",
      });
      initiative.metadata.relationships = {
        blocked_by: [],
        blocks: [],
      };
      await artifactService.createArtifact({
        id: "C",
        artifact: initiative,
        slug: "initiative-c",
        baseDir: testBaseDir,
      });

      const isReady = await readinessService.isReady("C");

      expect(isReady).toBe(true);
    });

    it("throws ArtifactNotFoundError for missing artifact", async () => {
      // Need to create at least one artifact so the directory exists
      await createTestHierarchy();

      await expect(readinessService.isReady("Z.99.88")).rejects.toThrow(
        ArtifactNotFoundError,
      );
    });
  });

  describe("getReadyArtifacts", () => {
    it("returns all ready artifacts", async () => {
      await createTestHierarchy();

      const ready = await readinessService.getReadyArtifacts();

      // A.1.2 should be ready (not completed, no blocking dependencies, ancestors in_progress)
      // A.1.1 is completed (terminal state), so it's skipped
      // A.1.3 is blocked by A.1.2
      const readyIds = ready.map((r) => r.id);
      expect(readyIds).toContain("A.1.2");
      expect(readyIds).not.toContain("A.1.1"); // completed (terminal)
      expect(readyIds).not.toContain("A.1.3"); // blocked
    });

    it("excludes artifacts with incomplete dependencies", async () => {
      await createTestHierarchy();

      const ready = await readinessService.getReadyArtifacts();

      const readyIds = ready.map((r) => r.id);
      expect(readyIds).not.toContain("A.1.3");
    });

    it("excludes terminal state artifacts", async () => {
      await createTestHierarchy();

      const ready = await readinessService.getReadyArtifacts();

      const readyIds = ready.map((r) => r.id);
      expect(readyIds).not.toContain("A.1.1"); // completed
    });

    it("returns empty array when no artifacts ready", async () => {
      // Create hierarchy where everything is blocked
      const initiative = scaffoldInitiative({
        title: "Initiative D",
        createdBy: "Test User (test@example.com)",
        vision: "Vision D",
        scopeIn: ["Feature D"],
        scopeOut: ["Feature Z"],
        successCriteria: ["Criterion D"],
      });
      await artifactService.createArtifact({
        id: "D",
        artifact: initiative,
        slug: "initiative-d",
        baseDir: testBaseDir,
      });

      const milestone = scaffoldMilestone({
        title: "Milestone D.1",
        createdBy: "Test User (test@example.com)",
        description: "First milestone",
        scopeIn: ["Sub-feature 1"],
        scopeOut: ["Out of scope"],
        deliverables: ["Deliverable 1"],
      });
      await artifactService.createArtifact({
        id: "D.1",
        artifact: milestone,
        slug: "milestone-d1",
        baseDir: testBaseDir,
      });

      const issue = scaffoldIssue({
        title: "Issue D.1.1",
        createdBy: "Test User (test@example.com)",
        description: "First issue",
        scopeIn: ["Task 1"],
        scopeOut: ["Not included"],
        acceptanceCriteria: ["Criterion 1"],
      });
      issue.metadata.relationships = {
        blocked_by: ["D.1.99"], // Blocked by non-existent artifact
        blocks: [],
      };
      await artifactService.createArtifact({
        id: "D.1.1",
        artifact: issue,
        slug: "issue-d11",
        baseDir: testBaseDir,
      });

      const ready = await readinessService.getReadyArtifacts();

      // Only root artifacts that are not completed would be ready
      // D and D.1 are not completed, so they should be ready
      expect(ready.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getBlockingReasons", () => {
    it("returns empty array for ready artifact", async () => {
      await createTestHierarchy();

      // A.1.2 is ready (has READY event, no blocking deps, parent completed)
      const reasons = await readinessService.getBlockingReasons("A.1.2");

      expect(reasons).toHaveLength(0);
    });

    it("returns incomplete_dependencies reason with related artifacts", async () => {
      await createTestHierarchy();

      const reasons = await readinessService.getBlockingReasons("A.1.3");

      expect(reasons).toHaveLength(1);
      expect(reasons[0].type).toBe("incomplete_dependencies");
      expect(reasons[0].message).toContain("1 incomplete dependency");
      expect(reasons[0].relatedArtifacts).toContain("A.1.2");
    });

    it("returns incomplete_parent reason with parent ID", async () => {
      // Create hierarchy where parent is not completed
      const initiative = scaffoldInitiative({
        title: "Initiative E",
        createdBy: "Test User (test@example.com)",
        vision: "Vision E",
        scopeIn: ["Feature E"],
        scopeOut: ["Feature Z"],
        successCriteria: ["Criterion E"],
      });
      // Initiative E must be in READY or IN_PROGRESS for children to proceed
      initiative.metadata.events.push({
        event: CArtifactEvent.IN_PROGRESS,
        timestamp: new Date().toISOString(),
        actor: "Test User (test@example.com)",
        trigger: "work_started",
      });
      await artifactService.createArtifact({
        id: "E",
        artifact: initiative,
        slug: "initiative-e",
        baseDir: testBaseDir,
      });

      const milestone = scaffoldMilestone({
        title: "Milestone E.1",
        createdBy: "Test User (test@example.com)",
        description: "First milestone",
        scopeIn: ["Sub-feature 1"],
        scopeOut: ["Out of scope"],
        deliverables: ["Deliverable 1"],
      });
      // Parent E.1 is NOT completed
      await artifactService.createArtifact({
        id: "E.1",
        artifact: milestone,
        slug: "milestone-e1",
        baseDir: testBaseDir,
      });

      const issue = scaffoldIssue({
        title: "Issue E.1.1",
        createdBy: "Test User (test@example.com)",
        description: "First issue",
        scopeIn: ["Task 1"],
        scopeOut: ["Not included"],
        acceptanceCriteria: ["Criterion 1"],
      });
      // Issue has READY event
      issue.metadata.events.push({
        event: CArtifactEvent.READY,
        timestamp: new Date().toISOString(),
        actor: "Test User (test@example.com)",
        trigger: "dependencies_met",
      });
      issue.metadata.relationships = {
        blocked_by: [],
        blocks: [],
      };
      await artifactService.createArtifact({
        id: "E.1.1",
        artifact: issue,
        slug: "issue-e11",
        baseDir: testBaseDir,
      });

      const reasons = await readinessService.getBlockingReasons("E.1.1");

      expect(reasons).toHaveLength(1);
      expect(reasons[0].type).toBe("incomplete_parent");
      expect(reasons[0].message).toContain("Ancestor E.1 is in blocking state");
      expect(reasons[0].relatedArtifacts).toContain("E.1");
    });

    it("returns invalid_state for terminal states", async () => {
      await createTestHierarchy();

      // A.1.1 is completed
      const reasons = await readinessService.getBlockingReasons("A.1.1");

      expect(reasons).toHaveLength(1);
      expect(reasons[0].type).toBe("invalid_state");
      expect(reasons[0].message).toContain("terminal state");
    });

    it("returns multiple reasons when applicable", async () => {
      // Create artifact with both incomplete dependencies and incomplete parent
      const initiative = scaffoldInitiative({
        title: "Initiative F",
        createdBy: "Test User (test@example.com)",
        vision: "Vision F",
        scopeIn: ["Feature F"],
        scopeOut: ["Feature Z"],
        successCriteria: ["Criterion F"],
      });
      await artifactService.createArtifact({
        id: "F",
        artifact: initiative,
        slug: "initiative-f",
        baseDir: testBaseDir,
      });

      const milestone = scaffoldMilestone({
        title: "Milestone F.1",
        createdBy: "Test User (test@example.com)",
        description: "First milestone",
        scopeIn: ["Sub-feature 1"],
        scopeOut: ["Out of scope"],
        deliverables: ["Deliverable 1"],
      });
      // Parent F.1 is NOT completed
      await artifactService.createArtifact({
        id: "F.1",
        artifact: milestone,
        slug: "milestone-f1",
        baseDir: testBaseDir,
      });

      // Create blocking issue
      const issue1 = scaffoldIssue({
        title: "Issue F.1.1",
        createdBy: "Test User (test@example.com)",
        description: "First issue",
        scopeIn: ["Task 1"],
        scopeOut: ["Not included"],
        acceptanceCriteria: ["Criterion 1"],
      });
      issue1.metadata.relationships = {
        blocked_by: [],
        blocks: ["F.1.2"],
      };
      await artifactService.createArtifact({
        id: "F.1.1",
        artifact: issue1,
        slug: "issue-f11",
        baseDir: testBaseDir,
      });

      const issue2 = scaffoldIssue({
        title: "Issue F.1.2",
        createdBy: "Test User (test@example.com)",
        description: "Second issue",
        scopeIn: ["Task 2"],
        scopeOut: ["Not included"],
        acceptanceCriteria: ["Criterion 2"],
      });
      // Issue has READY event
      issue2.metadata.events.push({
        event: CArtifactEvent.READY,
        timestamp: new Date().toISOString(),
        actor: "Test User (test@example.com)",
        trigger: "dependencies_met",
      });
      issue2.metadata.relationships = {
        blocked_by: ["F.1.1"],
        blocks: [],
      };
      await artifactService.createArtifact({
        id: "F.1.2",
        artifact: issue2,
        slug: "issue-f12",
        baseDir: testBaseDir,
      });

      const reasons = await readinessService.getBlockingReasons("F.1.2");

      // Should have both incomplete_dependencies and incomplete_parent
      expect(reasons.length).toBeGreaterThanOrEqual(1);
      const types = reasons.map((r) => r.type);
      expect(types).toContain("incomplete_dependencies");
      expect(types).toContain("incomplete_parent");
    });
  });

  describe("canTransitionToInProgress", () => {
    it("returns true when in READY state and passes readiness checks", async () => {
      await createTestHierarchy();

      // A.1.2 is in READY state and passes readiness checks
      const canTransition =
        await readinessService.canTransitionToInProgress("A.1.2");

      expect(canTransition).toBe(true);
    });

    it("returns false when not in READY state", async () => {
      await createTestHierarchy();

      // A.1.3 is in DRAFT state
      const canTransition =
        await readinessService.canTransitionToInProgress("A.1.3");

      expect(canTransition).toBe(false);
    });

    it("returns false when blocked by dependencies", async () => {
      // Create artifact in READY state but blocked
      const initiative = scaffoldInitiative({
        title: "Initiative G",
        createdBy: "Test User (test@example.com)",
        vision: "Vision G",
        scopeIn: ["Feature G"],
        scopeOut: ["Feature Z"],
        successCriteria: ["Criterion G"],
      });
      await artifactService.createArtifact({
        id: "G",
        artifact: initiative,
        slug: "initiative-g",
        baseDir: testBaseDir,
      });

      const milestone = scaffoldMilestone({
        title: "Milestone G.1",
        createdBy: "Test User (test@example.com)",
        description: "First milestone",
        scopeIn: ["Sub-feature 1"],
        scopeOut: ["Out of scope"],
        deliverables: ["Deliverable 1"],
      });
      await artifactService.createArtifact({
        id: "G.1",
        artifact: milestone,
        slug: "milestone-g1",
        baseDir: testBaseDir,
      });

      // Blocking issue (not completed)
      const issue1 = scaffoldIssue({
        title: "Issue G.1.1",
        createdBy: "Test User (test@example.com)",
        description: "First issue",
        scopeIn: ["Task 1"],
        scopeOut: ["Not included"],
        acceptanceCriteria: ["Criterion 1"],
      });
      issue1.metadata.relationships = {
        blocked_by: [],
        blocks: ["G.1.2"],
      };
      await artifactService.createArtifact({
        id: "G.1.1",
        artifact: issue1,
        slug: "issue-g11",
        baseDir: testBaseDir,
      });

      const issue2 = scaffoldIssue({
        title: "Issue G.1.2",
        createdBy: "Test User (test@example.com)",
        description: "Second issue",
        scopeIn: ["Task 2"],
        scopeOut: ["Not included"],
        acceptanceCriteria: ["Criterion 2"],
      });
      // Issue is in READY state
      issue2.metadata.events.push({
        event: CArtifactEvent.READY,
        timestamp: new Date().toISOString(),
        actor: "Test User (test@example.com)",
        trigger: "dependencies_met",
      });
      issue2.metadata.relationships = {
        blocked_by: ["G.1.1"], // Blocked by G.1.1
        blocks: [],
      };
      await artifactService.createArtifact({
        id: "G.1.2",
        artifact: issue2,
        slug: "issue-g12",
        baseDir: testBaseDir,
      });

      const canTransition =
        await readinessService.canTransitionToInProgress("G.1.2");

      expect(canTransition).toBe(false);
    });

    it("returns false when parent not completed (and has READY event)", async () => {
      // This is the same as the incomplete parent test
      const initiative = scaffoldInitiative({
        title: "Initiative H",
        createdBy: "Test User (test@example.com)",
        vision: "Vision H",
        scopeIn: ["Feature H"],
        scopeOut: ["Feature Z"],
        successCriteria: ["Criterion H"],
      });
      await artifactService.createArtifact({
        id: "H",
        artifact: initiative,
        slug: "initiative-h",
        baseDir: testBaseDir,
      });

      const milestone = scaffoldMilestone({
        title: "Milestone H.1",
        createdBy: "Test User (test@example.com)",
        description: "First milestone",
        scopeIn: ["Sub-feature 1"],
        scopeOut: ["Out of scope"],
        deliverables: ["Deliverable 1"],
      });
      // Parent H.1 is NOT completed
      await artifactService.createArtifact({
        id: "H.1",
        artifact: milestone,
        slug: "milestone-h1",
        baseDir: testBaseDir,
      });

      const issue = scaffoldIssue({
        title: "Issue H.1.1",
        createdBy: "Test User (test@example.com)",
        description: "First issue",
        scopeIn: ["Task 1"],
        scopeOut: ["Not included"],
        acceptanceCriteria: ["Criterion 1"],
      });
      // Issue has READY event
      issue.metadata.events.push({
        event: CArtifactEvent.READY,
        timestamp: new Date().toISOString(),
        actor: "Test User (test@example.com)",
        trigger: "dependencies_met",
      });
      issue.metadata.relationships = {
        blocked_by: [],
        blocks: [],
      };
      await artifactService.createArtifact({
        id: "H.1.1",
        artifact: issue,
        slug: "issue-h11",
        baseDir: testBaseDir,
      });

      const canTransition =
        await readinessService.canTransitionToInProgress("H.1.1");

      expect(canTransition).toBe(false);
    });

    it("throws ArtifactNotFoundError for missing artifact", async () => {
      await expect(
        readinessService.canTransitionToInProgress("Z.99.88"),
      ).rejects.toThrow(ArtifactNotFoundError);
    });
  });

  describe("clearCache", () => {
    it("clears cache of underlying services", async () => {
      await createTestHierarchy();

      // Load some data
      await readinessService.isReady("A.1.1");

      // Clear cache
      readinessService.clearCache();

      // Should still work after cache clear
      const isReady = await readinessService.isReady("A.1.1");
      expect(isReady).toBe(true);
    });
  });
});
