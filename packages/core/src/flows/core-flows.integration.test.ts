import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type CascadeChild,
  CascadeEngine,
} from "../automation/cascade/engine.js";
import {
  CArtifactEvent,
  CEstimationSize,
  CEventTrigger,
  CPriority,
  type TArtifactEvent,
  type TEventTrigger,
} from "../constants.js";
import { readArtifact } from "../loading/artifact-file-service.js";
import {
  type BlockingDependency,
  createBlockedEvent,
  createEvent,
  createReadyEvent,
} from "../state/event-builder.js";
import type { TEventRecord } from "../state/event-order.js";

const FIXTURE_ROOT = path.join(
  process.cwd(),
  "test",
  "fixtures",
  "loader-tree",
);
const BASE_ACTOR = "Test Actor (test@example.com)";
const engine = new CascadeEngine();

// Helper types for building test data
type EventSequence = {
  state: TArtifactEvent;
  trigger: TEventTrigger;
  metadata?: Record<string, unknown>;
};

// Helper to build child artifacts with full metadata
function buildChild(
  events: readonly EventSequence[],
  id?: string,
): CascadeChild {
  return {
    id,
    metadata: {
      title: "Test Child",
      priority: CPriority.HIGH,
      estimation: CEstimationSize.S,
      created_by: BASE_ACTOR,
      assignee: BASE_ACTOR,
      schema_version: "0.0.1",
      relationships: {
        blocks: [],
        blocked_by: [],
      },
      events: events.map((entry, index) => ({
        event: entry.state,
        timestamp: `2025-11-02T12:${String(index).padStart(2, "0")}:00Z`,
        actor: BASE_ACTOR,
        trigger: entry.trigger,
        ...(entry.metadata && { metadata: entry.metadata }),
      })),
    },
  };
}

// Helper to create event sequences
function sequence(
  state: TArtifactEvent,
  trigger: TEventTrigger,
  metadata?: Record<string, unknown>,
): EventSequence {
  return { state, trigger, metadata };
}

// Helper to build blocked dependent artifacts
function buildBlockedDependent(
  dependencyIds: readonly string[],
  id?: string,
): CascadeChild {
  return {
    id,
    metadata: {
      title: "Blocked Dependent",
      priority: CPriority.MEDIUM,
      estimation: CEstimationSize.S,
      created_by: BASE_ACTOR,
      assignee: BASE_ACTOR,
      schema_version: "0.0.1",
      relationships: {
        blocks: [],
        blocked_by: dependencyIds.slice(),
      },
      events: [
        {
          event: CArtifactEvent.DRAFT,
          timestamp: "2025-10-28T10:00:00Z",
          actor: BASE_ACTOR,
          trigger: CEventTrigger.ARTIFACT_CREATED,
        },
        {
          event: CArtifactEvent.BLOCKED,
          timestamp: "2025-10-28T11:00:00Z",
          actor: BASE_ACTOR,
          trigger: CEventTrigger.HAS_DEPENDENCIES,
          metadata: {
            blocking_dependencies: dependencyIds.map((id) => ({
              artifact_id: id,
              resolved: false,
            })),
          },
        },
      ],
    },
  };
}

/**
 * Integration tests for core flows:
 * 1. Validation: draft artifacts → ready/blocked computation
 * 2. Cascade: issue completion → parent state recommendations
 * 3. Completion: completion info presence → completed event generation
 */
