import { describe, expect, it } from "vitest";
import { CArtifactEvent, CEventTrigger } from "./constants.js";
import { ActorSchema, EventSchema } from "./schemas.js";

describe("ActorSchema", () => {
  it("accepts human actor 'Name (email)' format", () => {
    const res = ActorSchema.safeParse("Jane Doe (jane@example.com)");
    expect(res.success).toBe(true);
  });

  it("accepts simplified agent actor 'agent.system' and with tenant suffix", () => {
    const res = ActorSchema.safeParse("agent.system");
    expect(res.success).toBe(true);
    const withTenant = ActorSchema.safeParse("agent.cascade@acme");
    expect(withTenant.success).toBe(true);
  });

  it("rejects invalid actor with actionable message", () => {
    const res = ActorSchema.safeParse("Jane Doe - jane@example.com");
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.length).toBeGreaterThan(0);
      const messages = res.error.issues.map((i) => i.message).join("\n");
      expect(messages).toContain("Invalid actor");
    }
  });

  it("trims surrounding whitespace for valid actors", () => {
    const res = ActorSchema.safeParse("  Jane Doe (jane@example.com)  ");
    expect(res.success).toBe(true);
  });

  it("rejects malformed human actor strings", () => {
    const cases = [
      "Jane Doe jane@example.com", // missing parentheses
      "Jane Doe (janeexample.com)", // missing @
      "(jane@example.com)", // missing name
    ];
    for (const c of cases) {
      const res = ActorSchema.safeParse(c);
      expect(res.success).toBe(false);
    }
  });

  it("rejects unknown agent types and bad tenant suffixes", () => {
    const cases = [
      "agent.reviewer", // not allowed type
      "agent.cascade@", // empty tenant
      "agent.system@INV@LID", // invalid tenant characters
    ];
    for (const c of cases) {
      const res = ActorSchema.safeParse(c);
      expect(res.success).toBe(false);
    }
  });

  // Intentionally do not accept legacy agent formats in v1 simplified mode
});

describe("EventSchema", () => {
  const base = {
    event: CArtifactEvent.DRAFT,
    timestamp: "2025-10-28T19:37:00Z",
    actor: "Miguel Carvalho (m@kodebase.ai)",
    trigger: CEventTrigger.ARTIFACT_CREATED,
  };

  it("requires event, timestamp, actor, trigger (metadata optional)", () => {
    const res = EventSchema.safeParse(base);
    expect(res.success).toBe(true);
  });

  it("rejects bad timestamp with clear message", () => {
    const bad = { ...base, timestamp: "2025-10-15:30:10Z" }; // invalid format
    const res = EventSchema.safeParse(bad);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.length).toBeGreaterThan(0);
      const messages = res.error.issues.map((i) => i.message).join("\n");
      expect(messages).toContain("Timestamp must be ISO-8601 UTC");
    }
  });

  it("rejects invalid trigger with allowed list in message", () => {
    const bad = { ...base, trigger: "not_a_trigger" };
    const res = EventSchema.safeParse(bad);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.length).toBeGreaterThan(0);
      const messages = res.error.issues.map((i) => i.message).join("\n");
      expect(messages).toContain("Invalid trigger");
    }
  });

  it("rejects timestamps with timezone offsets, milliseconds, and invalid h/m/s", () => {
    const bads = [
      { ...base, timestamp: "2025-10-28T19:37:00+00:00" }, // offset
      { ...base, timestamp: "2025-10-28T19:37:00.000Z" }, // milliseconds
      { ...base, timestamp: "2025-12-01T24:00:00Z" }, // invalid hour
      { ...base, timestamp: "2025-12-01T23:60:00Z" }, // invalid minute
    ];
    for (const b of bads) {
      const res = EventSchema.safeParse(b);
      expect(res.success).toBe(false);
    }
  });

  it("fails when required fields are missing", () => {
    const cases = [
      { ...base, event: undefined },
      { ...base, actor: undefined },
      { ...base, timestamp: undefined },
      { ...base, trigger: undefined },
    ];
    for (const c of cases) {
      // Provide an unknown-typed value with omitted fields
      const res = EventSchema.safeParse(c as unknown);
      expect(res.success).toBe(false);
    }
  });
});
