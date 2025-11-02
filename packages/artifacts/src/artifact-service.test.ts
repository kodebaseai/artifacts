import path from "node:path";

import {
  readArtifact,
  scaffoldInitiative,
  scaffoldIssue,
  scaffoldMilestone,
} from "@kodebase/core";
import { vol } from "memfs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArtifactService } from "./artifact-service.js";
import { ArtifactNotFoundError } from "./errors.js";

// Mock node:fs/promises to use memfs
vi.mock("node:fs/promises", async () => {
  const { fs } = await import("memfs");
  return {
    default: fs.promises,
  };
});

describe("ArtifactService", () => {
  const testBaseDir = "/test-workspace";
  let service: ArtifactService;

  beforeEach(() => {
    // Reset memfs volume before each test
    vol.reset();
    // Create base test directory
    vol.mkdirSync(testBaseDir, { recursive: true });
    service = new ArtifactService();
  });

  afterEach(() => {
    // Clean up memfs after each test
    vol.reset();
  });

  describe("createArtifact", () => {
    it("creates an initiative with proper directory structure", async () => {
      const initiative = scaffoldInitiative({
        title: "Test Initiative",
        createdBy: "Test User (test@example.com)",
        vision: "Test vision",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Success criterion"],
      });

      const filePath = await service.createArtifact({
        id: "A",
        artifact: initiative,
        slug: "test-initiative",
        baseDir: testBaseDir,
      });

      expect(filePath).toBe(
        path.join(testBaseDir, ".kodebase/artifacts/A.test-initiative/A.yml"),
      );

      // Verify file exists and can be read
      const content = await readArtifact(filePath);
      expect(content).toMatchObject({
        metadata: {
          title: "Test Initiative",
        },
      });
    });

    it("creates a milestone with proper directory structure", async () => {
      // First create parent initiative
      const initiative = scaffoldInitiative({
        title: "Parent Initiative",
        createdBy: "Test User (test@example.com)",
        vision: "Test vision",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Success criterion"],
      });

      await service.createArtifact({
        id: "A",
        artifact: initiative,
        slug: "parent-initiative",
        baseDir: testBaseDir,
      });

      // Now create milestone
      const milestone = scaffoldMilestone({
        title: "Test Milestone",
        createdBy: "Test User (test@example.com)",
        summary: "Test summary",
        deliverables: ["Deliverable 1"],
      });

      const filePath = await service.createArtifact({
        id: "A.1",
        artifact: milestone,
        slug: "test-milestone",
        baseDir: testBaseDir,
      });

      expect(filePath).toBe(
        path.join(
          testBaseDir,
          ".kodebase/artifacts/A.parent-initiative/A.1.test-milestone/A.1.yml",
        ),
      );

      // Verify file exists and can be read
      const content = await readArtifact(filePath);
      expect(content).toMatchObject({
        metadata: {
          title: "Test Milestone",
        },
      });
    });

    it("creates an issue with proper file location", async () => {
      // First create parent initiative and milestone
      const initiative = scaffoldInitiative({
        title: "Parent Initiative",
        createdBy: "Test User (test@example.com)",
        vision: "Test vision",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Success criterion"],
      });

      await service.createArtifact({
        id: "A",
        artifact: initiative,
        slug: "parent-initiative",
        baseDir: testBaseDir,
      });

      const milestone = scaffoldMilestone({
        title: "Test Milestone",
        createdBy: "Test User (test@example.com)",
        summary: "Test summary",
        deliverables: ["Deliverable 1"],
      });

      await service.createArtifact({
        id: "A.1",
        artifact: milestone,
        slug: "test-milestone",
        baseDir: testBaseDir,
      });

      // Now create issue
      const issue = scaffoldIssue({
        title: "Test Issue",
        createdBy: "Test User (test@example.com)",
        summary: "Test summary",
        acceptanceCriteria: ["Criterion 1"],
      });

      const filePath = await service.createArtifact({
        id: "A.1.1",
        artifact: issue,
        slug: "test-issue",
        baseDir: testBaseDir,
      });

      expect(filePath).toBe(
        path.join(
          testBaseDir,
          ".kodebase/artifacts/A.parent-initiative/A.1.test-milestone/A.1.1.test-issue.yml",
        ),
      );

      // Verify file exists and can be read
      const content = await readArtifact(filePath);
      expect(content).toMatchObject({
        metadata: {
          title: "Test Issue",
        },
      });
    });

    it("creates directory structure if it doesn't exist", async () => {
      const initiative = scaffoldInitiative({
        title: "Test Initiative",
        createdBy: "Test User (test@example.com)",
        vision: "Test vision",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Success criterion"],
      });

      const filePath = await service.createArtifact({
        id: "A",
        artifact: initiative,
        slug: "test-initiative",
        baseDir: testBaseDir,
      });

      // Verify directory was created
      const dirPath = path.dirname(filePath);
      const stats = vol.statSync(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe("getArtifact", () => {
    it("reads an existing initiative", async () => {
      // Create an initiative first
      const initiative = scaffoldInitiative({
        title: "Test Initiative",
        createdBy: "Test User (test@example.com)",
        vision: "Test vision",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Success criterion"],
      });

      await service.createArtifact({
        id: "A",
        artifact: initiative,
        slug: "test-initiative",
        baseDir: testBaseDir,
      });

      // Now read it back
      const retrieved = await service.getArtifact({
        id: "A",
        slug: "test-initiative",
        baseDir: testBaseDir,
      });

      expect(retrieved).toMatchObject({
        metadata: {
          title: "Test Initiative",
          created_by: "Test User (test@example.com)",
        },
        content: {
          vision: "Test vision",
        },
      });
    });

    it("reads an existing milestone", async () => {
      // Create initiative and milestone
      const initiative = scaffoldInitiative({
        title: "Parent Initiative",
        createdBy: "Test User (test@example.com)",
        vision: "Test vision",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Success criterion"],
      });

      await service.createArtifact({
        id: "A",
        artifact: initiative,
        slug: "parent-initiative",
        baseDir: testBaseDir,
      });

      const milestone = scaffoldMilestone({
        title: "Test Milestone",
        createdBy: "Test User (test@example.com)",
        summary: "Test summary",
        deliverables: ["Deliverable 1"],
      });

      await service.createArtifact({
        id: "A.1",
        artifact: milestone,
        slug: "test-milestone",
        baseDir: testBaseDir,
      });

      // Now read it back
      const retrieved = await service.getArtifact({
        id: "A.1",
        slug: "test-milestone",
        baseDir: testBaseDir,
      });

      expect(retrieved).toMatchObject({
        metadata: {
          title: "Test Milestone",
        },
        content: {
          summary: "Test summary",
        },
      });
    });

    it("reads an existing issue", async () => {
      // Create full hierarchy
      const initiative = scaffoldInitiative({
        title: "Parent Initiative",
        createdBy: "Test User (test@example.com)",
        vision: "Test vision",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Success criterion"],
      });

      await service.createArtifact({
        id: "A",
        artifact: initiative,
        slug: "parent-initiative",
        baseDir: testBaseDir,
      });

      const milestone = scaffoldMilestone({
        title: "Test Milestone",
        createdBy: "Test User (test@example.com)",
        summary: "Test summary",
        deliverables: ["Deliverable 1"],
      });

      await service.createArtifact({
        id: "A.1",
        artifact: milestone,
        slug: "test-milestone",
        baseDir: testBaseDir,
      });

      const issue = scaffoldIssue({
        title: "Test Issue",
        createdBy: "Test User (test@example.com)",
        summary: "Test summary",
        acceptanceCriteria: ["Criterion 1"],
      });

      await service.createArtifact({
        id: "A.1.1",
        artifact: issue,
        slug: "test-issue",
        baseDir: testBaseDir,
      });

      // Now read it back
      const retrieved = await service.getArtifact({
        id: "A.1.1",
        slug: "test-issue",
        baseDir: testBaseDir,
      });

      expect(retrieved).toMatchObject({
        metadata: {
          title: "Test Issue",
        },
        content: {
          summary: "Test summary",
        },
      });
    });

    it("throws ArtifactNotFoundError when artifact doesn't exist", async () => {
      await expect(
        service.getArtifact({
          id: "A",
          slug: "nonexistent",
          baseDir: testBaseDir,
        }),
      ).rejects.toThrow(ArtifactNotFoundError);
    });

    it("throws ArtifactNotFoundError with correct details", async () => {
      try {
        await service.getArtifact({
          id: "A",
          slug: "nonexistent",
          baseDir: testBaseDir,
        });
        expect.fail("Should have thrown ArtifactNotFoundError");
      } catch (error) {
        expect(error).toBeInstanceOf(ArtifactNotFoundError);
        expect((error as ArtifactNotFoundError).artifactId).toBe("A");
        expect((error as ArtifactNotFoundError).filePath).toContain(
          "A.nonexistent/A.yml",
        );
      }
    });

    it("re-throws non-ENOENT errors", async () => {
      // Create an initiative first
      const initiative = scaffoldInitiative({
        title: "Test Initiative",
        createdBy: "Test User (test@example.com)",
        vision: "Test vision",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Success criterion"],
      });

      await service.createArtifact({
        id: "A",
        artifact: initiative,
        slug: "test-initiative",
        baseDir: testBaseDir,
      });

      // Create a directory where the file should be to trigger EISDIR error
      const artifactPath = path.join(
        testBaseDir,
        ".kodebase/artifacts/A.test-initiative/A.yml",
      );
      vol.rmSync(artifactPath);
      vol.mkdirSync(artifactPath);

      // This should throw EISDIR or similar, not ArtifactNotFoundError
      await expect(
        service.getArtifact({
          id: "A",
          slug: "test-initiative",
          baseDir: testBaseDir,
        }),
      ).rejects.toThrow();

      // Verify it's NOT an ArtifactNotFoundError
      try {
        await service.getArtifact({
          id: "A",
          slug: "test-initiative",
          baseDir: testBaseDir,
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).not.toBeInstanceOf(ArtifactNotFoundError);
      }
    });
  });

  describe("updateMetadata", () => {
    it("updates metadata fields while preserving events", async () => {
      // Create an initiative
      const initiative = scaffoldInitiative({
        title: "Original Title",
        createdBy: "Test User (test@example.com)",
        priority: "low",
        vision: "Test vision",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Success criterion"],
      });

      await service.createArtifact({
        id: "A",
        artifact: initiative,
        slug: "test-initiative",
        baseDir: testBaseDir,
      });

      // Get original events
      const original = await service.getArtifact({
        id: "A",
        slug: "test-initiative",
        baseDir: testBaseDir,
      });
      const originalEvents = original.metadata.events;

      // Update metadata
      const updated = await service.updateMetadata({
        id: "A",
        slug: "test-initiative",
        baseDir: testBaseDir,
        updates: {
          title: "Updated Title",
          priority: "high",
        },
      });

      expect(updated.metadata.title).toBe("Updated Title");
      expect(updated.metadata.priority).toBe("high");
      expect(updated.metadata.events).toEqual(originalEvents);
    });

    it("preserves events even when updates include events key", async () => {
      // Create an initiative
      const initiative = scaffoldInitiative({
        title: "Original Title",
        createdBy: "Test User (test@example.com)",
        vision: "Test vision",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Success criterion"],
      });

      await service.createArtifact({
        id: "A",
        artifact: initiative,
        slug: "test-initiative",
        baseDir: testBaseDir,
      });

      // Get original events
      const original = await service.getArtifact({
        id: "A",
        slug: "test-initiative",
        baseDir: testBaseDir,
      });
      const originalEvents = original.metadata.events;

      // Attempt to update with events (should be ignored)
      const updated = await service.updateMetadata({
        id: "A",
        slug: "test-initiative",
        baseDir: testBaseDir,
        updates: {
          title: "Updated Title",
          // Testing that events are ignored even if provided in updates
          events: [] as never,
        },
      });

      expect(updated.metadata.title).toBe("Updated Title");
      expect(updated.metadata.events).toEqual(originalEvents);
      expect(updated.metadata.events.length).toBeGreaterThan(0);
    });

    it("throws ArtifactNotFoundError when artifact doesn't exist", async () => {
      await expect(
        service.updateMetadata({
          id: "A",
          slug: "nonexistent",
          baseDir: testBaseDir,
          updates: { title: "New Title" },
        }),
      ).rejects.toThrow(ArtifactNotFoundError);
    });

    it("updates multiple metadata fields at once", async () => {
      const initiative = scaffoldInitiative({
        title: "Original Title",
        createdBy: "Test User (test@example.com)",
        priority: "low",
        estimation: "S",
        vision: "Test vision",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Success criterion"],
      });

      await service.createArtifact({
        id: "A",
        artifact: initiative,
        slug: "test-initiative",
        baseDir: testBaseDir,
      });

      const updated = await service.updateMetadata({
        id: "A",
        slug: "test-initiative",
        baseDir: testBaseDir,
        updates: {
          title: "New Title",
          priority: "critical",
          estimation: "XL",
          assignee: "New User (new@example.com)",
        },
      });

      expect(updated.metadata.title).toBe("New Title");
      expect(updated.metadata.priority).toBe("critical");
      expect(updated.metadata.estimation).toBe("XL");
      expect(updated.metadata.assignee).toBe("New User (new@example.com)");
    });
  });

  describe("appendEvent", () => {
    it("appends a new event to the events array", async () => {
      const initiative = scaffoldInitiative({
        title: "Test Initiative",
        createdBy: "Test User (test@example.com)",
        vision: "Test vision",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Success criterion"],
      });

      await service.createArtifact({
        id: "A",
        artifact: initiative,
        slug: "test-initiative",
        baseDir: testBaseDir,
      });

      const originalEventsLength = initiative.metadata.events.length;

      const newEvent = {
        event: "ready" as const,
        timestamp: "2025-11-02T12:00:00Z",
        actor: "Test User (test@example.com)",
        trigger: "dependencies_met" as const,
      };

      const updated = await service.appendEvent({
        id: "A",
        slug: "test-initiative",
        baseDir: testBaseDir,
        event: newEvent,
      });

      expect(updated.metadata.events.length).toBe(originalEventsLength + 1);
      expect(
        updated.metadata.events[updated.metadata.events.length - 1],
      ).toEqual(newEvent);
    });

    it("maintains immutability of original events", async () => {
      const initiative = scaffoldInitiative({
        title: "Test Initiative",
        createdBy: "Test User (test@example.com)",
        vision: "Test vision",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Success criterion"],
      });

      await service.createArtifact({
        id: "A",
        artifact: initiative,
        slug: "test-initiative",
        baseDir: testBaseDir,
      });

      const original = await service.getArtifact({
        id: "A",
        slug: "test-initiative",
        baseDir: testBaseDir,
      });

      const originalFirstEvent = original.metadata.events[0];

      const newEvent = {
        event: "ready" as const,
        timestamp: "2025-11-02T12:00:00Z",
        actor: "Test User (test@example.com)",
        trigger: "dependencies_met" as const,
      };

      const updated = await service.appendEvent({
        id: "A",
        slug: "test-initiative",
        baseDir: testBaseDir,
        event: newEvent,
      });

      // Verify original event is unchanged
      expect(updated.metadata.events[0]).toEqual(originalFirstEvent);
      // Verify new event is at the end
      expect(
        updated.metadata.events[updated.metadata.events.length - 1],
      ).toEqual(newEvent);
    });

    it("appends multiple events sequentially", async () => {
      const initiative = scaffoldInitiative({
        title: "Test Initiative",
        createdBy: "Test User (test@example.com)",
        vision: "Test vision",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Success criterion"],
      });

      await service.createArtifact({
        id: "A",
        artifact: initiative,
        slug: "test-initiative",
        baseDir: testBaseDir,
      });

      const event1 = {
        event: "ready" as const,
        timestamp: "2025-11-02T12:00:00Z",
        actor: "Test User (test@example.com)",
        trigger: "dependencies_met" as const,
      };

      const event2 = {
        event: "in_progress" as const,
        timestamp: "2025-11-02T13:00:00Z",
        actor: "Test User (test@example.com)",
        trigger: "branch_created" as const,
      };

      await service.appendEvent({
        id: "A",
        slug: "test-initiative",
        baseDir: testBaseDir,
        event: event1,
      });

      const final = await service.appendEvent({
        id: "A",
        slug: "test-initiative",
        baseDir: testBaseDir,
        event: event2,
      });

      expect(final.metadata.events.length).toBe(3); // draft + event1 + event2
      expect(final.metadata.events[1]).toEqual(event1);
      expect(final.metadata.events[2]).toEqual(event2);
    });

    it("throws ArtifactNotFoundError when artifact doesn't exist", async () => {
      await expect(
        service.appendEvent({
          id: "A",
          slug: "nonexistent",
          baseDir: testBaseDir,
          event: {
            event: "ready",
            timestamp: "2025-11-02T12:00:00Z",
            actor: "Test User (test@example.com)",
            trigger: "dependencies_met",
          },
        }),
      ).rejects.toThrow(ArtifactNotFoundError);
    });
  });

  describe("YAML formatting", () => {
    it("produces YAML that matches core package conventions", async () => {
      const initiative = scaffoldInitiative({
        title: "Test Initiative",
        createdBy: "Test User (test@example.com)",
        vision:
          "Test vision with a long description that should not be wrapped",
        scopeIn: ["Feature A", "Feature B"],
        scopeOut: ["Feature C"],
        successCriteria: ["Criterion 1", "Criterion 2"],
      });

      const filePath = await service.createArtifact({
        id: "A",
        artifact: initiative,
        slug: "test-initiative",
        baseDir: testBaseDir,
      });

      // Read raw YAML content
      const yamlContent = vol.readFileSync(filePath, "utf8") as string;

      // Verify no line wrapping (lineWidth: 0)
      expect(yamlContent).toContain(
        "Test vision with a long description that should not be wrapped",
      );
      expect(yamlContent).not.toContain(">-"); // No folded scalars for short text
      expect(yamlContent).toContain("metadata:");
      expect(yamlContent).toContain("content:");
    });
  });

  describe("default parameters", () => {
    it("uses process.cwd() when baseDir is not provided", async () => {
      const initiative = scaffoldInitiative({
        title: "Test Initiative",
        createdBy: "Test User (test@example.com)",
        vision: "Test vision",
        scopeIn: ["Feature A"],
        scopeOut: ["Feature B"],
        successCriteria: ["Success criterion"],
      });

      // Mock process.cwd() to return our test directory
      const originalCwd = process.cwd;
      process.cwd = vi.fn(() => testBaseDir);

      try {
        const filePath = await service.createArtifact({
          id: "A",
          artifact: initiative,
          slug: "test-initiative",
          // No baseDir provided - should use process.cwd()
        });

        expect(filePath).toContain(testBaseDir);

        // Verify file was created
        const content = await readArtifact(filePath);
        expect(content).toMatchObject({
          metadata: {
            title: "Test Initiative",
          },
        });

        // Test getArtifact without baseDir
        const retrieved = await service.getArtifact({
          id: "A",
          slug: "test-initiative",
          // No baseDir provided
        });

        expect(retrieved).toMatchObject({
          metadata: {
            title: "Test Initiative",
          },
        });

        // Test updateMetadata without baseDir
        const updated = await service.updateMetadata({
          id: "A",
          slug: "test-initiative",
          // No baseDir provided
          updates: {
            title: "Updated Title",
          },
        });

        expect(updated.metadata.title).toBe("Updated Title");

        // Test appendEvent without baseDir
        const withEvent = await service.appendEvent({
          id: "A",
          slug: "test-initiative",
          // No baseDir provided
          event: {
            event: "ready",
            timestamp: "2025-11-02T12:00:00Z",
            actor: "Test User (test@example.com)",
            trigger: "dependencies_met",
          },
        });

        expect(withEvent.metadata.events.length).toBe(2);
      } finally {
        // Restore original cwd
        process.cwd = originalCwd;
      }
    });
  });
});
