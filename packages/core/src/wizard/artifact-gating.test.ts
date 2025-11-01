import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { isAncestorBlockedOrCancelled } from "./artifact-gating.js";

describe("isAncestorBlockedOrCancelled", () => {
  describe("clean parent chain (no blocking)", () => {
    it("returns false when all parents are in healthy states", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-gating-"));
      try {
        // Create initiative A (in_progress)
        const initiativeDir = path.join(tempDir, "A.test-initiative");
        await fs.mkdir(initiativeDir, { recursive: true });
        await fs.writeFile(
          path.join(initiativeDir, "A.yml"),
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

        // Create milestone A.1 (ready)
        const milestoneDir = path.join(initiativeDir, "A.1.test-milestone");
        await fs.mkdir(milestoneDir, { recursive: true });
        await fs.writeFile(
          path.join(milestoneDir, "A.1.yml"),
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

        const result = await isAncestorBlockedOrCancelled("A.1.1", tempDir);

        expect(result.isBlocked).toBe(false);
        expect(result.reason).toBe("No blocking ancestors");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("returns false for initiative at root (no parents)", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-gating-"));
      try {
        const result = await isAncestorBlockedOrCancelled("A", tempDir);

        expect(result.isBlocked).toBe(false);
        expect(result.reason).toBe("No ancestors to check");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("immediate parent blocked", () => {
    it("returns true when immediate parent milestone is blocked", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-gating-"));
      try {
        // Create initiative A (in_progress)
        const initiativeDir = path.join(tempDir, "A.test-initiative");
        await fs.mkdir(initiativeDir, { recursive: true });
        await fs.writeFile(
          path.join(initiativeDir, "A.yml"),
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

        // Create milestone A.1 (blocked)
        const milestoneDir = path.join(initiativeDir, "A.1.test-milestone");
        await fs.mkdir(milestoneDir, { recursive: true });
        await fs.writeFile(
          path.join(milestoneDir, "A.1.yml"),
          `metadata:
  events:
    - event: draft
      timestamp: "2025-11-01T10:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: artifact_created
    - event: blocked
      timestamp: "2025-11-01T12:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: has_dependencies
`,
        );

        const result = await isAncestorBlockedOrCancelled("A.1.1", tempDir);

        expect(result.isBlocked).toBe(true);
        expect(result.reason).toBe("Parent milestone A.1 is blocked");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("returns true when immediate parent initiative is cancelled", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-gating-"));
      try {
        // Create initiative A (cancelled)
        const initiativeDir = path.join(tempDir, "A.test-initiative");
        await fs.mkdir(initiativeDir, { recursive: true });
        await fs.writeFile(
          path.join(initiativeDir, "A.yml"),
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

        const result = await isAncestorBlockedOrCancelled("A.1", tempDir);

        expect(result.isBlocked).toBe(true);
        expect(result.reason).toBe("Parent initiative A is cancelled");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("grandparent blocked", () => {
    it("returns true when grandparent initiative is blocked, even if immediate parent is healthy", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-gating-"));
      try {
        // Create initiative A (blocked)
        const initiativeDir = path.join(tempDir, "A.test-initiative");
        await fs.mkdir(initiativeDir, { recursive: true });
        await fs.writeFile(
          path.join(initiativeDir, "A.yml"),
          `metadata:
  events:
    - event: draft
      timestamp: "2025-11-01T10:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: artifact_created
    - event: blocked
      timestamp: "2025-11-01T12:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: has_dependencies
`,
        );

        // Create milestone A.1 (ready - healthy!)
        const milestoneDir = path.join(initiativeDir, "A.1.test-milestone");
        await fs.mkdir(milestoneDir, { recursive: true });
        await fs.writeFile(
          path.join(milestoneDir, "A.1.yml"),
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

        const result = await isAncestorBlockedOrCancelled("A.1.1", tempDir);

        expect(result.isBlocked).toBe(true);
        expect(result.reason).toBe("Parent initiative A is blocked");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("parent cancelled", () => {
    it("returns true when parent is cancelled", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-gating-"));
      try {
        // Create initiative A (cancelled)
        const initiativeDir = path.join(tempDir, "A.test-initiative");
        await fs.mkdir(initiativeDir, { recursive: true });
        await fs.writeFile(
          path.join(initiativeDir, "A.yml"),
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
    - event: cancelled
      timestamp: "2025-11-01T12:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: manual_action
`,
        );

        const result = await isAncestorBlockedOrCancelled("A.1", tempDir);

        expect(result.isBlocked).toBe(true);
        expect(result.reason).toBe("Parent initiative A is cancelled");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("missing parent files (defensive)", () => {
    it("returns false when parent artifact file not found", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-gating-"));
      try {
        // Don't create any parent files - orphaned artifact
        const result = await isAncestorBlockedOrCancelled("A.1.1", tempDir);

        expect(result.isBlocked).toBe(false);
        expect(result.reason).toContain("not found");
        expect(result.reason).toContain("allowing operation");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("invalid artifact ID format", () => {
    it("throws error for lowercase ID", async () => {
      await expect(isAncestorBlockedOrCancelled("a.1")).rejects.toThrow(
        /Invalid artifact ID/,
      );
    });

    it("throws error for non-numeric segments", async () => {
      await expect(isAncestorBlockedOrCancelled("A.B")).rejects.toThrow(
        /Invalid artifact ID/,
      );
    });

    it("throws error for empty ID", async () => {
      await expect(isAncestorBlockedOrCancelled("")).rejects.toThrow(
        /Invalid artifact ID/,
      );
    });

    it("throws error for numeric-only ID", async () => {
      await expect(isAncestorBlockedOrCancelled("123")).rejects.toThrow(
        /Invalid artifact ID/,
      );
    });
  });

  describe("first blocked parent wins", () => {
    it("returns on first blocked parent without checking rest of chain", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-gating-"));
      try {
        // Create initiative A (blocked - but shouldn't reach here)
        const initiativeDir = path.join(tempDir, "A.test-initiative");
        await fs.mkdir(initiativeDir, { recursive: true });
        await fs.writeFile(
          path.join(initiativeDir, "A.yml"),
          `metadata:
  events:
    - event: blocked
      timestamp: "2025-11-01T10:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: has_dependencies
`,
        );

        // Create milestone A.1 (blocked - should return this one first)
        const milestoneDir = path.join(initiativeDir, "A.1.test-milestone");
        await fs.mkdir(milestoneDir, { recursive: true });
        await fs.writeFile(
          path.join(milestoneDir, "A.1.yml"),
          `metadata:
  events:
    - event: blocked
      timestamp: "2025-11-01T11:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: has_dependencies
`,
        );

        const result = await isAncestorBlockedOrCancelled("A.1.1", tempDir);

        expect(result.isBlocked).toBe(true);
        // Should return immediate parent, not grandparent
        expect(result.reason).toBe("Parent milestone A.1 is blocked");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("milestone-level gating", () => {
    it("checks only initiative parent for milestone", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-gating-"));
      try {
        // Create initiative A (ready)
        const initiativeDir = path.join(tempDir, "A.test-initiative");
        await fs.mkdir(initiativeDir, { recursive: true });
        await fs.writeFile(
          path.join(initiativeDir, "A.yml"),
          `metadata:
  events:
    - event: ready
      timestamp: "2025-11-01T10:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: planning_complete
`,
        );

        const result = await isAncestorBlockedOrCancelled("A.1", tempDir);

        expect(result.isBlocked).toBe(false);
        expect(result.reason).toBe("No blocking ancestors");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("multi-letter initiative IDs", () => {
    it("works with multi-letter initiative IDs", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-gating-"));
      try {
        // Create initiative ABC (in_progress)
        const initiativeDir = path.join(tempDir, "ABC.test-initiative");
        await fs.mkdir(initiativeDir, { recursive: true });
        await fs.writeFile(
          path.join(initiativeDir, "ABC.yml"),
          `metadata:
  events:
    - event: in_progress
      timestamp: "2025-11-01T10:00:00Z"
      actor: "Test User (test@example.com)"
      trigger: work_started
`,
        );

        const result = await isAncestorBlockedOrCancelled("ABC.1", tempDir);

        expect(result.isBlocked).toBe(false);
        expect(result.reason).toBe("No blocking ancestors");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
