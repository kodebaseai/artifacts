import { describe, expect, it } from "vitest";
import { CArtifact, CArtifactEvent, CEventTrigger } from "../constants.js";
import {
  validateInitiative,
  validateIssue,
  validateMilestone,
} from "../validator/artifact-validator.js";
import {
  scaffoldInitiative,
  scaffoldIssue,
  scaffoldMilestone,
} from "./artifact-scaffolder.js";

const VALID_ACTOR = "Ada Lovelace (ada@example.com)";
const VALID_AGENT = "agent.system";
const INVALID_ACTOR = "not-an-actor";

describe("scaffoldInitiative", () => {
  describe("minimal valid artifact", () => {
    it("creates initiative with required fields only", () => {
      const initiative = scaffoldInitiative({
        title: "Test Initiative",
        createdBy: VALID_ACTOR,
        vision: "Build something amazing",
        scopeIn: ["Feature A"],
        scopeOut: ["Legacy B"],
        successCriteria: ["Users love it"],
      });

      expect(initiative.metadata.title).toBe("Test Initiative");
      expect(initiative.metadata.created_by).toBe(VALID_ACTOR);
      expect(initiative.metadata.assignee).toBe(VALID_ACTOR); // Defaults to createdBy
      expect(initiative.metadata.priority).toBe("medium"); // Default
      expect(initiative.metadata.estimation).toBe("S"); // Default
      expect(initiative.content.vision).toBe("Build something amazing");
      expect(initiative.content.scope.in).toEqual(["Feature A"]);
      expect(initiative.content.scope.out).toEqual(["Legacy B"]);
      expect(initiative.content.success_criteria).toEqual(["Users love it"]);
    });

    it("includes draft event with correct structure", () => {
      const initiative = scaffoldInitiative({
        title: "Test",
        createdBy: VALID_ACTOR,
        vision: "Vision",
        scopeIn: ["A"],
        scopeOut: ["B"],
        successCriteria: ["C"],
      });

      expect(initiative.metadata.events).toHaveLength(1);
      const draftEvent = initiative.metadata.events[0];
      expect(draftEvent).toBeDefined();
      expect(draftEvent?.event).toBe(CArtifactEvent.DRAFT);
      expect(draftEvent?.actor).toBe(VALID_ACTOR);
      expect(draftEvent?.trigger).toBe(CEventTrigger.ARTIFACT_CREATED);
      expect(draftEvent?.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
      );
    });

    it("includes empty relationships arrays", () => {
      const initiative = scaffoldInitiative({
        title: "Test",
        createdBy: VALID_ACTOR,
        vision: "Vision",
        scopeIn: ["A"],
        scopeOut: ["B"],
        successCriteria: ["C"],
      });

      expect(initiative.metadata.relationships.blocks).toEqual([]);
      expect(initiative.metadata.relationships.blocked_by).toEqual([]);
    });

    it("passes schema validation", () => {
      const initiative = scaffoldInitiative({
        title: "Test Initiative",
        createdBy: VALID_ACTOR,
        vision: "Build platform",
        scopeIn: ["Core services"],
        scopeOut: ["Legacy"],
        successCriteria: ["Platform live"],
      });

      expect(() => validateInitiative(initiative)).not.toThrow();
    });
  });

  describe("optional fields", () => {
    it("accepts custom assignee", () => {
      const initiative = scaffoldInitiative({
        title: "Test",
        createdBy: VALID_ACTOR,
        assignee: "Grace Hopper (grace@example.com)",
        vision: "Vision",
        scopeIn: ["A"],
        scopeOut: ["B"],
        successCriteria: ["C"],
      });

      expect(initiative.metadata.assignee).toBe(
        "Grace Hopper (grace@example.com)",
      );
    });

    it("accepts custom priority", () => {
      const initiative = scaffoldInitiative({
        title: "Test",
        createdBy: VALID_ACTOR,
        priority: "high",
        vision: "Vision",
        scopeIn: ["A"],
        scopeOut: ["B"],
        successCriteria: ["C"],
      });

      expect(initiative.metadata.priority).toBe("high");
    });

    it("accepts custom estimation", () => {
      const initiative = scaffoldInitiative({
        title: "Test",
        createdBy: VALID_ACTOR,
        estimation: "L",
        vision: "Vision",
        scopeIn: ["A"],
        scopeOut: ["B"],
        successCriteria: ["C"],
      });

      expect(initiative.metadata.estimation).toBe("L");
    });

    it("accepts notes as string", () => {
      const initiative = scaffoldInitiative({
        title: "Test",
        createdBy: VALID_ACTOR,
        notes: "This is a note",
        vision: "Vision",
        scopeIn: ["A"],
        scopeOut: ["B"],
        successCriteria: ["C"],
      });

      expect(initiative.notes).toBe("This is a note");
    });

    it("accepts notes as array", () => {
      const initiative = scaffoldInitiative({
        title: "Test",
        createdBy: VALID_ACTOR,
        notes: ["Note 1", "Note 2"],
        vision: "Vision",
        scopeIn: ["A"],
        scopeOut: ["B"],
        successCriteria: ["C"],
      });

      expect(initiative.notes).toEqual(["Note 1", "Note 2"]);
    });

    it("accepts custom timestamp", () => {
      const initiative = scaffoldInitiative({
        title: "Test",
        createdBy: VALID_ACTOR,
        timestamp: "2025-10-28T10:27:00Z",
        vision: "Vision",
        scopeIn: ["A"],
        scopeOut: ["B"],
        successCriteria: ["C"],
      });

      expect(initiative.metadata.events[0]?.timestamp).toBe(
        "2025-10-28T10:27:00Z",
      );
    });
  });

  describe("validation", () => {
    it("validates human actor format", () => {
      expect(() =>
        scaffoldInitiative({
          title: "Test",
          createdBy: INVALID_ACTOR,
          vision: "Vision",
          scopeIn: ["A"],
          scopeOut: ["B"],
          successCriteria: ["C"],
        }),
      ).toThrow(/Invalid actor format/);
    });

    it("accepts agent actor format", () => {
      const initiative = scaffoldInitiative({
        title: "Test",
        createdBy: VALID_AGENT,
        vision: "Vision",
        scopeIn: ["A"],
        scopeOut: ["B"],
        successCriteria: ["C"],
      });

      expect(initiative.metadata.created_by).toBe(VALID_AGENT);
    });

    it("validates assignee format when provided", () => {
      expect(() =>
        scaffoldInitiative({
          title: "Test",
          createdBy: VALID_ACTOR,
          assignee: INVALID_ACTOR,
          vision: "Vision",
          scopeIn: ["A"],
          scopeOut: ["B"],
          successCriteria: ["C"],
        }),
      ).toThrow(/Invalid actor format/);
    });

    it("throws when scopeIn is empty", () => {
      expect(() =>
        scaffoldInitiative({
          title: "Test",
          createdBy: VALID_ACTOR,
          vision: "Vision",
          scopeIn: [],
          scopeOut: ["B"],
          successCriteria: ["C"],
        }),
      ).toThrow(/scopeIn must contain at least one item/);
    });

    it("throws when scopeOut is empty", () => {
      expect(() =>
        scaffoldInitiative({
          title: "Test",
          createdBy: VALID_ACTOR,
          vision: "Vision",
          scopeIn: ["A"],
          scopeOut: [],
          successCriteria: ["C"],
        }),
      ).toThrow(/scopeOut must contain at least one item/);
    });

    it("throws when successCriteria is empty", () => {
      expect(() =>
        scaffoldInitiative({
          title: "Test",
          createdBy: VALID_ACTOR,
          vision: "Vision",
          scopeIn: ["A"],
          scopeOut: ["B"],
          successCriteria: [],
        }),
      ).toThrow(/successCriteria must contain at least one item/);
    });
  });
});

