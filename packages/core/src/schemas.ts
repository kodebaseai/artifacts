import { z } from "zod";
import {
  ARTIFACT_EVENTS,
  CArtifactEvent,
  CEventTrigger,
  ESTIMATION_SIZES,
  EVENT_TRIGGERS,
  PRIORITIES,
} from "./constants.js";

// Human actor: "Full Name (email@domain.tld)"
const HUMAN_ACTOR_REGEX =
  /^[^()]+\s\([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\)$/i;

// Simplified AI agent actors (v1):
// - agent.system
// - agent.cascade
// Optional tenant suffix: agent.<type>@<tenant>
export const AGENT_TYPES = ["system", "cascade"] as const;
const SIMPLE_AGENT_REGEX = new RegExp(
  `^agent\\.(?:${AGENT_TYPES.join("|")})(?:@[a-z0-9-]+)?$`,
  "i",
);

export const ActorSchema = z
  .string()
  .trim()
  .refine((s) => HUMAN_ACTOR_REGEX.test(s) || SIMPLE_AGENT_REGEX.test(s), {
    message:
      "Invalid actor. Use 'Name (email@domain)' or 'agent.system|agent.cascade' (optionally '@tenant')",
  });

// Strict ISO-8601 UTC timestamp (no milliseconds), e.g., 2025-10-28T19:37:00Z
const ISO_UTC_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)Z$/;

export const TimestampSchema = z.string().refine((s) => ISO_UTC_REGEX.test(s), {
  message:
    "Timestamp must be ISO-8601 UTC ending with 'Z' (YYYY-MM-DDTHH:MM:SSZ)",
});

export const EventSchema = z.object({
  event: z
    .string()
    .refine((v) => (ARTIFACT_EVENTS as readonly string[]).includes(v), {
      message: `Invalid event. Allowed: ${Object.values(CArtifactEvent).join(", ")}`,
    }),
  timestamp: TimestampSchema,
  actor: ActorSchema,
  trigger: z
    .string()
    .refine((v) => (EVENT_TRIGGERS as readonly string[]).includes(v), {
      message: `Invalid trigger. Allowed: ${Object.values(CEventTrigger).join(", ")}`,
    }),
  metadata: z.record(z.any()).optional(),
});

export type TActor = z.infer<typeof ActorSchema>;
export type TEvent = z.infer<typeof EventSchema>;

// ============================================================================
// Relationships and Artifact Metadata Schemas (A.1.3)
// ============================================================================

// Artifact ID patterns
// Initiative IDs support base-26 style sequences: A..Z, AA..ZZ, AAA...
const INITIATIVE_ID_REGEX = /^[A-Z]+$/;
const MILESTONE_ID_REGEX = /^[A-Z]+\.\d+$/;
const ISSUE_ID_REGEX = /^[A-Z]+\.\d+\.\d+$/;

export const ArtifactIdSchema = z
  .string()
  .refine(
    (s) =>
      INITIATIVE_ID_REGEX.test(s) ||
      MILESTONE_ID_REGEX.test(s) ||
      ISSUE_ID_REGEX.test(s),
    { message: "Invalid artifact ID format" },
  );

export const RelationshipsSchema = z.object({
  blocks: z.array(ArtifactIdSchema).default([]),
  blocked_by: z.array(ArtifactIdSchema).default([]),
});

// Helper: sibling validation (same initiative letter AND same type)
function classifyId(id: string): "initiative" | "milestone" | "issue" | null {
  if (INITIATIVE_ID_REGEX.test(id)) return "initiative";
  if (MILESTONE_ID_REGEX.test(id)) return "milestone";
  if (ISSUE_ID_REGEX.test(id)) return "issue";
  return null;
}

function initiativePrefix(id: string): string | null {
  return id.match(/^[A-Z]+/)?.[0] ?? null;
}

export function validateSiblingIds(
  ids: string[],
  contextId: string,
): { ok: boolean; offending?: string } {
  const contextInit = initiativePrefix(contextId);
  const contextType = classifyId(contextId);
  if (!contextInit || !contextType) return { ok: false, offending: contextId };
  for (const id of ids) {
    const type = classifyId(id);
    if (!type) return { ok: false, offending: id };
    const init = initiativePrefix(id);
    if (init !== contextInit) return { ok: false, offending: id };
    if (type !== contextType) return { ok: false, offending: id };
  }
  return { ok: true };
}

export const ArtifactMetadataSchema = z.object({
  title: z.string().min(1),
  priority: z
    .string()
    .refine((v) => (PRIORITIES as readonly string[]).includes(v), {
      message: `Invalid priority. Allowed: ${PRIORITIES.join(", ")}`,
    }),
  estimation: z
    .string()
    .refine((v) => (ESTIMATION_SIZES as readonly string[]).includes(v), {
      message: `Invalid estimation size. Allowed: ${ESTIMATION_SIZES.join(", ")}`,
    }),
  created_by: ActorSchema, // Human actor expected
  assignee: ActorSchema,
  schema_version: z.string(),
  relationships: RelationshipsSchema.default({ blocks: [], blocked_by: [] }),
  events: z
    .array(EventSchema)
    .min(1, { message: "At least one event required" })
    .refine((arr) => arr[0]?.event === CArtifactEvent.DRAFT, {
      message: "First event must be 'draft'",
    }),
});

export type TArtifactMetadata = z.infer<typeof ArtifactMetadataSchema>;
