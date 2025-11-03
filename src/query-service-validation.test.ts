/**
 * Integration test with real A.9.1 fixtures
 */
import { describe, expect, it } from "vitest";

import { QueryService } from "./query-service.js";

describe("QueryService - Real Fixtures Validation", () => {
  const projectRoot = process.cwd().split("/packages/artifacts")[0];
  const queryService = new QueryService(projectRoot);

  it("loads real artifact tree from A.9.1", async () => {
    const tree = await queryService.getTree();

    // Should have at least initiative A and B
    expect(tree.children.length).toBeGreaterThanOrEqual(2);

    // Find initiative A
    const initiativeA = tree.children.find((node) => node.id === "A");
    expect(initiativeA).toBeDefined();
    expect(initiativeA?.artifact.metadata.title).toBeDefined();
  });

  it("gets children of initiative A", async () => {
    const children = await queryService.getChildren("A");

    // Initiative A should have milestones
    expect(children.length).toBeGreaterThan(0);
    expect(children.every((item) => item.id.startsWith("A."))).toBe(true);
  });

  it("gets children of a real milestone", async () => {
    // First get milestones under A
    const milestones = await queryService.getChildren("A");

    if (milestones.length > 0) {
      // Get issues under the first milestone
      const issues = await queryService.getChildren(milestones[0].id);

      // If there are issues, they should all start with the milestone ID
      if (issues.length > 0) {
        expect(
          issues.every((item) => item.id.startsWith(`${milestones[0].id}.`)),
        ).toBe(true);
      }
    }
  });

  it("gets ancestors of a real issue", async () => {
    // Get all milestones
    const initiatives = await queryService.getChildren("A");

    for (const initiative of initiatives) {
      const milestones = await queryService.getChildren(initiative.id);

      for (const milestone of milestones) {
        const issues = await queryService.getChildren(milestone.id);

        if (issues.length > 0) {
          // Get ancestors of first issue
          const ancestors = await queryService.getAncestors(issues[0].id);

          // Should have 2 ancestors: initiative and milestone
          expect(ancestors.length).toBe(2);
          expect(ancestors[0].id).toBe(initiative.id);
          expect(ancestors[1].id).toBe(milestone.id);
          return; // Test passed
        }
      }
    }
  });

  it("gets siblings of a real artifact", async () => {
    const milestones = await queryService.getChildren("A");

    if (milestones.length > 1) {
      // Get siblings of first milestone
      const siblings = await queryService.getSiblings(milestones[0].id);

      // Should have at least one sibling
      expect(siblings.length).toBeGreaterThan(0);

      // None should be the artifact itself
      expect(siblings.every((item) => item.id !== milestones[0].id)).toBe(true);

      // All should be milestones under A
      expect(siblings.every((item) => item.id.startsWith("A."))).toBe(true);
    }
  });

  it("caches artifacts for performance", async () => {
    // Clear cache first
    queryService.clearCache();

    // First load - cold cache
    const start1 = performance.now();
    await queryService.getChildren("A");
    const duration1 = performance.now() - start1;

    // Second load - warm cache
    const start2 = performance.now();
    await queryService.getChildren("A");
    const duration2 = performance.now() - start2;

    // Cached load should be significantly faster
    expect(duration2).toBeLessThan(duration1 * 0.5);
  });
});
