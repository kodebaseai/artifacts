import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import {
  scaffoldInitiative,
  scaffoldIssue,
  scaffoldMilestone,
} from "../builder/artifact-scaffolder.js";
import { writeArtifact } from "../loading/artifact-file-service.js";
import { loadAllArtifactPaths } from "../loading/artifact-loader.js";
import { getArtifactIdFromPath } from "../loading/artifact-paths.js";
import { validateArtifact } from "../validator/artifact-validator.js";
import { allocateNextId, detectContextLevel } from "./artifact-context.js";
import { isAncestorBlockedOrCancelled } from "./artifact-gating.js";
import {
  ensureArtifactsLayout,
  resolveArtifactPaths,
} from "./artifact-layout.js";

const VALID_ACTOR = "Test User (test@example.com)";

/**
 * Helper to allocate next initiative ID (A, B, C, AA, AB, etc.)
 * Scans existing initiatives and returns next letter in sequence.
 */
async function allocateNextInitiativeId(
  artifactsRoot: string,
): Promise<string> {
  try {
    const allPaths = await loadAllArtifactPaths(artifactsRoot);

    // Extract initiative IDs (single letter segment)
    const initiativeIds: string[] = [];
    for (const filePath of allPaths) {
      const id = getArtifactIdFromPath(filePath);
      if (id && id.split(".").length === 1) {
        initiativeIds.push(id);
      }
    }

    // If no initiatives exist, return "A"
    if (initiativeIds.length === 0) {
      return "A";
    }

    // Find the "largest" initiative ID and increment it
    // Simple strategy: sort alphabetically and increment last one
    // A -> B, Z -> AA, AZ -> BA, etc.
    const sorted = initiativeIds.sort();
    const last = sorted[sorted.length - 1];
    if (!last) return "A";

    // Simple increment: A->B, B->C, ..., Z->AA, AA->AB, etc.
    return incrementInitiativeId(last);
  } catch {
    // No artifacts directory yet, start with A
    return "A";
  }
}

/**
 * Increments an initiative ID letter.
 * Examples: A->B, Z->AA, AA->AB, AZ->BA
 */
function incrementInitiativeId(id: string): string {
  const chars = id.split("");

  // Start from rightmost character
  for (let i = chars.length - 1; i >= 0; i--) {
    const char = chars[i];
    if (!char) continue;

    if (char !== "Z") {
      // Can increment this character
      chars[i] = String.fromCharCode(char.charCodeAt(0) + 1);
      return chars.join("");
    }
    // Overflow, set to A and carry to next position
    chars[i] = "A";
  }

  // All characters were Z, add a new A at the start
  return `A${chars.join("")}`;
}

