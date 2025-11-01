import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { allocateNextId, detectContextLevel } from "./artifact-context.js";

describe("detectContextLevel", () => {
  describe("parent ID based detection", () => {
    it("returns 'initiative' when no parent ID provided", () => {
      expect(detectContextLevel()).toBe("initiative");
      expect(detectContextLevel(null)).toBe("initiative");
      expect(detectContextLevel(undefined)).toBe("initiative");
    });

    it("returns 'milestone' for initiative parent", () => {
      expect(detectContextLevel("A")).toBe("milestone");
      expect(detectContextLevel("B")).toBe("milestone");
      expect(detectContextLevel("Z")).toBe("milestone");
    });

    it("returns 'issue' for milestone parent", () => {
      expect(detectContextLevel("A.1")).toBe("issue");
      expect(detectContextLevel("B.2")).toBe("issue");
      expect(detectContextLevel("C.99")).toBe("issue");
    });

    it("supports multi-letter initiative IDs", () => {
      expect(detectContextLevel("ABC")).toBe("milestone");
      expect(detectContextLevel("XYZ")).toBe("milestone");
    });

    it("supports multi-digit milestone numbers", () => {
      expect(detectContextLevel("A.999")).toBe("issue");
      expect(detectContextLevel("ABC.12345")).toBe("issue");
    });
  });

  describe("validation and error handling", () => {
    it("throws error for invalid parent ID format", () => {
      expect(() => detectContextLevel("a")).toThrow(/Invalid parent ID/);
      expect(() => detectContextLevel("A.B")).toThrow(/Invalid parent ID/);
      expect(() => detectContextLevel("123")).toThrow(/Invalid parent ID/);
      expect(() => detectContextLevel("A.1.a")).toThrow(/Invalid parent ID/);
    });

    it("throws error when trying to create child under issue", () => {
      expect(() => detectContextLevel("A.1.1")).toThrow(
        /Cannot create child artifacts under issue/,
      );
      expect(() => detectContextLevel("B.2.5")).toThrow(
        /Issues cannot have children/,
      );
    });
  });
});

