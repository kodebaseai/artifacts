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

describe("Relationships & Metadata Schemas", () => {
  it("validates relationships defaults and sibling-type rules via helper", async () => {
    const { RelationshipsSchema } = await import("./schemas.js");
    const ok = RelationshipsSchema.parse({});
    expect(ok.blocks).toEqual([]);
    expect(ok.blocked_by).toEqual([]);
    const rel = RelationshipsSchema.parse({
      blocks: ["A.2", "A.3"], // milestones
      blocked_by: ["A.4"],
    });
    expect(rel.blocks.length).toBe(2);
    const { validateSiblingIds } = await import("./schemas.js");
    // Context: milestone A.1 can only reference other milestones under A
    expect(validateSiblingIds(rel.blocks, "A.1").ok).toBe(true);
    // Mixed type should fail: add an issue into milestone context
    expect(validateSiblingIds(["A.1.2"], "A.1").ok).toBe(false);
  });

  it("rejects invalid artifact ID formats in relationships", async () => {
    const { RelationshipsSchema } = await import("./schemas.js");
    const bad = RelationshipsSchema.safeParse({ blocks: ["A1"] }); // missing dot
    expect(bad.success).toBe(false);
  });

  it("sibling validator enforces same initiative and same type", async () => {
    const { validateSiblingIds } = await import("./schemas.js");
    // OK: all milestones under initiative A
    expect(validateSiblingIds(["A.2", "A.3"], "A.1").ok).toBe(true);
    // OK: multi-letter initiative AA
    expect(validateSiblingIds(["AA.2", "AA.3"], "AA.1").ok).toBe(true);
    // Fail: different initiative
    expect(validateSiblingIds(["B.1"], "A.9").ok).toBe(false);
    // Fail: mixed types
    expect(validateSiblingIds(["A.2.3"], "A.1").ok).toBe(false);
    // Fail: mismatched multi-letter prefix
    expect(validateSiblingIds(["A.2"], "AA.1").ok).toBe(false);
  });

  it("artifact metadata requires title, actors, and first event draft", async () => {
    const { ArtifactMetadataSchema } = await import("./schemas.js");
    const good = ArtifactMetadataSchema.safeParse({
      title: "Test",
      priority: "high",
      estimation: "S",
      created_by: "Jane Doe (jane@example.com)",
      assignee: "Jane Doe (jane@example.com)",
      schema_version: "0.0.1",
      relationships: { blocks: [], blocked_by: [] },
      events: [
        {
          event: CArtifactEvent.DRAFT,
          timestamp: "2025-10-28T19:37:00Z",
          actor: "Jane Doe (jane@example.com)",
          trigger: CEventTrigger.ARTIFACT_CREATED,
        },
      ],
    });
    expect(good.success).toBe(true);

    const bad = ArtifactMetadataSchema.safeParse({
      title: "Bad",
      priority: "high",
      estimation: "S",
      created_by: "Jane Doe (jane@example.com)",
      assignee: "Jane Doe (jane@example.com)",
      schema_version: "0.0.1",
      relationships: { blocks: [], blocked_by: [] },
      events: [
        {
          event: CArtifactEvent.READY,
          timestamp: "2025-10-28T19:37:00Z",
          actor: "Jane Doe (jane@example.com)",
          trigger: CEventTrigger.DEPENDENCIES_MET,
        },
      ],
    });
    expect(bad.success).toBe(false);
  });
});