describe("wizard helpers integration", () => {
  describe("end-to-end artifact creation workflow", () => {
    it("creates initiative from scratch (empty repo)", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-wizard-"));
      try {
        // Step 1: Ensure artifacts layout exists
        const artifactsRoot = await ensureArtifactsLayout(tempDir);
        expect(artifactsRoot).toBe(path.join(tempDir, ".kodebase/artifacts"));

        // Step 2: Detect context level (no parent = initiative)
        const context = detectContextLevel(null);
        expect(context).toBe("initiative");

        // Step 3: Allocate next ID
        const nextId = await allocateNextInitiativeId(artifactsRoot);
        expect(nextId).toBe("A"); // First initiative

        // Step 4: Scaffold initiative artifact
        const initiative = scaffoldInitiative({
          title: "Test Initiative",
          createdBy: VALID_ACTOR,
          vision: "Test vision",
          scopeIn: ["Feature A"],
          scopeOut: ["Feature B"],
          successCriteria: ["Works"],
        });

        // Step 5: Validate artifact (throws on invalid, returns { type, data } on valid)
        const validationResult = validateArtifact(initiative);
        expect(validationResult.type).toBe("initiative");
        expect(validationResult.data.metadata.title).toBe("Test Initiative");

        // Step 6: Resolve file paths
        const { dirPath, filePath } = await resolveArtifactPaths({
          id: nextId,
          slug: "test-initiative",
          baseDir: tempDir,
        });

        // Step 7: Write artifact to disk (create dir first)
        await fs.mkdir(dirPath, { recursive: true });
        await writeArtifact(filePath, initiative);

        // Step 8: Verify file exists
        const fileExists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);

        // Step 9: Verify file can be loaded
        const allPaths = await loadAllArtifactPaths(artifactsRoot);
        expect(allPaths).toContain(filePath);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("creates milestone under existing initiative", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-wizard-"));
      try {
        const artifactsRoot = await ensureArtifactsLayout(tempDir);

        // Pre-create initiative A
        const initiativeDir = path.join(artifactsRoot, "A.test-initiative");
        await fs.mkdir(initiativeDir, { recursive: true });
        const initiativeFile = path.join(initiativeDir, "A.yml");
        const initiative = scaffoldInitiative({
          title: "Parent Initiative",
          createdBy: VALID_ACTOR,
          vision: "Vision",
          scopeIn: ["A"],
          scopeOut: ["B"],
          successCriteria: ["C"],
        });
        await writeArtifact(initiativeFile, initiative);

        // Now create milestone
        const parentId = "A";
        const context = detectContextLevel(parentId);
        expect(context).toBe("milestone");

        const nextId = await allocateNextId(parentId, tempDir);
        expect(nextId).toBe("A.1"); // First milestone

        const milestone = scaffoldMilestone({
          title: "Test Milestone",
          createdBy: VALID_ACTOR,
          summary: "Deliver features",
          deliverables: ["Feature X"],
        });

        const validationResult = validateArtifact(milestone);
        expect(validationResult.type).toBe("milestone");
        expect(validationResult.data.metadata.title).toBe("Test Milestone");

        const { dirPath, filePath } = await resolveArtifactPaths({
          id: nextId,
          slug: "test-milestone",
          baseDir: tempDir,
        });

        await fs.mkdir(dirPath, { recursive: true });
        await writeArtifact(filePath, milestone);

        const fileExists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);

        // Verify it's under the initiative directory
        expect(filePath).toContain("A.test-initiative");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("creates issue under existing milestone", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-wizard-"));
      try {
        const artifactsRoot = await ensureArtifactsLayout(tempDir);

        // Pre-create initiative A
        const initiativeDir = path.join(artifactsRoot, "A.test-initiative");
        await fs.mkdir(initiativeDir, { recursive: true });
        const initiativeFile = path.join(initiativeDir, "A.yml");
        const initiative = scaffoldInitiative({
          title: "Parent Initiative",
          createdBy: VALID_ACTOR,
          vision: "Vision",
          scopeIn: ["A"],
          scopeOut: ["B"],
          successCriteria: ["C"],
        });
        await writeArtifact(initiativeFile, initiative);

        // Pre-create milestone A.1
        const milestoneDir = path.join(initiativeDir, "A.1.test-milestone");
        await fs.mkdir(milestoneDir, { recursive: true });
        const milestoneFile = path.join(milestoneDir, "A.1.yml");
        const milestone = scaffoldMilestone({
          title: "Parent Milestone",
          createdBy: VALID_ACTOR,
          summary: "Summary",
          deliverables: ["D"],
        });
        await writeArtifact(milestoneFile, milestone);

        // Now create issue
        const parentId = "A.1";
        const context = detectContextLevel(parentId);
        expect(context).toBe("issue");

        const nextId = await allocateNextId(parentId, tempDir);
        expect(nextId).toBe("A.1.1"); // First issue

        const issue = scaffoldIssue({
          title: "Test Issue",
          createdBy: VALID_ACTOR,
          summary: "Fix bug",
          acceptanceCriteria: ["Works correctly"],
        });

        const validationResult = validateArtifact(issue);
        expect(validationResult.type).toBe("issue");
        expect(validationResult.data.metadata.title).toBe("Test Issue");

        const { filePath } = await resolveArtifactPaths({
          id: nextId,
          baseDir: tempDir,
          // Issues can skip slug
        });

        await writeArtifact(filePath, issue);

        const fileExists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);

        // Verify it's under the milestone directory
        expect(filePath).toContain("A.1.test-milestone");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("creates full three-level hierarchy in sequence", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-wizard-"));
      try {
        const artifactsRoot = await ensureArtifactsLayout(tempDir);

        // Create initiative
        const initiativeId = await allocateNextInitiativeId(artifactsRoot);
        const initiative = scaffoldInitiative({
          title: "Initiative",
          createdBy: VALID_ACTOR,
          vision: "Vision",
          scopeIn: ["A"],
          scopeOut: ["B"],
          successCriteria: ["C"],
        });
        const { dirPath: initDir, filePath: initPath } =
          await resolveArtifactPaths({
            id: initiativeId,
            slug: "init",
            baseDir: tempDir,
          });
        await fs.mkdir(initDir, { recursive: true });
        await writeArtifact(initPath, initiative);

        // Create milestone
        const milestoneId = await allocateNextId(initiativeId, tempDir);
        expect(milestoneId).toBe(`${initiativeId}.1`);
        const milestone = scaffoldMilestone({
          title: "Milestone",
          createdBy: VALID_ACTOR,
          summary: "Summary",
          deliverables: ["D"],
        });
        const { dirPath: mileDir, filePath: milePath } =
          await resolveArtifactPaths({
            id: milestoneId,
            slug: "mile",
            baseDir: tempDir,
          });
        await fs.mkdir(mileDir, { recursive: true });
        await writeArtifact(milePath, milestone);

        // Create issue
        const issueId = await allocateNextId(milestoneId, tempDir);
        expect(issueId).toBe(`${milestoneId}.1`);
        const issue = scaffoldIssue({
          title: "Issue",
          createdBy: VALID_ACTOR,
          summary: "Summary",
          acceptanceCriteria: ["C"],
        });
        const { filePath: issuePath } = await resolveArtifactPaths({
          id: issueId,
          baseDir: tempDir,
        });
        await writeArtifact(issuePath, issue);

        // Verify all three exist
        const allPaths = await loadAllArtifactPaths(artifactsRoot);
        expect(allPaths).toHaveLength(3);
        expect(allPaths).toContain(initPath);
        expect(allPaths).toContain(milePath);
        expect(allPaths).toContain(issuePath);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("integration with file service", () => {
    it("scaffolded artifacts can be written and loaded", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-wizard-"));
      try {
        const artifactsRoot = await ensureArtifactsLayout(tempDir);

        // Scaffold all three types
        const initiative = scaffoldInitiative({
          title: "Init",
          createdBy: VALID_ACTOR,
          vision: "V",
          scopeIn: ["A"],
          scopeOut: ["B"],
          successCriteria: ["C"],
        });
        const milestone = scaffoldMilestone({
          title: "Mile",
          createdBy: VALID_ACTOR,
          summary: "S",
          deliverables: ["D"],
        });
        const issue = scaffoldIssue({
          title: "Issue",
          createdBy: VALID_ACTOR,
          summary: "S",
          acceptanceCriteria: ["C"],
        });

        // Write them (create dirs first for milestone/issue)
        const { dirPath: initDir, filePath: initPath } =
          await resolveArtifactPaths({
            id: "A",
            slug: "init",
            baseDir: tempDir,
          });
        await fs.mkdir(initDir, { recursive: true });
        await writeArtifact(initPath, initiative);

        const { dirPath: mileDir, filePath: milePath } =
          await resolveArtifactPaths({
            id: "A.1",
            slug: "mile",
            baseDir: tempDir,
          });
        await fs.mkdir(mileDir, { recursive: true });
        await writeArtifact(milePath, milestone);

        const { filePath: issuePath } = await resolveArtifactPaths({
          id: "A.1.1",
          baseDir: tempDir,
        });
        await writeArtifact(issuePath, issue);

        // Load all artifacts
        const allPaths = await loadAllArtifactPaths(artifactsRoot);
        expect(allPaths).toHaveLength(3);
        expect(allPaths).toContain(initPath);
        expect(allPaths).toContain(milePath);
        expect(allPaths).toContain(issuePath);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("round-trip validation: scaffold → write → read → validate", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-wizard-"));
      try {
        await ensureArtifactsLayout(tempDir);

        // Scaffold initiative
        const original = scaffoldInitiative({
          title: "Test",
          createdBy: VALID_ACTOR,
          vision: "Vision",
          scopeIn: ["A"],
          scopeOut: ["B"],
          successCriteria: ["C"],
          priority: "high",
          estimation: "XL",
        });

        // Validate before write (throws on invalid, returns { type, data } on valid)
        const beforeValidation = validateArtifact(original);
        expect(beforeValidation.type).toBe("initiative");
        expect(beforeValidation.data.metadata.title).toBe("Test");

        // Write to disk
        const { dirPath, filePath } = await resolveArtifactPaths({
          id: "A",
          slug: "test",
          baseDir: tempDir,
        });
        await fs.mkdir(dirPath, { recursive: true });
        await writeArtifact(filePath, original);

        // Read back
        const content = await fs.readFile(filePath, "utf-8");
        const parsed = await import("yaml").then((yaml) => yaml.parse(content));

        // Validate after read
        const afterValidation = validateArtifact(parsed);
        expect(afterValidation.type).toBe("initiative");
        expect(afterValidation.data.metadata.title).toBe("Test");

        // Verify fields match
        expect(parsed.metadata.title).toBe(original.metadata.title);
        expect(parsed.metadata.priority).toBe(original.metadata.priority);
        expect(parsed.metadata.estimation).toBe(original.metadata.estimation);
        expect(parsed.content.vision).toBe(original.content.vision);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("gating integration", () => {
    it("blocks child creation when parent is blocked", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-wizard-"));
      try {
        const artifactsRoot = await ensureArtifactsLayout(tempDir);

        // Create initiative A in blocked state
        const initiativeDir = path.join(artifactsRoot, "A.test-initiative");
        await fs.mkdir(initiativeDir, { recursive: true });
        const initiativeFile = path.join(initiativeDir, "A.yml");
        await fs.writeFile(
          initiativeFile,
          `metadata:
  events:
    - event: draft
      timestamp: "2025-11-01T10:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: artifact_created
    - event: blocked
      timestamp: "2025-11-01T11:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: has_dependencies
`,
        );

        // Check if we can create milestone under blocked parent
        const gatingResult = await isAncestorBlockedOrCancelled(
          "A.1",
          artifactsRoot,
        );

        expect(gatingResult.isBlocked).toBe(true);
        expect(gatingResult.reason).toContain("initiative");
        expect(gatingResult.reason).toContain("blocked");

        // In a real wizard, we would stop here and not create the milestone
        // This simulates the CLI checking before creation
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("blocks grandchild creation when grandparent is cancelled", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-wizard-"));
      try {
        const artifactsRoot = await ensureArtifactsLayout(tempDir);

        // Create initiative A (cancelled)
        const initiativeDir = path.join(artifactsRoot, "A.test-initiative");
        await fs.mkdir(initiativeDir, { recursive: true });
        const initiativeFile = path.join(initiativeDir, "A.yml");
        await fs.writeFile(
          initiativeFile,
          `metadata:
  events:
    - event: draft
      timestamp: "2025-11-01T10:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: artifact_created
    - event: cancelled
      timestamp: "2025-11-01T12:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: manual_action
`,
        );

        // Create milestone A.1 (ready - healthy!)
        const milestoneDir = path.join(initiativeDir, "A.1.test-milestone");
        await fs.mkdir(milestoneDir, { recursive: true });
        const milestoneFile = path.join(milestoneDir, "A.1.yml");
        await fs.writeFile(
          milestoneFile,
          `metadata:
  events:
    - event: draft
      timestamp: "2025-11-01T10:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: artifact_created
    - event: ready
      timestamp: "2025-11-01T11:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: planning_complete
`,
        );

        // Check if we can create issue under healthy milestone but cancelled grandparent
        const gatingResult = await isAncestorBlockedOrCancelled(
          "A.1.1",
          artifactsRoot,
        );

        expect(gatingResult.isBlocked).toBe(true);
        expect(gatingResult.reason).toContain("initiative");
        expect(gatingResult.reason).toContain("cancelled");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("allows creation when all ancestors are healthy", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-wizard-"));
      try {
        const artifactsRoot = await ensureArtifactsLayout(tempDir);

        // Create healthy hierarchy
        const initiativeDir = path.join(artifactsRoot, "A.test-initiative");
        await fs.mkdir(initiativeDir, { recursive: true });
        const initiativeFile = path.join(initiativeDir, "A.yml");
        await fs.writeFile(
          initiativeFile,
          `metadata:
  events:
    - event: draft
      timestamp: "2025-11-01T10:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: artifact_created
    - event: in_progress
      timestamp: "2025-11-01T11:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: work_started
`,
        );

        const milestoneDir = path.join(initiativeDir, "A.1.test-milestone");
        await fs.mkdir(milestoneDir, { recursive: true });
        const milestoneFile = path.join(milestoneDir, "A.1.yml");
        await fs.writeFile(
          milestoneFile,
          `metadata:
  events:
    - event: draft
      timestamp: "2025-11-01T10:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: artifact_created
    - event: ready
      timestamp: "2025-11-01T11:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: planning_complete
`,
        );

        // Check gating
        const gatingResult = await isAncestorBlockedOrCancelled(
          "A.1.1",
          artifactsRoot,
        );

        expect(gatingResult.isBlocked).toBe(false);
        expect(gatingResult.reason).toBe("No blocking ancestors");

        // Proceed with creation
        const issueId = await allocateNextId("A.1", tempDir);
        expect(issueId).toBe("A.1.1");

        const issue = scaffoldIssue({
          title: "Issue",
          createdBy: VALID_ACTOR,
          summary: "Summary",
          acceptanceCriteria: ["C"],
        });

        const { filePath } = await resolveArtifactPaths({
          id: issueId,
          baseDir: tempDir,
        });
        await writeArtifact(filePath, issue);

        const fileExists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("edge case integration", () => {
    it("handles sparse ID ranges correctly in workflow", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-wizard-"));
      try {
        await ensureArtifactsLayout(tempDir);

        // Create initiative
        const { dirPath: initDir, filePath: initPath } =
          await resolveArtifactPaths({
            id: "A",
            slug: "init",
            baseDir: tempDir,
          });
        const initiative = scaffoldInitiative({
          title: "Init",
          createdBy: VALID_ACTOR,
          vision: "V",
          scopeIn: ["A"],
          scopeOut: ["B"],
          successCriteria: ["C"],
        });
        await fs.mkdir(initDir, { recursive: true });
        await writeArtifact(initPath, initiative);

        // Create milestones with gaps: A.1, A.5, A.10
        for (const num of [1, 5, 10]) {
          const { dirPath, filePath } = await resolveArtifactPaths({
            id: `A.${num}`,
            slug: `mile-${num}`,
            baseDir: tempDir,
          });
          const milestone = scaffoldMilestone({
            title: `Milestone ${num}`,
            createdBy: VALID_ACTOR,
            summary: "S",
            deliverables: ["D"],
          });
          await fs.mkdir(dirPath, { recursive: true });
          await writeArtifact(filePath, milestone);
        }

        // Next allocated should be max+1 = A.11 (sparse range strategy)
        const nextId = await allocateNextId("A", tempDir);
        expect(nextId).toBe("A.11");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("handles multi-letter initiatives end-to-end", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-wizard-"));
      try {
        const artifactsRoot = await ensureArtifactsLayout(tempDir);

        // Create initiatives A, AA, AB, ABC
        for (const id of ["A", "AA", "AB", "ABC"]) {
          const { dirPath, filePath } = await resolveArtifactPaths({
            id,
            slug: `init-${id.toLowerCase()}`,
            baseDir: tempDir,
          });
          const initiative = scaffoldInitiative({
            title: `Initiative ${id}`,
            createdBy: VALID_ACTOR,
            vision: "V",
            scopeIn: ["A"],
            scopeOut: ["B"],
            successCriteria: ["C"],
          });
          await fs.mkdir(dirPath, { recursive: true });
          await writeArtifact(filePath, initiative);
        }

        // Create milestone under ABC
        const milestoneId = await allocateNextId("ABC", tempDir);
        expect(milestoneId).toBe("ABC.1");

        const { dirPath: mileDir, filePath: milePath } =
          await resolveArtifactPaths({
            id: milestoneId,
            slug: "mile",
            baseDir: tempDir,
          });
        const milestone = scaffoldMilestone({
          title: "Milestone",
          createdBy: VALID_ACTOR,
          summary: "S",
          deliverables: ["D"],
        });
        await fs.mkdir(mileDir, { recursive: true });
        await writeArtifact(milePath, milestone);

        // Verify milestone path is under ABC initiative
        expect(milePath).toContain("ABC.init-abc");

        // Verify all artifacts load
        const allPaths = await loadAllArtifactPaths(artifactsRoot);
        expect(allPaths).toHaveLength(5); // 4 initiatives + 1 milestone
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
