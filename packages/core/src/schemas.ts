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

// ============================================================================
// Artifact Content Schemas (A.1.4)
// ============================================================================

// Generic criteria list (for acceptance criteria, deliverables)
export const CriteriaListSchema = z
  .array(z.string().trim().min(1))
  .min(1, { message: "At least one item is required" });

// Issue content
export const IssueContentSchema = z.object({
  summary: z.string().min(1),
  acceptance_criteria: CriteriaListSchema,
});

// Milestone content
export const MilestoneContentSchema = z.object({
  summary: z.string().min(1),
  deliverables: CriteriaListSchema,
  validation: CriteriaListSchema.optional(),
});

// Initiative content
export const InitiativeContentSchema = z.object({
  vision: z.string().min(1),
  in_scope: CriteriaListSchema,
  out_of_scope: CriteriaListSchema,
  success_criteria: CriteriaListSchema,
});

// ============================================================================
// Completion and Notes Schemas (A.1.6)
// Root-level fields: notes (shared), implementation_notes (Issues), impact_summary (Milestones/Initiatives)
// ============================================================================

// Shared simple notes: allow a single string or a list of short notes
export const NotesSchema = z.union([
  z.string().trim().min(1),
  z.array(z.string().trim().min(1)).min(1),
]);

// Issue → implementation_notes
export const ImplementationNotesSchema = z.object({
  result: z.string().trim().min(1),
  tags: z
    .array(
      z
        .string()
        .trim()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
          message: "tags must be kebab-case",
        })
        .min(1),
    )
    .min(1)
    .optional(),
  challenges: z
    .array(
      z.object({
        challenge: z.string().trim().min(1),
        solution: z.string().trim().min(1),
      }),
    )
    .optional(),
  insights: z.array(z.string().trim().min(1)).optional(),
});

export const DeliverySummarySchema = z.object({
  outcome: z.string().trim().min(1),
  delivered: z.array(z.string().trim().min(1)).min(1),
  deviations: z.array(z.string().trim().min(1)).optional(),
  next: z.string().trim().min(1),
  risks: z.array(z.string().trim().min(1)).optional(),
});

export const ImpactSummarySchema = z.object({
  outcome: z.string().trim().min(1),
  benefits: z.array(z.string().trim().min(1)).min(1),
  evidence: z.array(z.string().trim().min(1)).optional(),
  next: z.string().trim().min(1),
});

export type TNotes = z.infer<typeof NotesSchema>;
export type TImplementationNotes = z.infer<typeof ImplementationNotesSchema>;
export type TImpactSummary = z.infer<typeof ImpactSummarySchema>;
export type TDeliverySummary = z.infer<typeof DeliverySummarySchema>;

// --------------------------------------------------------------------------
// Minimal helpers
// --------------------------------------------------------------------------

export function normalizeNotes(notes: TNotes): string[] {
  return Array.isArray(notes) ? notes : [notes];
}

// (No impact areas normalization needed when using CriteriaListSchema)
