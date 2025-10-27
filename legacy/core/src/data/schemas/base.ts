/**
 * Base schemas for Kodebase artifacts
 * @property actorSchema - The schema for an actor
 * @property eventMetadataSchema - The schema for an event
 * @property relationshipsMetadataSchema - The schema for relationships
 * @property artifactMetadataSchema - The schema for artifact metadata
 * @property EventMetadataSchema - The type for an event metadata
 * @property RelationshipsMetadataSchema - The type for relationships metadata
 * @property ArtifactMetadataSchema - The type for artifact metadata
 */

import { z } from 'zod';
import {
  CArtifactEvent,
  CEstimationSize,
  CEventTrigger,
  CPriority,
} from '../types/constants';

/**
 * Actor validation schema
 *
 * Validates actor format for both humans and AI agents:
 * - Human format: "Name (email@domain.com)"
 * - AI agent format: "agent.[TYPE].[SESSION]@[TENANT].kodebase.ai"
 *
 * @example
 * // Valid human actor
 * "John Doe (john@example.com)"
 *
 * @example
 * // Valid AI agent actor
 * "agent.CLAUDE.ABC123@acme.kodebase.ai"
 * @returns The actor schema
 */
const actorSchema = z
  .string()
  .regex(
    /^([\w\s]+\s*\([^)]+@[^)]+\)|agent\.[A-Z]+\.[A-Z0-9]+@[\w.-]+\.kodebase\.ai)$/,
    'Actor must be in format "Name (email@domain.com)" or "agent.[TYPE].[SESSION]@[TENANT].kodebase.ai"',
  );

/**
 * Event metadata schema v2.0
 *
 * Represents a single event in an artifact's lifecycle.
 * Events form an immutable, append-only log that tracks all state transitions.
 *
 * @remarks
 * v2.0 Changes:
 * - Removed event_id, correlation_id, parent_event_id for simplicity
 * - Reordered fields to have event first for better readability
 * - Added required trigger field to track what caused the event
 * - Trigger supports parameterized values like 'child_started:<artifact-id>'
 * Events cannot be modified or deleted once created.
 * The timestamp must be in ISO 8601 format for consistency.
 * @returns The event metadata schema
 */
export const eventMetadataSchema = z.object({
  event: z.enum(Object.values(CArtifactEvent) as [string, ...string[]]),
  timestamp: z
    .string()
    .datetime({ message: 'Timestamp must be in ISO 8601 format' }),
  actor: actorSchema,
  trigger: z.string().refine(
    (val) => {
      // Check if it's a simple trigger from the enum
      const triggers = Object.values(CEventTrigger) as string[];
      if (triggers.includes(val)) return true;

      // Check if it's a parameterized trigger (e.g., 'child_started:<I.1.1>')
      const parameterizedPattern =
        /^(child_started|dependency_completed):<[A-Z](\.\d+)*>$/;
      return parameterizedPattern.test(val);
    },
    {
      message:
        'Trigger must be a valid event trigger or parameterized trigger (e.g., child_started:<artifact-id>)',
    },
  ),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Relationships metadata schema
 *
 * Defines dependency relationships between artifacts.
 * Used to track which artifacts depend on or block others.
 *
 * @remarks
 * Empty arrays are provided as defaults to simplify artifact creation.
 * @returns The relationships metadata schema
 */
export const relationshipsMetadataSchema = z.object({
  blocks: z.array(z.string()).default([]),
  blocked_by: z.array(z.string()).default([]),
});

/**
 * Base artifact metadata schema
 *
 * Common metadata structure shared by all artifact types.
 * This schema enforces consistency across initiatives, milestones, and issues.
 *
 * @remarks
 * - The schema version allows for future migrations
 * - At least one event (typically 'draft') is required
 * - All artifacts must have an assignee and creator
 * @returns The artifact metadata schema
 */
export const artifactMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  priority: z.enum(Object.values(CPriority) as [string, ...string[]]),
  estimation: z.enum(Object.values(CEstimationSize) as [string, ...string[]]),
  created_by: actorSchema,
  assignee: actorSchema,
  schema_version: z
    .string()
    .regex(
      /^\d+\.\d+\.\d+$/,
      'Schema version must be in semver format (e.g., 0.1.0)',
    ),
  relationships: relationshipsMetadataSchema,
  events: z.array(eventMetadataSchema).min(1, 'At least one event is required'),
});

/**
 * Type exports inferred from schemas
 * @property EventMetadataSchema - The type for an event metadata
 * @property RelationshipsMetadataSchema - The type for relationships metadata
 * @property ArtifactMetadataSchema - The type for artifact metadata
 */
export type EventMetadataSchema = z.infer<typeof eventMetadataSchema>;
export type RelationshipsMetadataSchema = z.infer<
  typeof relationshipsMetadataSchema
>;
export type ArtifactMetadataSchema = z.infer<typeof artifactMetadataSchema>;
