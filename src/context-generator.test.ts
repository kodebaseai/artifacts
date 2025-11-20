/**
 * Tests for context generation utility
 */

import {
  scaffoldInitiative,
  scaffoldIssue,
  scaffoldMilestone,
} from "@kodebase/core";

vi.mock("node:fs/promises", async () => {
  const { fs } = await import("memfs");
  const api = fs.promises as unknown as Record<string, unknown>;
  // biome-ignore lint/suspicious/noExplicitAny: memfs mock requires any for proper type inference
  return { default: api, ...api } as any;
});

import { vol } from "memfs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArtifactService } from "./artifact-service.js";
import { generateArtifactContext } from "./context-generator.js";

describe("generateArtifactContext", () => {
  const testBaseDir = "/test-workspace";
  let artifactService: ArtifactService;

  beforeEach(() => {
    // Reset memfs volume before each test
    vol.reset();
    // Create base test directory
    vol.mkdirSync(testBaseDir, { recursive: true });
    artifactService = new ArtifactService();
  });

  afterEach(() => {
    // Clean up memfs after each test
    vol.reset();
  });

  /**
   * Helper to create test artifact hierarchy
   */
  async function createTestHierarchy() {
    // Create Initiative A
    const initiative = scaffoldInitiative({
      title: "Core Platform",
      createdBy: "Alice (alice@example.com)",
      assignee: "Alice (alice@example.com)",
      priority: "high",
      estimation: "XL",
      vision: "Build a scalable core platform for all services",
      scopeIn: ["Authentication", "Authorization", "API Gateway"],
      scopeOut: ["Frontend UI", "Mobile apps"],
      successCriteria: [
        "Platform handles 10k requests/second",
        "99.9% uptime SLA achieved",
      ],
    });

    await artifactService.createArtifact({
      id: "A",
      artifact: initiative,
      slug: "core-platform",
      baseDir: testBaseDir,
    });

    // Create Milestone A.1
    const milestone = scaffoldMilestone({
      title: "Authentication System",
      createdBy: "Alice (alice@example.com)",
      assignee: "Alice (alice@example.com)",
      priority: "critical",
      estimation: "L",
      summary: "Implement secure authentication with OAuth2 and JWT",
      deliverables: [
        "OAuth2 provider integration",
        "JWT token generation and validation",
      ],
      validation: [
        "OAuth2 flow works with Google and GitHub",
        "JWT tokens properly signed and validated",
      ],
    });

    await artifactService.createArtifact({
      id: "A.1",
      artifact: milestone,
      slug: "authentication-system",
      baseDir: testBaseDir,
    });

    // Create Issue A.1.1
    const issue1 = scaffoldIssue({
      title: "Implement OAuth2 flow",
      createdBy: "Bob (bob@example.com)",
      assignee: "Bob (bob@example.com)",
      priority: "critical",
      estimation: "M",
      summary: "Implement OAuth2 authorization code flow with PKCE",
      acceptanceCriteria: [
        "User can login with Google",
        "User can login with GitHub",
        "Refresh token flow works",
      ],
    });

    await artifactService.createArtifact({
      id: "A.1.1",
      artifact: issue1,
      slug: "implement-oauth2-flow",
      baseDir: testBaseDir,
    });

    // Create Issue A.1.2
    const issue2 = scaffoldIssue({
      title: "Add JWT token validation",
      createdBy: "Bob (bob@example.com)",
      assignee: "Bob (bob@example.com)",
      priority: "high",
      estimation: "S",
      summary: "Validate JWT tokens on protected endpoints",
      acceptanceCriteria: [
        "Tokens are validated on every protected request",
        "Expired tokens are rejected",
      ],
    });

    await artifactService.createArtifact({
      id: "A.1.2",
      artifact: issue2,
      slug: "add-jwt-token-validation",
      baseDir: testBaseDir,
    });
  }

  describe("Basic Context Generation", () => {
    it("should generate context for an issue with full hierarchy", async () => {
      await createTestHierarchy();

      const context = await generateArtifactContext("A.1.1", {
        baseDir: testBaseDir,
        includeParents: true,
      });

      // Check header
      expect(context).toContain("# Artifact A.1.1: Implement OAuth2 flow");

      // Check parent context
      expect(context).toContain("## Parent Context");
      expect(context).toContain("**Initiative A:** Core Platform");
      expect(context).toContain(
        "Build a scalable core platform for all services",
      );
      expect(context).toContain("**Milestone A.1:** Authentication System");
      expect(context).toContain(
        "Implement secure authentication with OAuth2 and JWT",
      );

      // Check description
      expect(context).toContain("## Description");
      expect(context).toContain(
        "Implement OAuth2 authorization code flow with PKCE",
      );

      // Check acceptance criteria
      expect(context).toContain("## Acceptance Criteria");
      expect(context).toContain("- User can login with Google");
      expect(context).toContain("- User can login with GitHub");
      expect(context).toContain("- Refresh token flow works");

      // Relationships are empty by default (would need updateMetadata to add them)
      // So we skip checking for relationships in this test

      // Check metadata
      expect(context).toContain("## Metadata");
      expect(context).toContain("- **Priority:** critical");
      expect(context).toContain("- **Estimation:** M");
      expect(context).toContain("- **Assignee:** Bob (bob@example.com)");

      // Check footer
      expect(context).toContain("---");
      expect(context).toContain("*Context generated by Kodebase*");
    });

    it("should generate context without parent context when disabled", async () => {
      await createTestHierarchy();

      const context = await generateArtifactContext("A.1.1", {
        baseDir: testBaseDir,
        includeParents: false,
      });

      // Should not contain parent context
      expect(context).not.toContain("## Parent Context");
      expect(context).not.toContain("**Initiative A:**");
      expect(context).not.toContain("**Milestone A.1:**");

      // Should still contain everything else
      expect(context).toContain("# Artifact A.1.1: Implement OAuth2 flow");
      expect(context).toContain("## Description");
      expect(context).toContain("## Acceptance Criteria");
    });

    it("should handle artifacts without relationships section when empty", async () => {
      await createTestHierarchy();

      const context = await generateArtifactContext("A.1.2", {
        baseDir: testBaseDir,
      });

      // Relationships are empty by default, so section should not appear
      expect(context).not.toContain("## Relationships");
    });
  });

  describe("Different Artifact Types", () => {
    it("should generate context for a milestone with validation criteria", async () => {
      await createTestHierarchy();

      const context = await generateArtifactContext("A.1", {
        baseDir: testBaseDir,
        includeParents: true,
      });

      expect(context).toContain("# Artifact A.1: Authentication System");
      expect(context).toContain("## Validation Criteria");
      expect(context).toContain("- OAuth2 flow works with Google and GitHub");
      expect(context).toContain("- JWT tokens properly signed and validated");
    });

    it("should generate context for an initiative with success criteria", async () => {
      await createTestHierarchy();

      const context = await generateArtifactContext("A", {
        baseDir: testBaseDir,
        includeParents: false, // Initiative has no parents
      });

      expect(context).toContain("# Artifact A: Core Platform");
      expect(context).toContain("## Success Criteria");
      expect(context).toContain("- Platform handles 10k requests/second");
      expect(context).toContain("- 99.9% uptime SLA achieved");
      expect(context).toContain("- **Priority:** high");
      expect(context).toContain("- **Estimation:** XL");
    });
  });

  describe("Edge Cases", () => {
    it("should throw error for non-existent artifact", async () => {
      await createTestHierarchy();

      await expect(
        generateArtifactContext("Z.9.9", { baseDir: testBaseDir }),
      ).rejects.toThrow("Artifact Z.9.9 not found");
    });

    it("should handle artifacts with no relationships", async () => {
      // Create a simple initiative with no relationships
      const initiative = scaffoldInitiative({
        title: "Simple Initiative",
        createdBy: "Test User (test@example.com)",
        priority: "low",
        estimation: "S",
        vision: "A simple test initiative",
        scopeIn: ["Scope in item"],
        scopeOut: ["Scope out item"],
        successCriteria: ["Complete the test"],
      });

      await artifactService.createArtifact({
        id: "A",
        artifact: initiative,
        slug: "simple-initiative",
        baseDir: testBaseDir,
      });

      const context = await generateArtifactContext("A", {
        baseDir: testBaseDir,
      });

      // Should not have relationships section
      expect(context).not.toContain("## Relationships");
    });
  });

  describe("Markdown Formatting", () => {
    it("should use proper markdown headers", async () => {
      await createTestHierarchy();

      const context = await generateArtifactContext("A.1.1", {
        baseDir: testBaseDir,
      });

      // Check header hierarchy
      expect(context).toMatch(/^# Artifact A\.1\.1:/m);
      expect(context).toMatch(/^## Parent Context$/m);
      expect(context).toMatch(/^## Description$/m);
      expect(context).toMatch(/^## Acceptance Criteria$/m);
      expect(context).toMatch(/^## Metadata$/m);
      // Note: Relationships not checked as they're empty by default
    });

    it("should format lists with proper bullet points", async () => {
      await createTestHierarchy();

      const context = await generateArtifactContext("A.1.1", {
        baseDir: testBaseDir,
      });

      // Check bullet point formatting
      const lines = context.split("\n");
      const criteriaLines = lines.filter((line) =>
        line.startsWith("- User can login"),
      );
      expect(criteriaLines.length).toBeGreaterThan(0);
    });

    it("should use bold for metadata labels", async () => {
      await createTestHierarchy();

      const context = await generateArtifactContext("A.1.1", {
        baseDir: testBaseDir,
      });

      expect(context).toContain("- **Priority:**");
      expect(context).toContain("- **Estimation:**");
      expect(context).toContain("- **Assignee:**");
    });
  });
});