describe("allocateNextId", () => {
  describe("first child allocation", () => {
    it("returns .1 for initiative with no milestones", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-alloc-"));
      try {
        // Create initiative but no milestones
        const initiativeDir = path.join(tempDir, ".kodebase/artifacts/A.core");
        await fs.mkdir(initiativeDir, { recursive: true });
        await fs.writeFile(
          path.join(initiativeDir, "A.yml"),
          "metadata:\n  title: Test\n",
        );

        const nextId = await allocateNextId("A", tempDir);

        expect(nextId).toBe("A.1");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("returns .1 for milestone with no issues", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-alloc-"));
      try {
        // Create milestone but no issues
        const milestoneDir = path.join(
          tempDir,
          ".kodebase/artifacts/A.core/A.1.types",
        );
        await fs.mkdir(milestoneDir, { recursive: true });
        await fs.writeFile(
          path.join(milestoneDir, "A.1.yml"),
          "metadata:\n  title: Test\n",
        );

        const nextId = await allocateNextId("A.1", tempDir);

        expect(nextId).toBe("A.1.1");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("returns .1 when artifacts directory does not exist", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-alloc-"));
      try {
        const nextId = await allocateNextId("A", tempDir);

        expect(nextId).toBe("A.1");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("sequential allocation", () => {
    it("allocates next milestone in sequence", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-alloc-"));
      try {
        const initiativeDir = path.join(tempDir, ".kodebase/artifacts/A.core");
        await fs.mkdir(initiativeDir, { recursive: true });

        // Create milestones A.1 and A.2
        for (const num of [1, 2]) {
          const milestoneDir = path.join(initiativeDir, `A.${num}.test`);
          await fs.mkdir(milestoneDir, { recursive: true });
          await fs.writeFile(
            path.join(milestoneDir, `A.${num}.yml`),
            "metadata:\n  title: Test\n",
          );
        }

        const nextId = await allocateNextId("A", tempDir);

        expect(nextId).toBe("A.3");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("allocates next issue in sequence", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-alloc-"));
      try {
        const milestoneDir = path.join(
          tempDir,
          ".kodebase/artifacts/A.core/A.1.types",
        );
        await fs.mkdir(milestoneDir, { recursive: true });

        // Create issues A.1.1, A.1.2, A.1.3
        for (const num of [1, 2, 3]) {
          await fs.writeFile(
            path.join(milestoneDir, `A.1.${num}.test.yml`),
            "metadata:\n  title: Test\n",
          );
        }

        const nextId = await allocateNextId("A.1", tempDir);

        expect(nextId).toBe("A.1.4");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("sparse range handling", () => {
    it("uses max+1 strategy for sparse milestone ranges", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-alloc-"));
      try {
        const initiativeDir = path.join(tempDir, ".kodebase/artifacts/A.core");
        await fs.mkdir(initiativeDir, { recursive: true });

        // Create milestones A.1, A.3, A.5 (sparse)
        for (const num of [1, 3, 5]) {
          const milestoneDir = path.join(initiativeDir, `A.${num}.test`);
          await fs.mkdir(milestoneDir, { recursive: true });
          await fs.writeFile(
            path.join(milestoneDir, `A.${num}.yml`),
            "metadata:\n  title: Test\n",
          );
        }

        const nextId = await allocateNextId("A", tempDir);

        // Should be A.6 (max+1), not A.2 (fill gap)
        expect(nextId).toBe("A.6");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("uses max+1 strategy for sparse issue ranges", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-alloc-"));
      try {
        const milestoneDir = path.join(
          tempDir,
          ".kodebase/artifacts/B.web/B.1.auth",
        );
        await fs.mkdir(milestoneDir, { recursive: true });

        // Create issues B.1.2, B.1.7, B.1.10 (sparse)
        for (const num of [2, 7, 10]) {
          await fs.writeFile(
            path.join(milestoneDir, `B.1.${num}.test.yml`),
            "metadata:\n  title: Test\n",
          );
        }

        const nextId = await allocateNextId("B.1", tempDir);

        // Should be B.1.11 (max+1), not B.1.1 or B.1.3
        expect(nextId).toBe("B.1.11");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("multi-digit segment support", () => {
    it("handles double-digit milestone numbers", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-alloc-"));
      try {
        const initiativeDir = path.join(tempDir, ".kodebase/artifacts/A.core");
        await fs.mkdir(initiativeDir, { recursive: true });

        // Create milestones up to A.99
        for (const num of [98, 99]) {
          const milestoneDir = path.join(initiativeDir, `A.${num}.test`);
          await fs.mkdir(milestoneDir, { recursive: true });
          await fs.writeFile(
            path.join(milestoneDir, `A.${num}.yml`),
            "metadata:\n  title: Test\n",
          );
        }

        const nextId = await allocateNextId("A", tempDir);

        expect(nextId).toBe("A.100");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("handles triple-digit issue numbers", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-alloc-"));
      try {
        const milestoneDir = path.join(
          tempDir,
          ".kodebase/artifacts/C.api/C.2.endpoints",
        );
        await fs.mkdir(milestoneDir, { recursive: true });

        // Create issues up to C.2.999
        for (const num of [998, 999]) {
          await fs.writeFile(
            path.join(milestoneDir, `C.2.${num}.test.yml`),
            "metadata:\n  title: Test\n",
          );
        }

        const nextId = await allocateNextId("C.2", tempDir);

        expect(nextId).toBe("C.2.1000");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("multi-letter initiative support", () => {
    it("allocates first milestone for multi-letter initiative", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-alloc-"));
      try {
        const initiativeDir = path.join(
          tempDir,
          ".kodebase/artifacts/ABC.project",
        );
        await fs.mkdir(initiativeDir, { recursive: true });
        await fs.writeFile(
          path.join(initiativeDir, "ABC.yml"),
          "metadata:\n  title: Test\n",
        );

        const nextId = await allocateNextId("ABC", tempDir);

        expect(nextId).toBe("ABC.1");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("allocates sequential milestones for multi-letter initiative", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-alloc-"));
      try {
        const initiativeDir = path.join(
          tempDir,
          ".kodebase/artifacts/XYZ.test",
        );
        await fs.mkdir(initiativeDir, { recursive: true });

        // Create milestones XYZ.1, XYZ.2
        for (const num of [1, 2]) {
          const milestoneDir = path.join(initiativeDir, `XYZ.${num}.test`);
          await fs.mkdir(milestoneDir, { recursive: true });
          await fs.writeFile(
            path.join(milestoneDir, `XYZ.${num}.yml`),
            "metadata:\n  title: Test\n",
          );
        }

        const nextId = await allocateNextId("XYZ", tempDir);

        expect(nextId).toBe("XYZ.3");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("validation and error handling", () => {
    it("throws error for invalid parent ID format", async () => {
      await expect(allocateNextId("a.1")).rejects.toThrow(/Invalid parent ID/);
      await expect(allocateNextId("A.B")).rejects.toThrow(/Invalid parent ID/);
      await expect(allocateNextId("123")).rejects.toThrow(/Invalid parent ID/);
    });

    it("throws error when trying to allocate child for an issue", async () => {
      await expect(allocateNextId("A.1.1")).rejects.toThrow(
        /Cannot allocate child ID for issue/,
      );
      await expect(allocateNextId("B.2.5")).rejects.toThrow(
        /Parent must be an initiative or milestone/,
      );
    });
  });

  describe("filtering siblings correctly", () => {
    it("only counts direct children, not grandchildren", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-alloc-"));
      try {
        const initiativeDir = path.join(tempDir, ".kodebase/artifacts/A.core");
        await fs.mkdir(initiativeDir, { recursive: true });

        // Create milestone A.1
        const milestoneDir = path.join(initiativeDir, "A.1.types");
        await fs.mkdir(milestoneDir, { recursive: true });
        await fs.writeFile(
          path.join(milestoneDir, "A.1.yml"),
          "metadata:\n  title: Test\n",
        );

        // Create issues under A.1 (grandchildren of A)
        for (const num of [1, 2, 3]) {
          await fs.writeFile(
            path.join(milestoneDir, `A.1.${num}.test.yml`),
            "metadata:\n  title: Test\n",
          );
        }

        const nextId = await allocateNextId("A", tempDir);

        // Should be A.2 (only counting milestone A.1), not A.4
        expect(nextId).toBe("A.2");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("ignores siblings from different parents", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-alloc-"));
      try {
        const artifactsRoot = path.join(tempDir, ".kodebase/artifacts");

        // Create initiative A with milestone A.1
        const initiativeA = path.join(artifactsRoot, "A.core");
        const milestoneA1 = path.join(initiativeA, "A.1.types");
        await fs.mkdir(milestoneA1, { recursive: true });
        await fs.writeFile(
          path.join(milestoneA1, "A.1.yml"),
          "metadata:\n  title: Test\n",
        );

        // Create initiative B with milestones B.1, B.2, B.3
        const initiativeB = path.join(artifactsRoot, "B.web");
        await fs.mkdir(initiativeB, { recursive: true });
        for (const num of [1, 2, 3]) {
          const milestoneDir = path.join(initiativeB, `B.${num}.test`);
          await fs.mkdir(milestoneDir, { recursive: true });
          await fs.writeFile(
            path.join(milestoneDir, `B.${num}.yml`),
            "metadata:\n  title: Test\n",
          );
        }

        const nextId = await allocateNextId("A", tempDir);

        // Should be A.2 (only counting A.1), not A.4 (ignoring B's milestones)
        expect(nextId).toBe("A.2");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
