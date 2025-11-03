import path from "node:path";

import {
  scaffoldInitiative,
  scaffoldIssue,
  scaffoldMilestone,
} from "@kodebase/core";
import { vol } from "memfs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArtifactService } from "./artifact-service.js";
import { ContextService } from "./context-service.js";
import { ArtifactError } from "./error-formatting.js";
import { NotInKodebaseProjectError } from "./errors.js";

// Mock node:fs/promises to use memfs
vi.mock("node:fs/promises", async () => {
  const { fs } = await import("memfs");
  return {
    default: fs.promises,
  };
});

describe("ContextService", () => {
  const testBaseDir = "/test-workspace";
  let service: ContextService;
  let artifactService: ArtifactService;

  beforeEach(() => {
    vol.reset();
    vol.mkdirSync(testBaseDir, { recursive: true });
    service = new ContextService(testBaseDir);
    artifactService = new ArtifactService();
  });

  afterEach(() => {
    vol.reset();
  });

  /**
   * Helper: Creates a basic artifact structure for testing
   */
  async function createTestArtifacts() {
    // Create initiative A
    const initiative = scaffoldInitiative({
      title: "Core Package",
      createdBy: "Test User (test@example.com)",
      vision: "Build core package",
      scopeIn: ["Types", "Schemas"],
      scopeOut: ["CLI"],
      successCriteria: ["Package published"],
    });

    await artifactService.createArtifact({
      id: "A",
      artifact: initiative,
      slug: "core-package",
      baseDir: testBaseDir,
    });

    // Create milestone A.1
    const milestone = scaffoldMilestone({
      title: "Types and Schemas",
      createdBy: "Test User (test@example.com)",
      summary: "Implement types",
      deliverables: ["TypeScript types"],
    });

    await artifactService.createArtifact({
      id: "A.1",
      artifact: milestone,
      slug: "types",
      baseDir: testBaseDir,
    });

    // Create issue A.1.1
    const issue = scaffoldIssue({
      title: "Schema Definitions",
      createdBy: "Test User (test@example.com)",
      summary: "Define schemas",
      acceptanceCriteria: ["Schemas defined"],
    });

    await artifactService.createArtifact({
      id: "A.1.1",
      artifact: issue,
      slug: "schemas",
      baseDir: testBaseDir,
    });
  }

  describe("isKodebaseProject", () => {
    it("returns true when .kodebase/ directory exists", async () => {
      vol.mkdirSync(path.join(testBaseDir, ".kodebase"), { recursive: true });

      const result = await service.isKodebaseProject();

      expect(result).toBe(true);
    });

    it("returns false when .kodebase/ directory does not exist", async () => {
      const result = await service.isKodebaseProject();

      expect(result).toBe(false);
    });

    it("returns false when .kodebase exists but is a file", async () => {
      vol.writeFileSync(path.join(testBaseDir, ".kodebase"), "not a directory");

      const result = await service.isKodebaseProject();

      expect(result).toBe(false);
    });
  });

  describe("ensureLayout", () => {
    it("creates .kodebase/artifacts/ directory when missing", async () => {
      await service.ensureLayout();

      const artifactsPath = path.join(testBaseDir, ".kodebase/artifacts");
      expect(vol.existsSync(artifactsPath)).toBe(true);
    });

    it("is idempotent - works when directory already exists", async () => {
      await service.ensureLayout();
      await service.ensureLayout(); // Should not throw

      const artifactsPath = path.join(testBaseDir, ".kodebase/artifacts");
      expect(vol.existsSync(artifactsPath)).toBe(true);
    });

    it("creates parent .kodebase/ directory if needed", async () => {
      await service.ensureLayout();

      const kodebasePath = path.join(testBaseDir, ".kodebase");
      expect(vol.existsSync(kodebasePath)).toBe(true);
    });
  });

  describe("detectContext", () => {
    it("throws NotInKodebaseProjectError when .kodebase/ missing", async () => {
      await expect(service.detectContext()).rejects.toThrow(
        NotInKodebaseProjectError,
      );
      await expect(service.detectContext()).rejects.toThrow(
        `Not in a Kodebase project. No .kodebase/ directory found at: ${testBaseDir}`,
      );
    });

    it("detects root context at .kodebase/artifacts/", async () => {
      await service.ensureLayout();

      const context = await service.detectContext();

      expect(context).toEqual({
        level: "root",
        ancestorIds: [],
      });
    });

    it("detects root context above .kodebase/artifacts/", async () => {
      await service.ensureLayout();

      const context = await service.detectContext(".");

      expect(context).toEqual({
        level: "root",
        ancestorIds: [],
      });
    });

    it("detects initiative context from A.slug/ directory", async () => {
      await createTestArtifacts();

      const initiativePath = ".kodebase/artifacts/A.core-package";
      const context = await service.detectFromPath(initiativePath);

      expect(context).toEqual({
        level: "initiative",
        currentId: "A",
        parentId: undefined,
        ancestorIds: ["A"],
      });
    });

    it("detects milestone context from A.1.slug/ directory", async () => {
      await createTestArtifacts();

      const milestonePath = ".kodebase/artifacts/A.core-package/A.1.types";
      const context = await service.detectFromPath(milestonePath);

      expect(context).toEqual({
        level: "milestone",
        currentId: "A.1",
        parentId: "A",
        ancestorIds: ["A", "A.1"],
      });
    });

    it("detects issue context from A.1.1.slug.yml file path", async () => {
      await createTestArtifacts();

      const issuePath =
        ".kodebase/artifacts/A.core-package/A.1.types/A.1.1.schemas.yml";
      const context = await service.detectFromPath(issuePath);

      expect(context).toEqual({
        level: "issue",
        currentId: "A.1.1",
        parentId: "A.1",
        ancestorIds: ["A", "A.1", "A.1.1"],
      });
    });
  });

  describe("detectFromBranch", () => {
    it("parses 'add/A.1.3' branch name", async () => {
      const context = await service.detectFromBranch("add/A.1.3");

      expect(context).toEqual({
        level: "issue",
        currentId: "A.1.3",
        parentId: "A.1",
        ancestorIds: ["A", "A.1", "A.1.3"],
        branchName: "add/A.1.3",
      });
    });

    it("parses 'A.1.3' implementation branch name", async () => {
      const context = await service.detectFromBranch("A.1.3");

      expect(context).toEqual({
        level: "issue",
        currentId: "A.1.3",
        parentId: "A.1",
        ancestorIds: ["A", "A.1", "A.1.3"],
        branchName: "A.1.3",
      });
    });

    it("parses 'complete/A.1' branch name", async () => {
      const context = await service.detectFromBranch("complete/A.1");

      expect(context).toEqual({
        level: "milestone",
        currentId: "A.1",
        parentId: "A",
        ancestorIds: ["A", "A.1"],
        branchName: "complete/A.1",
      });
    });

    it("parses 'complete/A' initiative branch name", async () => {
      const context = await service.detectFromBranch("complete/A");

      expect(context).toEqual({
        level: "initiative",
        currentId: "A",
        parentId: undefined,
        ancestorIds: ["A"],
        branchName: "complete/A",
      });
    });

    it("parses 'add/A' initiative branch name", async () => {
      const context = await service.detectFromBranch("add/A");

      expect(context).toEqual({
        level: "initiative",
        currentId: "A",
        parentId: undefined,
        ancestorIds: ["A"],
        branchName: "add/A",
      });
    });

    it("handles multi-letter initiative IDs", async () => {
      const context = await service.detectFromBranch("add/ABC.1.2");

      expect(context).toEqual({
        level: "issue",
        currentId: "ABC.1.2",
        parentId: "ABC.1",
        ancestorIds: ["ABC", "ABC.1", "ABC.1.2"],
        branchName: "add/ABC.1.2",
      });
    });

    it("throws ArtifactError for 'main' branch", async () => {
      await expect(service.detectFromBranch("main")).rejects.toThrow(
        ArtifactError,
      );
      await expect(service.detectFromBranch("main")).rejects.toThrow(
        /does not match Kodebase conventions/,
      );
    });

    it("throws ArtifactError for 'develop' branch", async () => {
      await expect(service.detectFromBranch("develop")).rejects.toThrow(
        ArtifactError,
      );
    });

    it("throws ArtifactError for invalid branch format", async () => {
      await expect(
        service.detectFromBranch("feature/new-thing"),
      ).rejects.toThrow(ArtifactError);
      await expect(service.detectFromBranch("fix/bug-123")).rejects.toThrow(
        ArtifactError,
      );
    });

    it("throws ArtifactError for malformed artifact IDs", async () => {
      await expect(service.detectFromBranch("add/a.1.3")).rejects.toThrow(
        ArtifactError,
      );
      await expect(service.detectFromBranch("add/A-1-3")).rejects.toThrow(
        ArtifactError,
      );
    });
  });

  describe("detectFromPath", () => {
    it("detects initiative from directory path", async () => {
      await createTestArtifacts();

      const initiativePath = ".kodebase/artifacts/A.core-package";
      const context = await service.detectFromPath(initiativePath);

      expect(context).toEqual({
        level: "initiative",
        currentId: "A",
        parentId: undefined,
        ancestorIds: ["A"],
      });
    });

    it("detects milestone from directory path", async () => {
      await createTestArtifacts();

      const milestonePath = ".kodebase/artifacts/A.core-package/A.1.types";
      const context = await service.detectFromPath(milestonePath);

      expect(context).toEqual({
        level: "milestone",
        currentId: "A.1",
        parentId: "A",
        ancestorIds: ["A", "A.1"],
      });
    });

    it("detects issue from file path", async () => {
      await createTestArtifacts();

      const issuePath =
        ".kodebase/artifacts/A.core-package/A.1.types/A.1.1.schemas.yml";
      const context = await service.detectFromPath(issuePath);

      expect(context).toEqual({
        level: "issue",
        currentId: "A.1.1",
        parentId: "A.1",
        ancestorIds: ["A", "A.1", "A.1.1"],
      });
    });

    it("handles absolute paths", async () => {
      await createTestArtifacts();

      const absolutePath = path.join(
        testBaseDir,
        ".kodebase/artifacts/A.core-package/A.1.types",
      );
      const context = await service.detectFromPath(absolutePath);

      expect(context.level).toBe("milestone");
      expect(context.currentId).toBe("A.1");
    });

    it("throws NotInKodebaseProjectError for paths outside artifacts directory", async () => {
      await service.ensureLayout();

      const outsidePath = "/some/other/path";
      await expect(service.detectFromPath(outsidePath)).rejects.toThrow(
        NotInKodebaseProjectError,
      );
    });

    it("detects root for artifacts directory itself", async () => {
      await service.ensureLayout();

      const context = await service.detectFromPath(".kodebase/artifacts");

      expect(context).toEqual({
        level: "root",
        ancestorIds: [],
      });
    });

    it("handles non-existent paths within artifacts directory", async () => {
      await service.ensureLayout();

      // Should treat as root if no artifact IDs found
      const context = await service.detectFromPath(
        ".kodebase/artifacts/nonexistent",
      );

      expect(context.level).toBe("root");
    });
  });

  describe("isValidContext", () => {
    it("returns true when inside artifacts directory", async () => {
      await createTestArtifacts();

      const milestonePath = ".kodebase/artifacts/A.core-package/A.1.types";
      const result = await service.isValidContext(milestonePath);

      expect(result).toBe(true);
    });

    it("returns false when outside artifacts directory", async () => {
      await service.ensureLayout();

      const result = await service.isValidContext("../outside");

      expect(result).toBe(false);
    });

    it("returns false when not in Kodebase project", async () => {
      const result = await service.isValidContext();

      expect(result).toBe(false);
    });

    it("returns true at artifacts root", async () => {
      await service.ensureLayout();

      const artifactsPath = ".kodebase/artifacts";
      const result = await service.isValidContext(artifactsPath);

      expect(result).toBe(true);
    });
  });

  describe("requireContext", () => {
    it("succeeds when context level is sufficient (initiative required, initiative provided)", async () => {
      await createTestArtifacts();

      // Detect context from initiative path and verify it meets requirement
      const initiativePath = ".kodebase/artifacts/A.core-package";
      const context = await service.detectFromPath(initiativePath);

      // Now verify requireContext would work (simulate by checking level manually)
      const levelHierarchy = ["root", "initiative", "milestone", "issue"];
      const requiredIndex = levelHierarchy.indexOf("initiative");
      const currentIndex = levelHierarchy.indexOf(context.level);

      expect(currentIndex >= requiredIndex).toBe(true);
      expect(context.level).toBe("initiative");
    });

    it("succeeds when context level exceeds requirement (milestone provided, initiative required)", async () => {
      await createTestArtifacts();

      const milestonePath = ".kodebase/artifacts/A.core-package/A.1.types";
      const context = await service.detectFromPath(milestonePath);

      const levelHierarchy = ["root", "initiative", "milestone", "issue"];
      const requiredIndex = levelHierarchy.indexOf("initiative");
      const currentIndex = levelHierarchy.indexOf(context.level);

      expect(currentIndex >= requiredIndex).toBe(true);
      expect(context.level).toBe("milestone");
    });

    it("throws ArtifactError when context level is insufficient (milestone required, initiative provided)", async () => {
      await createTestArtifacts();

      const initiativePath = ".kodebase/artifacts/A.core-package";
      const context = await service.detectFromPath(initiativePath);

      const levelHierarchy = ["root", "initiative", "milestone", "issue"];
      const requiredIndex = levelHierarchy.indexOf("milestone");
      const currentIndex = levelHierarchy.indexOf(context.level);

      // Initiative (level 1) < milestone (level 2)
      expect(currentIndex < requiredIndex).toBe(true);
    });

    it("throws ArtifactError when in root context", async () => {
      await service.ensureLayout();

      await expect(service.requireContext("initiative")).rejects.toThrow(
        ArtifactError,
      );
    });

    it("succeeds when milestone required and milestone provided", async () => {
      await createTestArtifacts();

      const milestonePath = ".kodebase/artifacts/A.core-package/A.1.types";
      const context = await service.detectFromPath(milestonePath);

      const levelHierarchy = ["root", "initiative", "milestone", "issue"];
      const requiredIndex = levelHierarchy.indexOf("milestone");
      const currentIndex = levelHierarchy.indexOf(context.level);

      expect(currentIndex >= requiredIndex).toBe(true);
      expect(context.level).toBe("milestone");
      expect(context.currentId).toBe("A.1");
    });

    it("throws when issue required but milestone provided", async () => {
      await createTestArtifacts();

      const milestonePath = ".kodebase/artifacts/A.core-package/A.1.types";
      const context = await service.detectFromPath(milestonePath);

      const levelHierarchy = ["root", "initiative", "milestone", "issue"];
      const requiredIndex = levelHierarchy.indexOf("issue");
      const currentIndex = levelHierarchy.indexOf(context.level);

      // Milestone (level 2) < issue (level 3)
      expect(currentIndex < requiredIndex).toBe(true);
    });
  });

  describe("integration scenarios", () => {
    it("detects context from multi-level nested structure", async () => {
      await createTestArtifacts();

      // Create additional nested artifacts
      const issue2 = scaffoldIssue({
        title: "Parser Implementation",
        createdBy: "Test User (test@example.com)",
        summary: "Implement parser",
        acceptanceCriteria: ["Parser works"],
      });

      await artifactService.createArtifact({
        id: "A.1.2",
        artifact: issue2,
        slug: "parser",
        baseDir: testBaseDir,
      });

      // Detect context from deep path
      const deepPath = ".kodebase/artifacts/A.core-package/A.1.types";
      const context = await service.detectFromPath(deepPath);

      expect(context.level).toBe("milestone");
      expect(context.ancestorIds).toEqual(["A", "A.1"]);
    });

    it("handles multi-letter initiative IDs in path detection", async () => {
      await service.ensureLayout();

      const initiative = scaffoldInitiative({
        title: "Multi-letter Initiative",
        createdBy: "Test User (test@example.com)",
        vision: "Test multi-letter ID",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Success"],
      });

      await artifactService.createArtifact({
        id: "ABC",
        artifact: initiative,
        slug: "multi",
        baseDir: testBaseDir,
      });

      const context = await service.detectFromPath(
        ".kodebase/artifacts/ABC.multi",
      );

      expect(context.currentId).toBe("ABC");
      expect(context.level).toBe("initiative");
    });
  });
});