describe("scaffoldMilestone", () => {
  describe("minimal valid artifact", () => {
    it("creates milestone with required fields only", () => {
      const milestone = scaffoldMilestone({
        title: "Test Milestone",
        createdBy: VALID_ACTOR,
        summary: "Deliver features",
        deliverables: ["Feature X", "Feature Y"],
      });

      expect(milestone.metadata.title).toBe("Test Milestone");
      expect(milestone.metadata.created_by).toBe(VALID_ACTOR);
      expect(milestone.metadata.assignee).toBe(VALID_ACTOR);
      expect(milestone.metadata.priority).toBe("medium");
      expect(milestone.metadata.estimation).toBe("S");
      expect(milestone.content.summary).toBe("Deliver features");
      expect(milestone.content.deliverables).toEqual([
        "Feature X",
        "Feature Y",
      ]);
    });

    it("includes draft event with correct structure", () => {
      const milestone = scaffoldMilestone({
        title: "Test",
        createdBy: VALID_ACTOR,
        summary: "Summary",
        deliverables: ["A"],
      });

      expect(milestone.metadata.events).toHaveLength(1);
      const draftEvent = milestone.metadata.events[0];
      expect(draftEvent).toBeDefined();
      expect(draftEvent?.event).toBe(CArtifactEvent.DRAFT);
      expect(draftEvent?.actor).toBe(VALID_ACTOR);
      expect(draftEvent?.trigger).toBe(CEventTrigger.ARTIFACT_CREATED);
    });

    it("passes schema validation", () => {
      const milestone = scaffoldMilestone({
        title: "Parser Rollout",
        createdBy: VALID_ACTOR,
        summary: "Deliver parser fixtures",
        deliverables: ["Parser", "Validator"],
      });

      expect(() => validateMilestone(milestone)).not.toThrow();
    });
  });

  describe("optional fields", () => {
    it("accepts validation criteria", () => {
      const milestone = scaffoldMilestone({
        title: "Test",
        createdBy: VALID_ACTOR,
        summary: "Summary",
        deliverables: ["A"],
        validation: ["CI passes", "Fixtures stable"],
      });

      expect(milestone.content.validation).toEqual([
        "CI passes",
        "Fixtures stable",
      ]);
    });

    it("accepts empty validation array", () => {
      const milestone = scaffoldMilestone({
        title: "Test",
        createdBy: VALID_ACTOR,
        summary: "Summary",
        deliverables: ["A"],
        validation: [],
      });

      expect(milestone.content.validation).toEqual([]);
    });

    it("accepts notes", () => {
      const milestone = scaffoldMilestone({
        title: "Test",
        createdBy: VALID_ACTOR,
        summary: "Summary",
        deliverables: ["A"],
        notes: "Important note",
      });

      expect(milestone.notes).toBe("Important note");
    });
  });

  describe("validation", () => {
    it("throws when deliverables is empty", () => {
      expect(() =>
        scaffoldMilestone({
          title: "Test",
          createdBy: VALID_ACTOR,
          summary: "Summary",
          deliverables: [],
        }),
      ).toThrow(/deliverables must contain at least one item/);
    });

    it("validates actor format", () => {
      expect(() =>
        scaffoldMilestone({
          title: "Test",
          createdBy: INVALID_ACTOR,
          summary: "Summary",
          deliverables: ["A"],
        }),
      ).toThrow(/Invalid actor format/);
    });
  });
});

