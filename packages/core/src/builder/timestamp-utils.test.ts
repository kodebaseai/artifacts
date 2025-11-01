import { describe, expect, it } from "vitest";
import { createTimestamp } from "./timestamp-utils.js";

describe("createTimestamp", () => {
  it("generates timestamp in ISO-8601 UTC format", () => {
    const timestamp = createTimestamp();

    // Should match YYYY-MM-DDTHH:MM:SSZ format
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it("removes milliseconds from timestamp", () => {
    const date = new Date("2025-11-01T18:30:45.123Z");
    const timestamp = createTimestamp(date);

    expect(timestamp).toBe("2025-11-01T18:30:45Z");
    expect(timestamp).not.toContain(".123");
  });

  it("accepts custom date for deterministic timestamps", () => {
    const customDate = new Date("2025-10-28T10:27:00.000Z");
    const timestamp = createTimestamp(customDate);

    expect(timestamp).toBe("2025-10-28T10:27:00Z");
  });

  it("defaults to current time when no date provided", () => {
    const before = Date.now();
    const timestamp = createTimestamp();
    const after = Date.now();

    const timestampDate = new Date(timestamp);
    // Timestamp should be within the time window (allowing for execution time)
    expect(timestampDate.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(timestampDate.getTime()).toBeLessThanOrEqual(after + 1000);
  });

  it("produces UTC timezone (ends with Z)", () => {
    const timestamp = createTimestamp(new Date("2025-11-01T18:30:00Z"));

    expect(timestamp.endsWith("Z")).toBe(true);
  });
});
