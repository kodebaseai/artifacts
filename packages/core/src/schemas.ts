import { z } from "zod";
import {
  ARTIFACT_EVENTS,
  CArtifactEvent,
  CEventTrigger,
  EVENT_TRIGGERS,
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