describe("core flows integration", () => {
  describe("validation flow: draft → ready/blocked", () => {
    it("computes READY for issue with no dependencies", async () => {
      // Load an issue fixture that has no dependencies
      const fixturePath = path.join(
        FIXTURE_ROOT,
        "A.cascade-initiative",
        "A.2.operations-phase",
        "A.2.2.deployment.yml",
      );
      const artifact = await readArtifact<Record<string, unknown>>(fixturePath);

      // Skip validation - we're testing structure, not schema compliance

      // Check that it has no blocked_by dependencies
      const metadata = artifact.metadata as {
        relationships?: { blocked_by?: string[] };
      };
      const blockedBy = metadata.relationships?.blocked_by ?? [];
      expect(blockedBy).toEqual([]);

      // Verify it has a ready event
      const events = (metadata as { events: TEventRecord[] }).events;
      const hasReady = events.some((e: TEventRecord) => e.event === "ready");
      expect(hasReady).toBe(true);

      // Verify the ready event has correct trigger
      const readyEvent = events.find((e: TEventRecord) => e.event === "ready");
      expect(readyEvent?.trigger).toBe("dependencies_met");
    });

    it("computes BLOCKED for issue with unmet dependencies", async () => {
      // Load A.1.1 which is blocked by A.1.2
      const fixturePath = path.join(
        FIXTURE_ROOT,
        "A.cascade-initiative",
        "A.1.development-phase",
        "A.1.1.backend-api.yml",
      );
      const artifact = await readArtifact<Record<string, unknown>>(fixturePath);

      // Skip validation - we're testing structure, not schema compliance

      // Check that it has blocked_by dependencies
      const metadata = artifact.metadata as {
        relationships?: { blocked_by?: string[] };
      };
      const blockedBy = metadata.relationships?.blocked_by ?? [];
      expect(blockedBy).toContain("A.1.2");

      // Verify it has a blocked event
      const events = (metadata as { events: TEventRecord[] }).events;
      const blockedEvent = events.find(
        (e: TEventRecord) => e.event === "blocked",
      );
      expect(blockedEvent).toBeDefined();
      expect(blockedEvent?.trigger).toBe("has_dependencies");
    });

    it("includes blocking_dependencies metadata on BLOCKED event", async () => {
      // Load A.1.1 which has blocking_dependencies metadata
      const fixturePath = path.join(
        FIXTURE_ROOT,
        "A.cascade-initiative",
        "A.1.development-phase",
        "A.1.1.backend-api.yml",
      );
      const artifact = await readArtifact<Record<string, unknown>>(fixturePath);
      const metadata = artifact.metadata as { events: TEventRecord[] };
      const events = metadata.events;
      const blockedEvent = events.find(
        (e: TEventRecord) => e.event === "blocked",
      );

      expect(blockedEvent).toBeDefined();
      expect(blockedEvent?.metadata).toBeDefined();
      expect(blockedEvent?.metadata?.blocking_dependencies).toBeDefined();
      expect(Array.isArray(blockedEvent?.metadata?.blocking_dependencies)).toBe(
        true,
      );

      const deps = blockedEvent?.metadata?.blocking_dependencies as Array<{
        artifact_id: string;
        resolved: boolean;
        resolved_at?: string;
      }>;

      expect(deps.length).toBeGreaterThan(0);
      expect(deps[0]).toHaveProperty("artifact_id");
      expect(deps[0]).toHaveProperty("resolved");
    });

    it("can generate BLOCKED event with metadata for new artifact", () => {
      const actor = "Kodebase CLI (cli@v1.0.0)";
      const blockingDeps: BlockingDependency[] = [
        { artifact_id: "A.1.2", resolved: false },
        { artifact_id: "A.1.3", resolved: false },
      ];

      const blockedEvent = createBlockedEvent(actor, blockingDeps);

      expect(blockedEvent.event).toBe("blocked");
      expect(blockedEvent.trigger).toBe("has_dependencies");
      expect(blockedEvent.actor).toBe(actor);
      expect(blockedEvent.metadata?.blocking_dependencies).toEqual([
        { artifact_id: "A.1.2", resolved: false },
        { artifact_id: "A.1.3", resolved: false },
      ]);
    });

    it("can generate READY event for new artifact", () => {
      const actor = "Kodebase CLI (cli@v1.0.0)";

      const readyEvent = createReadyEvent(actor);

      expect(readyEvent.event).toBe("ready");
      expect(readyEvent.trigger).toBe("dependencies_met");
      expect(readyEvent.actor).toBe(actor);
      expect(readyEvent.timestamp).toBeDefined();
    });
  });

  describe("cascade flow: completion → parent state changes", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-11-02T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("recommends IN_REVIEW for milestone when last issue completes", () => {
      const children: CascadeChild[] = [
        buildChild(
          [
            sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
            sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
            sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.BRANCH_CREATED),
            sequence(CArtifactEvent.IN_REVIEW, CEventTrigger.PR_READY),
            sequence(CArtifactEvent.COMPLETED, CEventTrigger.PR_MERGED),
          ],
          "A.1.1",
        ),
        buildChild(
          [
            sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
            sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
            sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.BRANCH_CREATED),
            sequence(CArtifactEvent.IN_REVIEW, CEventTrigger.PR_READY),
            sequence(CArtifactEvent.COMPLETED, CEventTrigger.PR_MERGED),
          ],
          "A.1.2",
        ),
      ];

      const parent: CascadeChild = buildChild(
        [
          sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
          sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
          sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.CHILDREN_STARTED),
        ],
        "A.1",
      );

      const parentState = parent.metadata.events[
        parent.metadata.events.length - 1
      ].event as TArtifactEvent;
      const decision = engine.shouldCascadeToParent(children, parentState);

      expect(decision.shouldCascade).toBe(true);
      if (decision.shouldCascade) {
        expect(decision.newState).toBe(CArtifactEvent.IN_REVIEW);
      }
    });

    it("recommends IN_REVIEW for initiative when last milestone completes", () => {
      const children: CascadeChild[] = [
        buildChild(
          [
            sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
            sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
            sequence(
              CArtifactEvent.IN_PROGRESS,
              CEventTrigger.CHILDREN_STARTED,
            ),
            sequence(
              CArtifactEvent.IN_REVIEW,
              CEventTrigger.CHILDREN_COMPLETED,
            ),
            sequence(CArtifactEvent.COMPLETED, CEventTrigger.PR_MERGED),
          ],
          "A.1",
        ),
        buildChild(
          [
            sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
            sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
            sequence(
              CArtifactEvent.IN_PROGRESS,
              CEventTrigger.CHILDREN_STARTED,
            ),
            sequence(
              CArtifactEvent.IN_REVIEW,
              CEventTrigger.CHILDREN_COMPLETED,
            ),
            sequence(CArtifactEvent.COMPLETED, CEventTrigger.PR_MERGED),
          ],
          "A.2",
        ),
      ];

      const parent: CascadeChild = buildChild(
        [
          sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
          sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
          sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.CHILDREN_STARTED),
        ],
        "A",
      );

      const parentState = parent.metadata.events[
        parent.metadata.events.length - 1
      ].event as TArtifactEvent;
      const decision = engine.shouldCascadeToParent(children, parentState);

      expect(decision.shouldCascade).toBe(true);
      if (decision.shouldCascade) {
        expect(decision.newState).toBe(CArtifactEvent.IN_REVIEW);
      }
    });

    it("does not cascade when partial completion", () => {
      const children: CascadeChild[] = [
        buildChild(
          [
            sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
            sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
            sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.BRANCH_CREATED),
            sequence(CArtifactEvent.IN_REVIEW, CEventTrigger.PR_READY),
            sequence(CArtifactEvent.COMPLETED, CEventTrigger.PR_MERGED),
          ],
          "A.1.1",
        ),
        buildChild(
          [
            sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
            sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
            sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.BRANCH_CREATED),
          ],
          "A.1.2",
        ),
      ];

      const parent: CascadeChild = buildChild(
        [
          sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
          sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
          sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.CHILDREN_STARTED),
        ],
        "A.1",
      );

      const parentState = parent.metadata.events[
        parent.metadata.events.length - 1
      ].event as TArtifactEvent;
      const decision = engine.shouldCascadeToParent(children, parentState);

      // No cascade should occur - not all children completed
      expect(decision.shouldCascade).toBe(false);
    });

    it("generates cascade event with correct metadata", () => {
      const triggerEvent = createEvent({
        event: CArtifactEvent.COMPLETED,
        actor: "GitHub Action (action@pr-merge)",
        trigger: CEventTrigger.PR_MERGED,
        timestamp: "2025-11-02T11:55:00Z",
      });

      const cascade = engine.generateCascadeEvent(
        CArtifactEvent.IN_REVIEW,
        triggerEvent,
        "all_children_complete",
      );

      expect(cascade.event).toBe(CArtifactEvent.IN_REVIEW);
      expect(cascade.trigger).toBe(CEventTrigger.CHILDREN_COMPLETED);
      expect(cascade.actor).toBe("System Cascade (cascade@completion)");
      expect(cascade.timestamp).toBe("2025-11-02T12:00:00Z");
      expect(cascade.metadata).toEqual({
        cascade_type: "all_children_complete",
        trigger_event: CArtifactEvent.COMPLETED,
        trigger_actor: "GitHub Action (action@pr-merge)",
        trigger_timestamp: "2025-11-02T11:55:00Z",
      });
    });

    it("starts parent when first child starts", () => {
      const children: CascadeChild[] = [
        buildChild(
          [
            sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
            sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
            sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.BRANCH_CREATED),
          ],
          "A.1.1",
        ),
        buildChild(
          [
            sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
            sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
          ],
          "A.1.2",
        ),
      ];

      const parent: CascadeChild = buildChild(
        [
          sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
          sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
        ],
        "A.1",
      );

      const parentState = parent.metadata.events[
        parent.metadata.events.length - 1
      ].event as TArtifactEvent;
      const decision = engine.shouldCascadeToParent(children, parentState);

      expect(decision.shouldCascade).toBe(true);
      if (decision.shouldCascade) {
        expect(decision.newState).toBe(CArtifactEvent.IN_PROGRESS);
      }
    });
  });

  describe("completion flow: completion info → completed event", () => {
    it("validates issue with implementation_notes has completion info", async () => {
      // Load A.1.2 which has implementation_notes (completed issue)
      const fixturePath = path.join(
        FIXTURE_ROOT,
        "A.cascade-initiative",
        "A.1.development-phase",
        "A.1.2.database-schema.yml",
      );
      const artifact = await readArtifact<Record<string, unknown>>(fixturePath);

      // Verify completion info is present
      expect(artifact).toHaveProperty("implementation_notes");
      const notes = artifact.implementation_notes as { result: string };
      expect(notes).toBeDefined();
      expect(notes.result).toBeDefined();
      expect(typeof notes.result).toBe("string");
      expect(notes.result.length).toBeGreaterThan(0);
    });

    it("validates completion info structure for issue", async () => {
      const fixturePath = path.join(
        FIXTURE_ROOT,
        "A.cascade-initiative",
        "A.1.development-phase",
        "A.1.2.database-schema.yml",
      );
      const artifact = await readArtifact<Record<string, unknown>>(fixturePath);
      const notes = artifact.implementation_notes as {
        result: string;
        challenges?: Array<{ challenge: string; solution: string }>;
        insights?: string[];
        tags?: string[];
      };

      // Required field
      expect(notes.result).toBeDefined();

      // Optional fields (if present, should be correct type)
      if (notes.challenges) {
        expect(Array.isArray(notes.challenges)).toBe(true);
        notes.challenges.forEach((c) => {
          expect(c).toHaveProperty("challenge");
          expect(c).toHaveProperty("solution");
        });
      }

      if (notes.insights) {
        expect(Array.isArray(notes.insights)).toBe(true);
      }

      if (notes.tags) {
        expect(Array.isArray(notes.tags)).toBe(true);
      }
    });

    it("completed issue has completed event with correct trigger", async () => {
      const fixturePath = path.join(
        FIXTURE_ROOT,
        "A.cascade-initiative",
        "A.1.development-phase",
        "A.1.2.database-schema.yml",
      );
      const artifact = await readArtifact<Record<string, unknown>>(fixturePath);
      const metadata = artifact.metadata as { events: TEventRecord[] };
      const events = metadata.events;
      const completedEvent = events.find(
        (e: TEventRecord) => e.event === "completed",
      );

      expect(completedEvent).toBeDefined();
      expect(completedEvent?.trigger).toBe("pr_merged");
      expect(completedEvent?.actor).toContain("GitHub Action");
    });
  });

  describe("dependency resolution flow", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-11-02T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("resolves single dependency and generates READY event", () => {
      const dependent = buildBlockedDependent(["A.1.2"], "A.1.1");
      const completedDependencyId = "A.1.2";

      const result = engine.resolveDependencyCompletion(dependent, {
        dependencyId: completedDependencyId,
        resolutionTimestamp: "2025-11-02T12:00:00Z",
      });

      expect(result.updated).toBe(true);
      if (!result.updated) return;
      expect(result.readyEventAdded).toBe(true);
      expect(result.artifact).toBeDefined();

      // Check metadata was updated
      const blockedEvent = result.artifact.metadata.events.find(
        (e) => e.event === CArtifactEvent.BLOCKED,
      );
      const deps = blockedEvent?.metadata?.blocking_dependencies as Array<{
        artifact_id: string;
        resolved: boolean;
        resolved_at?: string;
      }>;

      expect(deps[0].resolved).toBe(true);
      expect(deps[0].resolved_at).toBeDefined();

      // Check READY event was added
      const readyEvent = result.artifact.metadata.events.find(
        (e) => e.event === CArtifactEvent.READY,
      );
      expect(readyEvent).toBeDefined();
      expect(readyEvent?.trigger).toBe(CEventTrigger.DEPENDENCY_COMPLETED);
    });

    it("resolves partial dependencies without generating READY event", () => {
      const dependent = buildBlockedDependent(["A.1.2", "A.1.3"], "A.1.1");
      const completedDependencyId = "A.1.2";

      const result = engine.resolveDependencyCompletion(dependent, {
        dependencyId: completedDependencyId,
        resolutionTimestamp: "2025-11-02T12:00:00Z",
      });

      expect(result.updated).toBe(true);
      if (!result.updated) return;
      expect(result.readyEventAdded).toBe(false); // Not all deps resolved yet

      // Check only one dependency was resolved
      const blockedEvent = result.artifact.metadata.events.find(
        (e) => e.event === CArtifactEvent.BLOCKED,
      );
      const deps = blockedEvent?.metadata?.blocking_dependencies as Array<{
        artifact_id: string;
        resolved: boolean;
      }>;

      const resolvedCount = deps.filter((d) => d.resolved).length;
      expect(resolvedCount).toBe(1);
    });

    it("does not mutate original dependent", () => {
      const dependent = buildBlockedDependent(["A.1.2"], "A.1.1");
      const original = structuredClone(dependent);

      engine.resolveDependencyCompletion(dependent, {
        dependencyId: "A.1.2",
        resolutionTimestamp: "2025-11-02T12:00:00Z",
      });

      // Original should be unchanged
      expect(dependent).toEqual(original);
    });
  });
});
