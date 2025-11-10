vi.mock("node:fs/promises", async () => {
  const { fs } = await import("memfs");
  const api = fs.promises as unknown as Record<string, unknown>;
  // biome-ignore lint/suspicious/noExplicitAny: memfs mock requires any for proper type inference
  return { default: api, ...api } as any;
});

import { vol } from "memfs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IdAllocationService } from "./id-allocation-service.js";

describe("IdAllocationService", () => {
  const testBaseDir = "/test-artifacts";
  let service: IdAllocationService;

  beforeEach(() => {
    vol.reset();
    vol.mkdirSync(testBaseDir, { recursive: true });
    service = new IdAllocationService(testBaseDir);
  });

  describe("allocateNextInitiativeId", () => {
    it("should return 'A' when no artifacts exist", async () => {
      const nextId = await service.allocateNextInitiativeId();
      expect(nextId).toBe("A");
    });

    it("should return 'B' when only 'A' exists", async () => {
      vol.mkdirSync(`${testBaseDir}/A.initiative-a`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/A.initiative-a/A.yml`, "");

      const nextId = await service.allocateNextInitiativeId();
      expect(nextId).toBe("B");
    });

    it("should return 'D' when A, B, C exist", async () => {
      vol.mkdirSync(`${testBaseDir}/A.initiative-a`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/A.initiative-a/A.yml`, "");

      vol.mkdirSync(`${testBaseDir}/B.initiative-b`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/B.initiative-b/B.yml`, "");

      vol.mkdirSync(`${testBaseDir}/C.initiative-c`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/C.initiative-c/C.yml`, "");

      const nextId = await service.allocateNextInitiativeId();
      expect(nextId).toBe("D");
    });

    it("should return 'AA' after 'Z'", async () => {
      vol.mkdirSync(`${testBaseDir}/Z.initiative-z`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/Z.initiative-z/Z.yml`, "");

      const nextId = await service.allocateNextInitiativeId();
      expect(nextId).toBe("AA");
    });

    it("should return 'AB' after 'AA'", async () => {
      vol.mkdirSync(`${testBaseDir}/AA.initiative-aa`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/AA.initiative-aa/AA.yml`, "");

      const nextId = await service.allocateNextInitiativeId();
      expect(nextId).toBe("AB");
    });

    it("should return 'AZ' after 'AY'", async () => {
      vol.mkdirSync(`${testBaseDir}/AY.initiative-ay`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/AY.initiative-ay/AY.yml`, "");

      const nextId = await service.allocateNextInitiativeId();
      expect(nextId).toBe("AZ");
    });

    it("should return 'BA' after 'AZ'", async () => {
      vol.mkdirSync(`${testBaseDir}/AZ.initiative-az`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/AZ.initiative-az/AZ.yml`, "");

      const nextId = await service.allocateNextInitiativeId();
      expect(nextId).toBe("BA");
    });

    it("should return 'ZZ' after 'ZY'", async () => {
      vol.mkdirSync(`${testBaseDir}/ZY.initiative-zy`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/ZY.initiative-zy/ZY.yml`, "");

      const nextId = await service.allocateNextInitiativeId();
      expect(nextId).toBe("ZZ");
    });

    it("should return 'AAA' after 'ZZ'", async () => {
      vol.mkdirSync(`${testBaseDir}/ZZ.initiative-zz`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/ZZ.initiative-zz/ZZ.yml`, "");

      const nextId = await service.allocateNextInitiativeId();
      expect(nextId).toBe("AAA");
    });

    it("should always increment from highest ID, never fill gaps", async () => {
      vol.mkdirSync(`${testBaseDir}/A.initiative-a`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/A.initiative-a/A.yml`, "");

      vol.mkdirSync(`${testBaseDir}/C.initiative-c`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/C.initiative-c/C.yml`, "");

      vol.mkdirSync(`${testBaseDir}/D.initiative-d`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/D.initiative-d/D.yml`, "");

      const nextId = await service.allocateNextInitiativeId();
      expect(nextId).toBe("E");
    });

    it("should ignore milestones and issues when allocating initiative IDs", async () => {
      vol.mkdirSync(`${testBaseDir}/A.initiative-a`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/A.initiative-a/A.yml`, "");

      vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.1.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.yml`,
        "",
      );

      vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.1.milestone/A.1.1-issue`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.1.issue.yml`,
        "",
      );

      const nextId = await service.allocateNextInitiativeId();
      expect(nextId).toBe("B");
    });
  });

  describe("allocateNextMilestoneId", () => {
    it("should return '.1' when no milestones exist under parent", async () => {
      vol.mkdirSync(`${testBaseDir}/A.initiative-a`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/A.initiative-a/A.yml`, "");

      const nextId = await service.allocateNextMilestoneId("A");
      expect(nextId).toBe("A.1");
    });

    it("should return '.2' when milestone .1 exists", async () => {
      vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.1.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.yml`,
        "",
      );

      const nextId = await service.allocateNextMilestoneId("A");
      expect(nextId).toBe("A.2");
    });

    it("should return '.3' when milestones .1 and .2 exist", async () => {
      vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.1.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.yml`,
        "",
      );

      vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.2.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.2.milestone/A.2.yml`,
        "",
      );

      const nextId = await service.allocateNextMilestoneId("A");
      expect(nextId).toBe("A.3");
    });

    it("should handle gaps and return next highest ID", async () => {
      vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.1.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.yml`,
        "",
      );

      vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.5.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.5.milestone/A.5.yml`,
        "",
      );

      const nextId = await service.allocateNextMilestoneId("A");
      expect(nextId).toBe("A.6");
    });

    it("should only count milestones under the specified parent", async () => {
      vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.1.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.yml`,
        "",
      );

      vol.mkdirSync(`${testBaseDir}/B.initiative-b`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/B.initiative-b/B.yml`, "");

      vol.mkdirSync(`${testBaseDir}/B.initiative-b/B.10.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/B.initiative-b/B.10.milestone/B.10.yml`,
        "",
      );

      const nextId = await service.allocateNextMilestoneId("A");
      expect(nextId).toBe("A.2");
    });

    it("should work with double-letter initiative IDs", async () => {
      vol.mkdirSync(`${testBaseDir}/AA.initiative-aa/AA.1.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/AA.initiative-aa/AA.1.milestone/AA.1.yml`,
        "",
      );

      const nextId = await service.allocateNextMilestoneId("AA");
      expect(nextId).toBe("AA.2");
    });

    it("should ignore issues when allocating milestone IDs", async () => {
      vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.1.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.yml`,
        "",
      );

      vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.1.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.1.issue.yml`,
        "",
      );
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.2.issue.yml`,
        "",
      );

      const nextId = await service.allocateNextMilestoneId("A");
      expect(nextId).toBe("A.2");
    });

    it("should throw error for invalid parent ID", async () => {
      await expect(service.allocateNextMilestoneId("A.1")).rejects.toThrow(
        /Invalid initiative ID/,
      );
      await expect(service.allocateNextMilestoneId("123")).rejects.toThrow(
        /Invalid initiative ID/,
      );
      await expect(service.allocateNextMilestoneId("a")).rejects.toThrow(
        /Invalid initiative ID/,
      );
    });
  });

  describe("allocateNextIssueId", () => {
    it("should return '.1' when no issues exist under parent", async () => {
      vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.1.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.yml`,
        "",
      );

      const nextId = await service.allocateNextIssueId("A.1");
      expect(nextId).toBe("A.1.1");
    });

    it("should return '.2' when issue .1 exists", async () => {
      vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.1.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.1.issue.yml`,
        "",
      );

      const nextId = await service.allocateNextIssueId("A.1");
      expect(nextId).toBe("A.1.2");
    });

    it("should return '.5' when issues .1, .2, .3, .4 exist", async () => {
      vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.1.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.1.issue.yml`,
        "",
      );
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.2.issue.yml`,
        "",
      );
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.3.issue.yml`,
        "",
      );
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.4.issue.yml`,
        "",
      );

      const nextId = await service.allocateNextIssueId("A.1");
      expect(nextId).toBe("A.1.5");
    });

    it("should handle gaps and return next highest ID", async () => {
      vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.1.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.1.issue.yml`,
        "",
      );
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.6.issue.yml`,
        "",
      );

      const nextId = await service.allocateNextIssueId("A.1");
      expect(nextId).toBe("A.1.7");
    });

    it("should only count issues under the specified parent", async () => {
      vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.1.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.1.issue.yml`,
        "",
      );

      vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.2.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.2.milestone/A.2.10.issue.yml`,
        "",
      );

      const nextId = await service.allocateNextIssueId("A.1");
      expect(nextId).toBe("A.1.2");
    });

    it("should work with double-letter initiative IDs", async () => {
      vol.mkdirSync(`${testBaseDir}/AA.initiative-aa/AA.1.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/AA.initiative-aa/AA.1.milestone/AA.1.1.issue.yml`,
        "",
      );

      const nextId = await service.allocateNextIssueId("AA.1");
      expect(nextId).toBe("AA.1.2");
    });

    it("should throw error for invalid parent ID", async () => {
      await expect(service.allocateNextIssueId("A")).rejects.toThrow(
        /Invalid milestone ID/,
      );
      await expect(service.allocateNextIssueId("A.1.2")).rejects.toThrow(
        /Invalid milestone ID/,
      );
      await expect(service.allocateNextIssueId("123")).rejects.toThrow(
        /Invalid milestone ID/,
      );
    });
  });

  describe("performance", () => {
    it("should allocate initiative ID in <100ms with 100+ artifacts", async () => {
      for (let i = 0; i < 100; i++) {
        const letterId = String.fromCharCode(65 + (i % 26));
        const prefix = i >= 26 ? "A" : "";
        const id = `${prefix}${letterId}`;
        vol.mkdirSync(`${testBaseDir}/${id}.initiative-${i}`, {
          recursive: true,
        });
        vol.writeFileSync(`${testBaseDir}/${id}.initiative-${i}/${id}.yml`, "");
      }

      const start = performance.now();
      await service.allocateNextInitiativeId();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it("should allocate milestone ID in <100ms with 100+ artifacts", async () => {
      vol.mkdirSync(`${testBaseDir}/A.initiative-a`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/A.initiative-a/A.yml`, "");

      for (let i = 1; i <= 50; i++) {
        vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.${i}.milestone`, {
          recursive: true,
        });
        vol.writeFileSync(
          `${testBaseDir}/A.initiative-a/A.${i}.milestone/A.${i}.yml`,
          "",
        );
      }

      vol.mkdirSync(`${testBaseDir}/B.initiative-b`, { recursive: true });
      vol.writeFileSync(`${testBaseDir}/B.initiative-b/B.yml`, "");

      for (let i = 1; i <= 50; i++) {
        vol.mkdirSync(`${testBaseDir}/B.initiative-b/B.${i}.milestone`, {
          recursive: true,
        });
        vol.writeFileSync(
          `${testBaseDir}/B.initiative-b/B.${i}.milestone/B.${i}.yml`,
          "",
        );
      }

      const start = performance.now();
      await service.allocateNextMilestoneId("A");
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it("should allocate issue ID in <100ms with 100+ artifacts", async () => {
      vol.mkdirSync(`${testBaseDir}/A.initiative-a/A.1.milestone`, {
        recursive: true,
      });
      vol.writeFileSync(
        `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.yml`,
        "",
      );

      for (let i = 1; i <= 100; i++) {
        vol.writeFileSync(
          `${testBaseDir}/A.initiative-a/A.1.milestone/A.1.${i}.issue.yml`,
          "",
        );
      }

      const start = performance.now();
      await service.allocateNextIssueId("A.1");
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});
