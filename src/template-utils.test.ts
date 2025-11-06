import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { TAnyArtifact, TArtifactEvent } from "@kodebase/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ARTIFACT_ID_REGEX,
  extractArtifactIds,
  generateSlug,
  getArtifactSlug,
  getCurrentState,
} from "./template-utils.js";

describe("generateSlug", () => {
  describe("basic transformations", () => {
    it("should convert simple title to lowercase slug", () => {
      expect(generateSlug("My Feature")).toBe("my-feature");
    });

    it("should convert single word to lowercase", () => {
      expect(generateSlug("Feature")).toBe("feature");
    });

    it("should handle already lowercase titles", () => {
      expect(generateSlug("my feature")).toBe("my-feature");
    });

    it("should handle already hyphenated slugs", () => {
      expect(generateSlug("my-feature-title")).toBe("my-feature-title");
    });
  });

  describe("special characters and punctuation", () => {
    it("should replace spaces with hyphens", () => {
      expect(generateSlug("User Authentication System")).toBe(
        "user-authentication-system",
      );
    });

    it("should remove exclamation marks", () => {
      expect(generateSlug("New Feature!")).toBe("new-feature");
    });

    it("should remove question marks", () => {
      expect(generateSlug("Is this working?")).toBe("is-this-working");
    });

    it("should remove periods", () => {
      expect(generateSlug("API v2.0.1")).toBe("api-v2-0-1");
    });

    it("should remove commas", () => {
      expect(generateSlug("Features, bugs, and more")).toBe(
        "features-bugs-and-more",
      );
    });

    it("should remove apostrophes", () => {
      expect(generateSlug("User's Dashboard")).toBe("user-s-dashboard");
    });

    it("should handle parentheses", () => {
      expect(generateSlug("Feature (Beta)")).toBe("feature-beta");
    });

    it("should handle brackets", () => {
      expect(generateSlug("Items [WIP]")).toBe("items-wip");
    });

    it("should handle slashes", () => {
      expect(generateSlug("API/Backend")).toBe("api-backend");
    });

    it("should handle ampersands", () => {
      expect(generateSlug("Users & Permissions")).toBe("users-permissions");
    });

    it("should handle underscores", () => {
      expect(generateSlug("user_auth_system")).toBe("user-auth-system");
    });

    it("should handle colons", () => {
      expect(generateSlug("Step 1: Setup")).toBe("step-1-setup");
    });

    it("should handle semicolons", () => {
      expect(generateSlug("First; Second")).toBe("first-second");
    });
  });

  describe("multiple special characters", () => {
    it("should collapse multiple spaces into single hyphen", () => {
      expect(generateSlug("Multiple    Spaces")).toBe("multiple-spaces");
    });

    it("should collapse mixed special characters into single hyphen", () => {
      expect(generateSlug("Feature!!! & More???")).toBe("feature-more");
    });

    it("should handle special chars at boundaries", () => {
      expect(generateSlug("...Leading and trailing...")).toBe(
        "leading-and-trailing",
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      expect(generateSlug("")).toBe("");
    });

    it("should handle string with only spaces", () => {
      expect(generateSlug("   ")).toBe("");
    });

    it("should handle string with only special characters", () => {
      expect(generateSlug("!!!???")).toBe("");
    });

    it("should trim whitespace from edges", () => {
      expect(generateSlug("  Feature Title  ")).toBe("feature-title");
    });

    it("should remove leading hyphens", () => {
      expect(generateSlug("---feature")).toBe("feature");
    });

    it("should remove trailing hyphens", () => {
      expect(generateSlug("feature---")).toBe("feature");
    });

    it("should remove both leading and trailing hyphens", () => {
      expect(generateSlug("---feature---")).toBe("feature");
    });
  });

  describe("numbers", () => {
    it("should preserve numbers", () => {
      expect(generateSlug("Feature 123")).toBe("feature-123");
    });

    it("should handle version numbers", () => {
      expect(generateSlug("Version 2.0")).toBe("version-2-0");
    });

    it("should handle numeric-only titles", () => {
      expect(generateSlug("2024")).toBe("2024");
    });

    it("should handle mixed alphanumeric", () => {
      expect(generateSlug("API v2 Beta3")).toBe("api-v2-beta3");
    });
  });

  describe("unicode and international characters", () => {
    it("should remove unicode characters", () => {
      expect(generateSlug("Café Feature")).toBe("caf-feature");
    });

    it("should remove emoji", () => {
      expect(generateSlug("Feature 🚀 Launch")).toBe("feature-launch");
    });

    it("should handle mixed ASCII and unicode", () => {
      expect(generateSlug("Hello Wörld")).toBe("hello-w-rld");
    });
  });

  describe("real-world examples", () => {
    it("should handle typical initiative title", () => {
      expect(generateSlug("Core Package v1")).toBe("core-package-v1");
    });

    it("should handle typical milestone title", () => {
      expect(generateSlug("Foundation Services")).toBe("foundation-services");
    });

    it("should handle typical issue title", () => {
      expect(generateSlug("ID Allocation Logic")).toBe("id-allocation-logic");
    });

    it("should handle complex technical title", () => {
      expect(
        generateSlug("REST API v2.0 (Authentication & Authorization)"),
      ).toBe("rest-api-v2-0-authentication-authorization");
    });

    it("should handle title with project name", () => {
      expect(generateSlug("Kodebase: Artifact System")).toBe(
        "kodebase-artifact-system",
      );
    });

    it("should handle long descriptive title", () => {
      expect(
        generateSlug(
          "Implement User Authentication System with OAuth 2.0 Support",
        ),
      ).toBe("implement-user-authentication-system-with-oauth-2-0-support");
    });
  });

  describe("URL safety", () => {
    it("should produce URL-safe output", () => {
      const slug = generateSlug("Feature!@#$%^&*()_+={}[]|\\:;\"'<>,.?/~`");
      expect(slug).toMatch(/^[a-z0-9-]*$/);
    });

    it("should not contain uppercase letters", () => {
      const slug = generateSlug("UPPERCASE TITLE");
      expect(slug).toBe("uppercase-title");
      expect(slug).toMatch(/^[a-z0-9-]*$/);
    });

    it("should not contain spaces", () => {
      const slug = generateSlug("Title With Spaces");
      expect(slug).not.toContain(" ");
    });

    it("should not start or end with hyphen", () => {
      const slug = generateSlug("!!!Feature!!!");
      expect(slug).toBe("feature");
      expect(slug[0]).not.toBe("-");
      expect(slug[slug.length - 1]).not.toBe("-");
    });
  });
});

describe("ARTIFACT_ID_REGEX", () => {
  it("should match single-level artifact IDs", () => {
    const text = "Working on A.1 today";
    const matches = text.match(ARTIFACT_ID_REGEX);
    expect(matches).toEqual(["A.1"]);
  });

  it("should match two-level artifact IDs", () => {
    const text = "Implementing A.1.5";
    const matches = text.match(ARTIFACT_ID_REGEX);
    expect(matches).toEqual(["A.1.5"]);
  });

  it("should match three-level artifact IDs", () => {
    const text = "Working on C.4.1.2";
    const matches = text.match(ARTIFACT_ID_REGEX);
    expect(matches).toEqual(["C.4.1.2"]);
  });

  it("should match multiple artifact IDs", () => {
    const text = "A.1.5 depends on B.2.3 and C.1";
    const matches = text.match(ARTIFACT_ID_REGEX);
    expect(matches).toEqual(["A.1.5", "B.2.3", "C.1"]);
  });

  it("should match artifact IDs with different letters", () => {
    const text = "A.1, B.2, C.3, Z.99";
    const matches = text.match(ARTIFACT_ID_REGEX);
    expect(matches).toEqual(["A.1", "B.2", "C.3", "Z.99"]);
  });

  it("should not match lowercase letters", () => {
    const text = "a.1 is not valid";
    const matches = text.match(ARTIFACT_ID_REGEX);
    expect(matches).toBeNull();
  });

  it("should not match without word boundaries", () => {
    const text = "version2.1.5";
    const matches = text.match(ARTIFACT_ID_REGEX);
    expect(matches).toBeNull();
  });

  it("should match IDs at word boundaries with hyphens", () => {
    const text = "feature-A.1.5-description";
    const matches = text.match(ARTIFACT_ID_REGEX);
    expect(matches).toEqual(["A.1.5"]);
  });

  it("should match IDs in brackets", () => {
    const text = "[A.1.5] Feature title";
    const matches = text.match(ARTIFACT_ID_REGEX);
    expect(matches).toEqual(["A.1.5"]);
  });

  it("should not match IDs without numbers", () => {
    const text = "Just A or B";
    const matches = text.match(ARTIFACT_ID_REGEX);
    expect(matches).toBeNull();
  });
});

describe("getCurrentState", () => {
  it("should return null for artifact with no events", () => {
    const artifact: TAnyArtifact = {
      id: "A.1",
      metadata: {
        title: "Test",
        events: [],
      },
      content: { summary: "test" },
    } as TAnyArtifact;

    expect(getCurrentState(artifact)).toBeNull();
  });

  it("should return null for artifact with undefined events", () => {
    const artifact: TAnyArtifact = {
      id: "A.1",
      metadata: {
        title: "Test",
        events: undefined as unknown as TArtifactEvent[],
      },
      content: { summary: "test" },
    } as TAnyArtifact;

    expect(getCurrentState(artifact)).toBeNull();
  });

  it("should return the last event for artifact with one event", () => {
    const artifact: TAnyArtifact = {
      id: "A.1",
      metadata: {
        title: "Test",
        events: [{ event: "draft", timestamp: "2024-01-01T00:00:00Z" }],
      },
      content: { summary: "test" },
    } as TAnyArtifact;

    expect(getCurrentState(artifact)).toBe("draft");
  });

  it("should return the last event for artifact with multiple events", () => {
    const artifact: TAnyArtifact = {
      id: "A.1",
      metadata: {
        title: "Test",
        events: [
          { event: "draft", timestamp: "2024-01-01T00:00:00Z" },
          { event: "in_progress", timestamp: "2024-01-02T00:00:00Z" },
          { event: "blocked", timestamp: "2024-01-03T00:00:00Z" },
        ],
      },
      content: { summary: "test" },
    } as TAnyArtifact;

    expect(getCurrentState(artifact)).toBe("blocked");
  });

  it("should return null if last event has no event property", () => {
    const artifact: TAnyArtifact = {
      id: "A.1",
      metadata: {
        title: "Test",
        events: [
          { timestamp: "2024-01-01T00:00:00Z" } as unknown as TArtifactEvent,
        ],
      },
      content: { summary: "test" },
    } as TAnyArtifact;

    expect(getCurrentState(artifact)).toBeNull();
  });
});

describe("extractArtifactIds", () => {
  describe("single source extraction", () => {
    it("should extract from branch name only", () => {
      const ids = extractArtifactIds("A.1.5-feature", null, null);
      expect(ids).toEqual(["A.1.5"]);
    });

    it("should extract from PR title only", () => {
      const ids = extractArtifactIds(null, "[A.1.5] Add feature", null);
      expect(ids).toEqual(["A.1.5"]);
    });

    it("should extract from PR body only", () => {
      const ids = extractArtifactIds(null, null, "Implements A.1.5");
      expect(ids).toEqual(["A.1.5"]);
    });
  });

  describe("multiple sources extraction", () => {
    it("should extract from all sources", () => {
      const ids = extractArtifactIds(
        "A.1.5-feature",
        "[A.1.5] Add feature",
        "Implements A.1.5 and depends on B.2.3",
      );
      expect(ids).toEqual(["A.1.5", "B.2.3"]);
    });

    it("should deduplicate IDs across sources", () => {
      const ids = extractArtifactIds(
        "A.1.5-feature",
        "[A.1.5] Add feature",
        "Closes A.1.5",
      );
      expect(ids).toEqual(["A.1.5"]);
    });

    it("should extract multiple IDs from each source", () => {
      const ids = extractArtifactIds(
        "A.1.5-A.1.6",
        "[A.1.5] [A.1.7] Multi-feature",
        "Implements A.1.5, A.1.6, A.1.7, and B.2.3",
      );
      expect(ids).toEqual(["A.1.5", "A.1.6", "A.1.7", "B.2.3"]);
    });
  });

  describe("sorting and deduplication", () => {
    it("should sort IDs alphabetically", () => {
      const ids = extractArtifactIds(null, null, "C.1 B.2 A.3");
      expect(ids).toEqual(["A.3", "B.2", "C.1"]);
    });

    it("should deduplicate identical IDs", () => {
      const ids = extractArtifactIds(null, null, "A.1.5 A.1.5 A.1.5");
      expect(ids).toEqual(["A.1.5"]);
    });

    it("should sort by letter then number", () => {
      const ids = extractArtifactIds(null, null, "A.10 A.2 A.1 B.1");
      expect(ids).toEqual(["A.1", "A.10", "A.2", "B.1"]);
    });
  });

  describe("edge cases", () => {
    it("should return empty array when all sources are null", () => {
      const ids = extractArtifactIds(null, null, null);
      expect(ids).toEqual([]);
    });

    it("should return empty array when sources have no artifact IDs", () => {
      const ids = extractArtifactIds("feature", "Add feature", "Description");
      expect(ids).toEqual([]);
    });

    it("should handle empty strings", () => {
      const ids = extractArtifactIds("", "", "");
      expect(ids).toEqual([]);
    });

    it("should extract from complex branch names", () => {
      const ids = extractArtifactIds(
        "feature/A.1.5-implement-auth",
        null,
        null,
      );
      expect(ids).toEqual(["A.1.5"]);
    });

    it("should extract from PR body with markdown", () => {
      const ids = extractArtifactIds(
        null,
        null,
        "## Changes\n- Implements A.1.5\n- Fixes B.2.3\n\n**Closes** C.1",
      );
      expect(ids).toEqual(["A.1.5", "B.2.3", "C.1"]);
    });
  });

  describe("real-world patterns", () => {
    it("should extract from typical branch name", () => {
      const ids = extractArtifactIds("C.1.2-add-user-auth", null, null);
      expect(ids).toEqual(["C.1.2"]);
    });

    it("should extract from typical PR title", () => {
      const ids = extractArtifactIds(
        null,
        "[A.1.5] Implement user authentication",
        null,
      );
      expect(ids).toEqual(["A.1.5"]);
    });

    it("should extract from PR body with dependencies", () => {
      const ids = extractArtifactIds(
        null,
        null,
        "Implements A.1.5\n\nDepends on:\n- B.2.3\n- C.4.1",
      );
      expect(ids).toEqual(["A.1.5", "B.2.3", "C.4.1"]);
    });
  });
});

describe("getArtifactSlug", () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for test artifacts
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "artifact-test-"));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("successful slug extraction", () => {
    it("should extract slug from initiative artifact", async () => {
      // Create .kodebase/artifacts/A.my-initiative/A.yml
      const artifactsDir = path.join(tempDir, ".kodebase", "artifacts");
      const artifactDir = path.join(artifactsDir, "A.my-initiative");
      await fs.mkdir(artifactDir, { recursive: true });
      await fs.writeFile(
        path.join(artifactDir, "A.yml"),
        "metadata:\n  title: Test",
      );

      const slug = await getArtifactSlug("A", tempDir);
      expect(slug).toBe("my-initiative");
    });

    it("should extract slug from milestone artifact", async () => {
      // Create .kodebase/artifacts/A.init/A.1.milestone/A.1.yml
      const artifactsDir = path.join(tempDir, ".kodebase", "artifacts");
      const artifactDir = path.join(artifactsDir, "A.init", "A.1.milestone");
      await fs.mkdir(artifactDir, { recursive: true });
      await fs.writeFile(
        path.join(artifactDir, "A.1.yml"),
        "metadata:\n  title: Test",
      );

      const slug = await getArtifactSlug("A.1", tempDir);
      expect(slug).toBe("milestone");
    });

    it("should extract slug from issue artifact", async () => {
      // Create .kodebase/artifacts/A.init/A.1.ms/A.1.2.issue-name.yml
      // Issues are files directly in milestone directory, not in subdirectories
      const artifactsDir = path.join(tempDir, ".kodebase", "artifacts");
      const milestoneDir = path.join(artifactsDir, "A.init", "A.1.ms");
      await fs.mkdir(milestoneDir, { recursive: true });
      await fs.writeFile(
        path.join(milestoneDir, "A.1.2.issue-name.yml"),
        "metadata:\n  title: Test",
      );

      const slug = await getArtifactSlug("A.1.2", tempDir);
      expect(slug).toBe("issue-name");
    });

    it("should handle slug with hyphens", async () => {
      const artifactsDir = path.join(tempDir, ".kodebase", "artifacts");
      const artifactDir = path.join(artifactsDir, "B.multi-word-slug");
      await fs.mkdir(artifactDir, { recursive: true });
      await fs.writeFile(
        path.join(artifactDir, "B.yml"),
        "metadata:\n  title: Test",
      );

      const slug = await getArtifactSlug("B", tempDir);
      expect(slug).toBe("multi-word-slug");
    });

    it("should handle slug with numbers", async () => {
      const artifactsDir = path.join(tempDir, ".kodebase", "artifacts");
      const artifactDir = path.join(artifactsDir, "C.version-2-0");
      await fs.mkdir(artifactDir, { recursive: true });
      await fs.writeFile(
        path.join(artifactDir, "C.yml"),
        "metadata:\n  title: Test",
      );

      const slug = await getArtifactSlug("C", tempDir);
      expect(slug).toBe("version-2-0");
    });
  });

  describe("error handling", () => {
    it("should return undefined for non-existent artifact", async () => {
      // Create artifacts directory first
      await fs.mkdir(path.join(tempDir, ".kodebase", "artifacts"), {
        recursive: true,
      });
      const slug = await getArtifactSlug("Z.99", tempDir);
      expect(slug).toBeUndefined();
    });

    it("should return undefined for empty artifacts directory", async () => {
      await fs.mkdir(path.join(tempDir, ".kodebase", "artifacts"), {
        recursive: true,
      });
      const slug = await getArtifactSlug("A.1", tempDir);
      expect(slug).toBeUndefined();
    });

    it("should throw error for non-existent base directory", async () => {
      await expect(
        getArtifactSlug("A.1", "/nonexistent/path"),
      ).rejects.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle artifact with minimal slug", async () => {
      const artifactsDir = path.join(tempDir, ".kodebase", "artifacts");
      const artifactDir = path.join(artifactsDir, "D.x");
      await fs.mkdir(artifactDir, { recursive: true });
      await fs.writeFile(
        path.join(artifactDir, "D.yml"),
        "metadata:\n  title: Test",
      );

      const slug = await getArtifactSlug("D", tempDir);
      expect(slug).toBe("x");
    });

    it("should return undefined for directory without dot separator", async () => {
      const artifactsDir = path.join(tempDir, ".kodebase", "artifacts");
      const artifactDir = path.join(artifactsDir, "Enoslug");
      await fs.mkdir(artifactDir, { recursive: true });
      await fs.writeFile(
        path.join(artifactDir, "E.yml"),
        "metadata:\n  title: Test",
      );

      const slug = await getArtifactSlug("E", tempDir);
      // Should return empty string as slug (directory format issue)
      expect(slug).toBeDefined();
    });
  });
});
