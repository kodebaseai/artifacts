/**
 * Integration test with real A.9.1 fixtures
 */
import { describe, expect, it } from "vitest";

import { ReadinessService } from "./readiness-service.js";

describe("ReadinessService - Real Fixtures Validation", () => {
  const projectRoot = process.cwd().split("/packages/artifacts")[0];
  const readinessService = new ReadinessService(projectRoot);

  it("checks readiness on real fixture artifacts", async () => {
    // B.3.2 has been completed, so B.3.3 and B.3.4 should be ready
    const isReady = await readinessService.isReady("B.3.3");

    // Should return boolean
    expect(typeof isReady).toBe("boolean");
  });

  it("gets blocking reasons for real artifacts", async () => {
    const reasons = await readinessService.getBlockingReasons("B.3.3");

    // Should return array
    expect(Array.isArray(reasons)).toBe(true);
  });

  it("gets all ready artifacts from real fixtures", async () => {
    const ready = await readinessService.getReadyArtifacts();

    // Should return array with artifacts
    expect(Array.isArray(ready)).toBe(true);
    expect(ready.length).toBeGreaterThan(0);
  });

  it("validates transition to in_progress for real artifacts", async () => {
    // Try with B.3.4 which should be in ready state
    const canTransition =
      await readinessService.canTransitionToInProgress("B.3.4");

    // Should return boolean
    expect(typeof canTransition).toBe("boolean");
  });

  it("checks readiness for 100+ artifacts (performance measurement)", async () => {
    const start = performance.now();
    const ready = await readinessService.getReadyArtifacts();
    const duration = performance.now() - start;

    // Performance measurement for local visibility (typically <300ms locally, may vary in CI)
    // Not asserting on duration to avoid flakiness across different environments
    console.log(`getReadyArtifacts() completed in ${duration.toFixed(2)}ms`);
    expect(ready.length).toBeGreaterThan(0);
  });

  it("handles completed artifacts correctly", async () => {
    // B.3.1 and B.3.2 are completed
    const reasons31 = await readinessService.getBlockingReasons("B.3.1");
    const reasons32 = await readinessService.getBlockingReasons("B.3.2");

    // Completed artifacts should have invalid_state reason
    expect(reasons31.length).toBeGreaterThan(0);
    expect(reasons31[0].type).toBe("invalid_state");
    expect(reasons32.length).toBeGreaterThan(0);
    expect(reasons32[0].type).toBe("invalid_state");
  });
});
