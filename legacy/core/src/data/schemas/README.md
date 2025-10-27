# Kodebase Schemas

This directory contains the runtime validation schemas for Kodebase artifacts. These schemas define the structure and validation rules for Initiatives, Milestones, and Issues using [Zod](https://zod.dev/).

## Overview

The schema system provides:
- **Runtime validation** for artifact YAML files
- **Type safety** through TypeScript type inference
- **Comprehensive error messages** for validation failures
- **Future-proof design** with schema versioning support

## Architecture

```
schemas/
├── base.ts       # Common schemas shared across all artifacts
├── artifacts.ts  # Artifact-specific schemas (Initiative, Milestone, Issue)
└── index.ts      # Public API exports
```

### Base Schemas (`base.ts`)

Defines the foundational schemas used by all artifact types:

- **`actorSchema`**: Validates actor format for humans and AI agents
  - Human format: `"Name (email@domain.com)"`
  - AI agent format: `"agent.[TYPE].[SESSION]@[TENANT].kodebase.ai"`

- **`eventMetadataSchema`**: Event tracking in artifact lifecycle (v2.0 Schema)
  - Immutable, append-only log structure
  - ISO 8601 timestamps
  - Required `trigger` field from `CEventTrigger` constants
  - Specific field ordering: `event`, `timestamp`, `actor`, `trigger`, `metadata`
  - Optional `metadata` object for cascade tracking:
    - `trigger_artifact`: What artifact triggered this cascade
    - `cascade_type`: Type of cascade operation

- **`relationshipsMetadataSchema`**: Dependency tracking
  - `blocks`: Artifacts that this artifact blocks
  - `blocked_by`: Artifacts that block this artifact

- **`artifactMetadataSchema`**: Common metadata for all artifacts
  - Required fields: title, priority, estimation, created_by, assignee
  - Schema version for migration support
  - At least one event required (typically 'draft')

### Artifact Schemas (`artifacts.ts`)

Type-specific schemas with their unique content structures:

#### Initiative Schema
```typescript
{
  metadata: ArtifactMetadata,
  content: {
    vision: string,      // Min 10 chars
    scope: string,       // Min 10 chars
    success_criteria: string[]  // Min 1 item, each min 5 chars
  },
  completion_summary?: {
    business_impact: string,           // Required when present
    strategic_achievements: string[],  // Required when present
    organizational_learning: string,   // Required when present
    architecture_evolution?: string,
    future_roadmap_impact?: string
  },
  notes?: string
}
```

#### Milestone Schema
```typescript
{
  metadata: ArtifactMetadata,
  content: {
    summary: string,
    deliverables: string[],  // Min 1 item
    validation: string[]     // Min 1 item
  },
  completion_summary?: {
    key_achievements: string[],     // Required when present
    strategic_decisions?: string[],
    knowledge_generated: string[],  // Required when present
    team_impact?: string,
    next_milestone_insights?: string
  },
  notes?: string,
  issue_breakdown_rationale?: string
}
```

#### Issue Schema
```typescript
{
  metadata: ArtifactMetadata,
  content: {
    summary: string,
    acceptance_criteria: string[]  // Min 1 item
  },
  development_process?: {
    spikes_generated?: string[],
    alternatives_considered: string[],  // Required when present
    challenges_encountered?: Challenge[]
  },
  completion_analysis?: {
    key_insights: string[],            // Required when present
    implementation_approach: string,   // Required when present
    knowledge_generated?: string[],
    manual_testing_steps: string[]     // Required when present
  },
  review_details?: {
    url?: string,  // Must be valid URL
    approved_by?: string[]
  },
  notes?: string,
  technical_approach?: string  // Deprecated
}
```

## Key Design Decisions

### 1. Optional Sections with Required Fields
Some sections (like `completion_summary`) are optional, but when present, certain fields within them are required. This ensures data quality when sections are used.

```typescript
// Example: Initiative completion summary
const initiativeCompletionSummarySchema = z.object({
  business_impact: z.string().min(1, 'Business impact is required when completing an initiative'),
  strategic_achievements: z.array(z.string()).min(1, 'At least one strategic achievement is required'),
  // ...
}).optional();  // The entire section is optional
```

### 2. Structured Challenge Format
Challenges are documented using a structured format for better knowledge capture:

```typescript
interface Challenge {
  challenge: string,  // What problem was encountered
  solution: string    // How it was resolved
}
```

### 3. Flexible Schema Versioning
Schema version uses regex validation instead of literal values to support future migrations:

```typescript
schema_version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Schema version must be in semver format')
```

### 4. Human and AI Actor Support
The actor schema supports both human contributors and AI agents with distinct patterns:

```typescript
// Human: "John Doe (john@example.com)"
// AI Agent: "agent.CLAUDE.ABC123@acme.kodebase.ai"
```

## Usage Examples

### Validating an Artifact

```typescript
import { issueSchema } from '@kodebase/core/schemas';

try {
  const validatedIssue = issueSchema.parse(rawData);
  console.log('Issue is valid:', validatedIssue);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation failed:', error.errors);
  }
}
```

### Type Inference

```typescript
import type { IssueSchema } from '@kodebase/core/schemas';

// TypeScript knows all the fields and their types
const issue: IssueSchema = {
  metadata: { /* ... */ },
  content: {
    summary: 'Implement user authentication',
    acceptance_criteria: ['User can log in', 'User can log out']
  }
};
```

### Extending Schemas

```typescript
import { issueSchema } from '@kodebase/core/schemas';

// Add custom fields while maintaining base validation
const customIssueSchema = issueSchema.extend({
  custom_field: z.string().optional()
});
```

## Error Handling

Zod provides detailed error messages with paths to invalid fields:

```typescript
// Example error output
{
  path: ['metadata', 'priority'],
  message: 'Invalid enum value. Expected "critical" | "high" | "medium" | "low"'
}
```

## Migration Strategy

The schema version field enables graceful migrations:

1. **Version Detection**: Check `schema_version` to determine artifact format
2. **Migration Logic**: Apply transformations based on version differences
3. **Validation**: Validate against the appropriate schema version

## Best Practices

1. **Always validate** artifact data before processing
2. **Use type inference** for compile-time safety
3. **Handle validation errors** gracefully with user-friendly messages
4. **Document schema changes** in migration guides
5. **Test edge cases** including optional fields and empty arrays

## Event Schema v2.0 Validation

As of schema v2.0, the event structure has been simplified with trigger-based tracking:

### Core Event Structure
```typescript
const eventMetadataSchema = z.object({
  event: z.enum(Object.values(CArtifactEvent) as [string, ...string[]]),
  timestamp: z.string().datetime({ message: 'Timestamp must be in ISO 8601 format' }),
  actor: actorSchema,
  trigger: z.string().refine(...), // Validates against CEventTrigger values
  metadata: z.record(z.unknown()).optional(),
});
```

### Field Ordering Enforcement
The v2.0 schema enforces specific field ordering for consistency:
1. **`event`** - State name (draft, ready, etc.)
2. **`timestamp`** - ISO 8601 timestamp
3. **`actor`** - Who triggered the event
4. **`trigger`** - What caused the event
5. **`metadata`** - Optional additional data

### Trigger Validation
Events must specify a valid trigger from `CEventTrigger`:

```typescript
// Available triggers include:
CEventTrigger.ARTIFACT_CREATED     // Initial creation
CEventTrigger.MANUAL               // Manual state change
CEventTrigger.BRANCH_CREATED       // Git branch created
CEventTrigger.DEPENDENCY_COMPLETED // Blocking dependency completed
CEventTrigger.DEPENDENCIES_MET     // Dependencies satisfied
// ... and more
```

### Example Valid Events
```typescript
// Basic event
{
  event: "draft",
  timestamp: "2025-01-07T00:00:00Z",
  actor: "John Doe (john@example.com)",
  trigger: "artifact_created"
}

// Cascade event with metadata
{
  event: "ready",
  timestamp: "2025-01-07T10:30:00Z",
  actor: "system",
  trigger: "dependency_completed",
  metadata: {
    trigger_artifact: "A.1.3",
    cascade_type: "dependency_met",
    dependencies_checked: ["A.1.1", "A.1.2"]
  }
}
```

### Common Validation Errors
```typescript
// Missing trigger field
{
  event: "draft",
  timestamp: "2025-01-07T00:00:00Z",
  actor: "John Doe (john@example.com)"
  // Missing trigger!
}
// Error: trigger: Trigger is required

// Invalid trigger value
{
  event: "draft",
  timestamp: "2025-01-07T00:00:00Z",
  actor: "John Doe (john@example.com)",
  trigger: "invalid_trigger"
}
// Error: trigger: Invalid trigger value
```

### Use with Event Builder v2.0
For easier event creation with proper validation:

```typescript
import { createEvent } from '@kodebase/core/events';
import { CEventTrigger } from '@kodebase/core/constants';

const event = createEvent({
  event: 'ready',
  actor: 'John Doe (john@example.com)',
  trigger: CEventTrigger.DEPENDENCIES_MET,
  metadata: {
    dependencies_checked: ['A.1.1', 'A.1.2']
  }
});
// Automatically generates timestamp and ensures proper field ordering
```

## Related Documentation

- [Parser Documentation](../parser/README.md) - How to parse YAML content
- [Validator Documentation](../validator/README.md) - Auto-detection and validation
- [Type Definitions](../types/README.md) - TypeScript interfaces and constants
- [Events Documentation](../events/README.md) - Event builder and identity system