describe("scaffoldIssue", () => {
  describe("minimal valid artifact", () => {
    it("creates issue with required fields only", () => {
      const issue = scaffoldIssue({
        title: "Test Issue",
        createdBy: VALID_ACTOR,
        summary: "Add parser fixtures",
        acceptanceCriteria: ["Fixtures load cleanly", "Errors expected"],
      });

      expect(issue.metadata.title).toBe("Test Issue");
      expect(issue.metadata.created_by).toBe(VALID_ACTOR);
      expect(issue.metadata.assignee).toBe(VALID_ACTOR);
      expect(issue.metadata.priority).toBe("medium");
      expect(issue.metadata.estimation).toBe("S");
      expect(issue.content.summary).toBe("Add parser fixtures");
      expect(issue.content.acceptance_criteria).toEqual([
        "Fixtures load cleanly",
        "Errors expected",
      ]);
    });

    it("includes draft event with correct structure", () => {
      const issue = scaffoldIssue({
        title: "Test",
        createdBy: VALID_ACTOR,
        summary: "Summary",
        acceptanceCriteria: ["A"],
      });

      expect(issue.metadata.events).toHaveLength(1);
      const draftEvent = issue.metadata.events[0];
      expect(draftEvent).toBeDefined();
      expect(draftEvent?.event).toBe(CArtifactEvent.DRAFT);
      expect(draftEvent?.actor).toBe(VALID_ACTOR);
      expect(draftEvent?.trigger).toBe(CEventTrigger.ARTIFACT_CREATED);
    });

    it("passes schema validation", () => {
      const issue = scaffoldIssue({
        title: "Add parser fixtures",
        createdBy: VALID_ACTOR,
        summary: "Add golden fixtures",
        acceptanceCriteria: ["Fixtures work"],
      });

      expect(() => validateIssue(issue)).not.toThrow();
    });
  });

  describe("optional fields", () => {
    it("accepts notes", () => {
      const issue = scaffoldIssue({
        title: "Test",
        createdBy: VALID_ACTOR,
        summary: "Summary",
        acceptanceCriteria: ["A"],
        notes: ["Note 1", "Note 2"],
      });

      expect(issue.notes).toEqual(["Note 1", "Note 2"]);
    });

    it("accepts custom priority and estimation", () => {
      const issue = scaffoldIssue({
        title: "Test",
        createdBy: VALID_ACTOR,
        summary: "Summary",
        acceptanceCriteria: ["A"],
        priority: "critical",
        estimation: "XL",
      });

      expect(issue.metadata.priority).toBe("critical");
      expect(issue.metadata.estimation).toBe("XL");
    });
  });

  describe("validation", () => {
    it("throws when acceptanceCriteria is empty", () => {
      expect(() =>
        scaffoldIssue({
          title: "Test",
          createdBy: VALID_ACTOR,
          summary: "Summary",
          acceptanceCriteria: [],
        }),
      ).toThrow(/acceptanceCriteria must contain at least one item/);
    });

    it("validates actor format", () => {
      expect(() =>
        scaffoldIssue({
          title: "Test",
          createdBy: INVALID_ACTOR,
          summary: "Summary",
          acceptanceCriteria: ["A"],
        }),
      ).toThrow(/Invalid actor format/);
    });
  });
});

