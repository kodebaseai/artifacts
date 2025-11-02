import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { readArtifact, writeArtifact } from "./artifact-file-service.js";
import {
  loadAllArtifactPaths,
  loadArtifactsByType,
} from "./artifact-loader.js";

const FIXTURE_ROOT = path.join(
  process.cwd(),
  "test",
  "fixtures",
  "loader-tree",
);

describe("loader integration", () => {
  it("discovers artifacts within the fixture tree while skipping hidden entries", async () => {
    const paths = await loadAllArtifactPaths(FIXTURE_ROOT);
    const expected = [
      path.join(FIXTURE_ROOT, "A.cascade-initiative", "A.1.development-phase", "A.1.1.backend-api.yml"),
      path.join(FIXTURE_ROOT, "A.cascade-initiative", "A.1.development-phase", "A.1.2.database-schema.yml"),
      path.join(FIXTURE_ROOT, "A.cascade-initiative", "A.1.development-phase", "A.1.3.frontend-integration.yml"),
      path.join(FIXTURE_ROOT, "A.cascade-initiative", "A.1.development-phase", "A.1.4.end-to-end-tests.yml"),
      path.join(FIXTURE_ROOT, "A.cascade-initiative", "A.1.development-phase", "A.1.yml"),
      path.join(FIXTURE_ROOT, "A.cascade-initiative", "A.2.operations-phase", "A.2.1.documentation.yml"),
      path.join(FIXTURE_ROOT, "A.cascade-initiative", "A.2.operations-phase", "A.2.2.deployment.yml"),
      path.join(FIXTURE_ROOT, "A.cascade-initiative", "A.2.operations-phase", "A.2.yml"),
      path.join(FIXTURE_ROOT, "A.cascade-initiative", "A.yml"),
      path.join(FIXTURE_ROOT, "B.loader-enhancements", "B.1.loader-enhancements", "B.1.1.maintenance.yml"),
      path.join(FIXTURE_ROOT, "B.loader-enhancements", "B.1.loader-enhancements", "B.1.yml"),
      path.join(FIXTURE_ROOT, "B.loader-enhancements", "B.yml"),
    ].sort();
    expect(paths).toEqual(expected);
  });

  it("filters initiatives, milestones, and issues based on discovered IDs", async () => {
    const paths = await loadAllArtifactPaths(FIXTURE_ROOT);

    expect(loadArtifactsByType(paths, "initiative")).toEqual(["A", "B"]);
    expect(loadArtifactsByType(paths, "milestone")).toEqual(["A.1", "A.2", "B.1"]);
    expect(loadArtifactsByType(paths, "issue")).toEqual([
      "A.1.1",
      "A.1.2",
      "A.1.3",
      "A.1.4",
      "A.2.1",
      "A.2.2",
      "B.1.1",
    ]);
  });

  it("performs stable read/write round-trips without diffs", async () => {
    const source = path.join(
      FIXTURE_ROOT,
      "A.cascade-initiative",
      "A.1.development-phase",
      "A.1.1.backend-api.yml",
    );
    const parsed = await readArtifact<Record<string, unknown>>(source);

    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "kodebase-loader-"),
    );
    try {
      const tempFile = path.join(tempDir, "copy.yml");
      await fs.copyFile(source, tempFile);

      await writeArtifact(tempFile, parsed);
      const firstWrite = await fs.readFile(tempFile, "utf8");
      const reread = await readArtifact<Record<string, unknown>>(tempFile);
      expect(reread).toEqual(parsed);

      await writeArtifact(tempFile, parsed);
      const secondWrite = await fs.readFile(tempFile, "utf8");
      expect(secondWrite).toBe(firstWrite);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces clear errors when YAML parsing fails", async () => {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "kodebase-loader-invalid-"),
    );
    try {
      const invalidFile = path.join(tempDir, "A.9.invalid.yml");
      await fs.writeFile(invalidFile, 'metadata:\n  title: "broken\n');

      await expect(readArtifact(invalidFile)).rejects.toThrow(
        /Failed to parse artifact at .*A\.9\.invalid\.yml/,
      );
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
