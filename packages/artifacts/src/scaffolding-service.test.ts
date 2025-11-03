import { vol } from "memfs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", async () => {
  const { fs } = await import("memfs");
  return { default: fs.promises };
});

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { execSync } from "node:child_process";
import { IdAllocationService } from "./id-allocation-service.js";
import { ScaffoldingService } from "./scaffolding-service.js";

describe("ScaffoldingService", () => {
  const testBaseDir = "/test-artifacts";
  let idAllocationService: IdAllocationService;
  let service: ScaffoldingService;
  const mockedExecSync = execSync as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vol.reset();
    vol.mkdirSync(testBaseDir, { recursive: true });
    idAllocationService = new IdAllocationService(testBaseDir);
    service = new ScaffoldingService(idAllocationService);

    mockedExecSync.mockReset();
    mockedExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes("user.name")) {
        return "Test User";
      }
      if (cmd.includes("user.email")) {
        return "test@example.com";
      }
      throw new Error("Git not configured");
    });
  });

  function createArtifactFile(id: string, slug: string) {
    const segments = id.split(".");

    if (segments.length === 1) {
      // Initiative
      vol.mkdirSync(`${testBaseDir}/${id}.${slug}`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/${id}.${slug}/${id}.yml`, "");
    } else if (segments.length === 2) {
      // Milestone
      const initiativeId = segments[0];
      const dirs = vol.readdirSync(testBaseDir) as string[];
      const initiativeDir = dirs.find((name) =>
        name.startsWith(`${initiativeId}.`),
      );
      if (!initiativeDir)
        throw new Error(`Initiative dir not found for ${initiativeId}`);

      vol.mkdirSync(`${testBaseDir}/${initiativeDir}/${id}.${slug}`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/${initiativeDir}/${id}.${slug}/${id}.yml`,
        "",
      );
    } else {
      // Issue
      const initiativeId = segments[0];
      const milestoneId = `${segments[0]}.${segments[1]}`;
      const dirs = vol.readdirSync(testBaseDir) as string[];
      const initiativeDir = dirs.find((name) =>
        name.startsWith(`${initiativeId}.`),
      );
      if (!initiativeDir)
        throw new Error(`Initiative dir not found for ${initiativeId}`);

      const milestoneDirs = vol.readdirSync(
        `${testBaseDir}/${initiativeDir}`,
      ) as string[];
      const milestoneDir = milestoneDirs.find((name) =>
        name.startsWith(`${milestoneId}.`),
      );
      if (!milestoneDir)
        throw new Error(`Milestone dir not found for ${milestoneId}`);

      vol.writeFileSync(
        `${testBaseDir}/${initiativeDir}/${milestoneDir}/${id}.${slug}.yml`,
        "",
      );
    }
  }

  describe("scaffoldInitiative", () => {
    it("should scaffold initiative with minimal options", async () => {
      const result = await service.scaffoldInitiative("Core Package");

      expect(result.id).toBe("A");
      expect(result.slug).toBe("core-package");
      expect(result.artifact.metadata.title).toBe("Core Package");
      expect(result.artifact.metadata.created_by).toBe(
        "Test User (test@example.com)",
      );
      expect(result.artifact.metadata.priority).toBe("medium");
      expect(result.artifact.metadata.estimation).toBe("M");
      expect(result.artifact.content.vision).toBe("TODO: Add vision statement");
      expect(result.artifact.content.scope.in).toEqual([
        "TODO: Add in-scope items",
      ]);
      expect(result.artifact.content.scope.out).toEqual([
        "TODO: Add out-of-scope items",
      ]);
      expect(result.artifact.content.success_criteria).toEqual([
        "TODO: Add success criteria",
      ]);
      expect(result.artifact.metadata.events).toHaveLength(1);
      expect(result.artifact.metadata.events[0].event).toBe("draft");
    });

    it("should scaffold initiative with custom metadata", async () => {
      const result = await service.scaffoldInitiative("Core Package", {
        vision: "Build core package",
        scopeIn: ["Types", "Schemas"],
        scopeOut: ["CLI"],
        successCriteria: ["Package published"],
        priority: "critical",
        estimation: "L",
        assignee: "Alice (alice@example.com)",
        notes: "Important initiative",
      });

      expect(result.artifact.metadata.priority).toBe("critical");
      expect(result.artifact.metadata.estimation).toBe("L");
      expect(result.artifact.metadata.assignee).toBe(
        "Alice (alice@example.com)",
      );
      expect(result.artifact.content.vision).toBe("Build core package");
      expect(result.artifact.content.scope.in).toEqual(["Types", "Schemas"]);
      expect(result.artifact.content.scope.out).toEqual(["CLI"]);
      expect(result.artifact.content.success_criteria).toEqual([
        "Package published",
      ]);
      expect(result.artifact.notes).toBe("Important initiative");
    });

    it("should auto-allocate sequential IDs", async () => {
      const result1 = await service.scaffoldInitiative("Initiative A");
      createArtifactFile(result1.id, result1.slug);

      const result2 = await service.scaffoldInitiative("Initiative B");
      createArtifactFile(result2.id, result2.slug);

      const result3 = await service.scaffoldInitiative("Initiative C");

      expect(result1.id).toBe("A");
      expect(result2.id).toBe("B");
      expect(result3.id).toBe("C");
    });

    it("should generate slugs from titles", async () => {
      const result1 = await service.scaffoldInitiative("Core Package v1");
      const result2 = await service.scaffoldInitiative("User Authentication!");
      const result3 = await service.scaffoldInitiative("API v2.0 (Beta)");

      expect(result1.slug).toBe("core-package-v1");
      expect(result2.slug).toBe("user-authentication");
      expect(result3.slug).toBe("api-v2-0-beta");
    });

    it("should use fallback actor when git not configured", async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error("Git not found");
      });

      const result = await service.scaffoldInitiative("Test");

      expect(result.artifact.metadata.created_by).toBe(
        "Unknown User (unknown@example.com)",
      );
    });
  });

  describe("scaffoldMilestone", () => {
    beforeEach(async () => {
      const init = await service.scaffoldInitiative("Parent Initiative");
      createArtifactFile(init.id, init.slug);
    });

    it("should scaffold milestone with minimal options", async () => {
      const result = await service.scaffoldMilestone(
        "A",
        "Foundation Services",
      );

      expect(result.id).toBe("A.1");
      expect(result.slug).toBe("foundation-services");
      expect(result.artifact.metadata.title).toBe("Foundation Services");
      expect(result.artifact.metadata.created_by).toBe(
        "Test User (test@example.com)",
      );
      expect(result.artifact.metadata.priority).toBe("medium");
      expect(result.artifact.metadata.estimation).toBe("M");
      expect(result.artifact.content.summary).toBe("TODO: Add summary");
      expect(result.artifact.content.deliverables).toEqual([
        "TODO: Add deliverables",
      ]);
      expect(result.artifact.metadata.events).toHaveLength(1);
      expect(result.artifact.metadata.events[0].event).toBe("draft");
    });

    it("should scaffold milestone with custom metadata", async () => {
      const result = await service.scaffoldMilestone(
        "A",
        "Foundation Services",
        {
          summary: "Build core services",
          deliverables: ["Service A", "Service B"],
          priority: "high",
          estimation: "XL",
          assignee: "Bob (bob@example.com)",
          notes: "Critical milestone",
        },
      );

      expect(result.artifact.metadata.priority).toBe("high");
      expect(result.artifact.metadata.estimation).toBe("XL");
      expect(result.artifact.metadata.assignee).toBe("Bob (bob@example.com)");
      expect(result.artifact.content.summary).toBe("Build core services");
      expect(result.artifact.content.deliverables).toEqual([
        "Service A",
        "Service B",
      ]);
      expect(result.artifact.notes).toBe("Critical milestone");
    });

    it("should auto-allocate sequential milestone IDs", async () => {
      const result1 = await service.scaffoldMilestone("A", "Milestone 1");
      createArtifactFile(result1.id, result1.slug);

      const result2 = await service.scaffoldMilestone("A", "Milestone 2");
      createArtifactFile(result2.id, result2.slug);

      const result3 = await service.scaffoldMilestone("A", "Milestone 3");

      expect(result1.id).toBe("A.1");
      expect(result2.id).toBe("A.2");
      expect(result3.id).toBe("A.3");
    });

    it("should throw error for invalid parent ID", async () => {
      await expect(service.scaffoldMilestone("A.1", "Test")).rejects.toThrow(
        /Invalid initiative ID/,
      );
    });
  });

  describe("scaffoldIssue", () => {
    beforeEach(async () => {
      const init = await service.scaffoldInitiative("Parent Initiative");
      createArtifactFile(init.id, init.slug);

      const milestone = await service.scaffoldMilestone(
        "A",
        "Parent Milestone",
      );
      createArtifactFile(milestone.id, milestone.slug);
    });

    it("should scaffold issue with minimal options", async () => {
      const result = await service.scaffoldIssue("A.1", "ID Allocation Logic");

      expect(result.id).toBe("A.1.1");
      expect(result.slug).toBe("id-allocation-logic");
      expect(result.artifact.metadata.title).toBe("ID Allocation Logic");
      expect(result.artifact.metadata.created_by).toBe(
        "Test User (test@example.com)",
      );
      expect(result.artifact.metadata.priority).toBe("medium");
      expect(result.artifact.metadata.estimation).toBe("M");
      expect(result.artifact.content.summary).toBe("TODO: Add summary");
      expect(result.artifact.content.acceptance_criteria).toEqual([
        "TODO: Add acceptance criteria",
      ]);
      expect(result.artifact.metadata.events).toHaveLength(1);
      expect(result.artifact.metadata.events[0].event).toBe("draft");
    });

    it("should scaffold issue with custom metadata", async () => {
      const result = await service.scaffoldIssue("A.1", "ID Allocation Logic", {
        summary: "Implement ID allocation",
        acceptanceCriteria: ["IDs allocated", "Tests pass"],
        priority: "critical",
        estimation: "XS",
        assignee: "Charlie (charlie@example.com)",
        notes: "High priority",
      });

      expect(result.artifact.metadata.priority).toBe("critical");
      expect(result.artifact.metadata.estimation).toBe("XS");
      expect(result.artifact.metadata.assignee).toBe(
        "Charlie (charlie@example.com)",
      );
      expect(result.artifact.content.summary).toBe("Implement ID allocation");
      expect(result.artifact.content.acceptance_criteria).toEqual([
        "IDs allocated",
        "Tests pass",
      ]);
      expect(result.artifact.notes).toBe("High priority");
    });

    it("should auto-allocate sequential issue IDs", async () => {
      const result1 = await service.scaffoldIssue("A.1", "Issue 1");
      createArtifactFile(result1.id, result1.slug);

      const result2 = await service.scaffoldIssue("A.1", "Issue 2");
      createArtifactFile(result2.id, result2.slug);

      const result3 = await service.scaffoldIssue("A.1", "Issue 3");

      expect(result1.id).toBe("A.1.1");
      expect(result2.id).toBe("A.1.2");
      expect(result3.id).toBe("A.1.3");
    });

    it("should throw error for invalid parent ID", async () => {
      await expect(service.scaffoldIssue("A", "Test")).rejects.toThrow(
        /Invalid milestone ID/,
      );
      await expect(service.scaffoldIssue("A.1.2", "Test")).rejects.toThrow(
        /Invalid milestone ID/,
      );
    });
  });

  describe("integration", () => {
    it("should create full hierarchy of artifacts", async () => {
      const initiative = await service.scaffoldInitiative("Test Project", {
        vision: "Build test project",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Project complete"],
      });

      const milestone = await service.scaffoldMilestone(
        initiative.id,
        "Phase 1",
        {
          summary: "First phase",
          deliverables: ["Deliverable 1"],
        },
      );

      const issue = await service.scaffoldIssue(milestone.id, "Task 1", {
        summary: "First task",
        acceptanceCriteria: ["Task done"],
      });

      expect(initiative.id).toBe("A");
      expect(milestone.id).toBe("A.1");
      expect(issue.id).toBe("A.1.1");

      expect(initiative.artifact.metadata.title).toBe("Test Project");
      expect(milestone.artifact.metadata.title).toBe("Phase 1");
      expect(issue.artifact.metadata.title).toBe("Task 1");
    });

    it("should generate unique slugs for all artifact types", async () => {
      const initiative = await service.scaffoldInitiative("Core Package v1.0");
      const milestone = await service.scaffoldMilestone("A", "API Development");
      const issue = await service.scaffoldIssue("A.1", "REST Endpoints");

      expect(initiative.slug).toBe("core-package-v1-0");
      expect(milestone.slug).toBe("api-development");
      expect(issue.slug).toBe("rest-endpoints");
    });
  });

  describe("git actor detection", () => {
    it("should detect git user name and email", async () => {
      mockedExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes("user.name")) return "Alice Smith";
        if (cmd.includes("user.email")) return "alice@example.com";
        throw new Error("Unknown command");
      });

      const result = await service.scaffoldInitiative("Test");

      expect(result.artifact.metadata.created_by).toBe(
        "Alice Smith (alice@example.com)",
      );
    });

    it("should handle git config with whitespace", async () => {
      mockedExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes("user.name")) return "  Bob Jones  \n";
        if (cmd.includes("user.email")) return "  bob@example.com  \n";
        throw new Error("Unknown command");
      });

      const result = await service.scaffoldInitiative("Test");

      expect(result.artifact.metadata.created_by).toBe(
        "Bob Jones (bob@example.com)",
      );
    });

    it("should use fallback when git name missing", async () => {
      mockedExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes("user.name")) return "";
        if (cmd.includes("user.email")) return "test@example.com";
        throw new Error("Unknown command");
      });

      const result = await service.scaffoldInitiative("Test");

      expect(result.artifact.metadata.created_by).toBe(
        "Unknown User (unknown@example.com)",
      );
    });

    it("should use fallback when git email missing", async () => {
      mockedExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes("user.name")) return "Test User";
        if (cmd.includes("user.email")) return "";
        throw new Error("Unknown command");
      });

      const result = await service.scaffoldInitiative("Test");

      expect(result.artifact.metadata.created_by).toBe(
        "Unknown User (unknown@example.com)",
      );
    });

    it("should use fallback when execSync throws", async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error("Command failed");
      });

      const result = await service.scaffoldInitiative("Test");

      expect(result.artifact.metadata.created_by).toBe(
        "Unknown User (unknown@example.com)",
      );
    });
  });
});