describe("integration scenarios", () => {
  it("can scaffold all three artifact types successfully", () => {
    const initiative = scaffoldInitiative({
      title: "Platform Revamp",
      createdBy: VALID_ACTOR,
      vision: "Modern platform",
      scopeIn: ["Core"],
      scopeOut: ["Legacy"],
      successCriteria: ["Platform live"],
    });

    const milestone = scaffoldMilestone({
      title: "Core Services",
      createdBy: VALID_ACTOR,
      summary: "Build core services",
      deliverables: ["Service A", "Service B"],
    });

    const issue = scaffoldIssue({
      title: "Implement Service A",
      createdBy: VALID_ACTOR,
      summary: "Create service A",
      acceptanceCriteria: ["Service deployed"],
    });

    // All should pass their respective validations
    expect(() => validateInitiative(initiative)).not.toThrow();
    expect(() => validateMilestone(milestone)).not.toThrow();
    expect(() => validateIssue(issue)).not.toThrow();
  });

  it("scaffolds work with detectContextLevel pattern", () => {
    // Simulate wizard workflow
    const parentId = null; // No parent
    const artifactType = parentId ? "milestone" : CArtifact.INITIATIVE;

    expect(artifactType).toBe(CArtifact.INITIATIVE);

    const initiative = scaffoldInitiative({
      title: "New Initiative",
      createdBy: VALID_ACTOR,
      vision: "Vision",
      scopeIn: ["A"],
      scopeOut: ["B"],
      successCriteria: ["C"],
    });

    expect(initiative.metadata.title).toBe("New Initiative");
  });
});
