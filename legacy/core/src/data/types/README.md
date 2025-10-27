# Kodebase Types

This directory contains the TypeScript type definitions for the Kodebase project. These types provide compile-time safety and serve as the foundation for the runtime validation schemas.

## Overview

The type system provides:
- **Type safety** at compile time
- **Clear contracts** between modules
- **IntelliSense support** in IDEs
- **Documentation** through JSDoc comments

## Architecture

```
types/
├── constants.ts   # Constant objects and their type aliases
├── base.ts       # Base types shared across all artifacts
├── artifacts.ts  # Artifact-specific type definitions
└── index.ts      # Public API exports
```

### Constants (`constants.ts`)

Defines constant objects using the `as const` assertion for literal types:

```typescript
// Constant objects prefixed with 'C'
export const CArtifact = {
  INITIATIVE: 'initiative',
  MILESTONE: 'milestone',
  ISSUE: 'issue'
} as const;

// Type aliases prefixed with 'T'
export type TArtifact = (typeof CArtifact)[keyof typeof CArtifact];
```

#### Available Constants:
- **`CKodebaseDomain`**: Domains within Kodebase (artifacts, events, tooling)
- **`CArtifact`**: Artifact types (initiative, milestone, issue)
- **`CArtifactEvent`**: Lifecycle events (draft, ready, in_progress, etc.)
- **`CPriority`**: Priority levels (critical, high, medium, low)
- **`CEstimationSize`**: T-shirt sizes (XS, S, M, L, XL)
- **`CEventTrigger`**: Event triggers (artifact_created, manual, branch_created, etc.)
- **`SUPPORTED_SCHEMA_VERSIONS`**: Array of supported schema versions

### Base Types (`base.ts`)

Common types used across all artifact types:

#### Type Aliases
```typescript
export type TKodebaseDomain = (typeof CKodebaseDomain)[keyof typeof CKodebaseDomain];
export type TArtifactEvent = (typeof CArtifactEvent)[keyof typeof CArtifactEvent];
export type TPriority = (typeof CPriority)[keyof typeof CPriority];
export type TEstimationSize = (typeof CEstimationSize)[keyof typeof CEstimationSize];
```

#### Core Interfaces

**`EventMetadata`**: Event tracking structure (v2.0 Schema)
- Immutable event log entry with specific field ordering
- ISO 8601 timestamps required
- Required `trigger` field from `CEventTrigger` constants
- Field order: `event`, `timestamp`, `actor`, `trigger`, `metadata`
- Optional `metadata` object for cascade tracking:
  - `trigger_artifact`: What artifact triggered this cascade
  - `cascade_type`: Type of cascade operation
  - Additional custom fields as needed

**`RelationshipsMetadata`**: Dependency tracking
- `blocks`: Array of artifact IDs this artifact blocks
- `blocked_by`: Array of artifact IDs that block this artifact

**`ArtifactMetadata`**: Common metadata
- Required fields ensure data integrity
- Schema version enables migrations
- Events array tracks lifecycle

**`BaseArtifact`**: Minimal artifact structure
- Extended by specific artifact types
- Optional notes field for context

### Artifact Types (`artifacts.ts`)

Type-specific interfaces extending the base types:

#### Initiative Types
- **`InitiativeContent`**: Strategic content (vision, scope, success criteria)
- **`InitiativeCompletionSummary`**: Post-completion analysis
- **`Initiative`**: Complete initiative structure

#### Milestone Types
- **`MilestoneContent`**: Deliverables and validation criteria
- **`MilestoneCompletionSummary`**: Achievement documentation
- **`Milestone`**: Complete milestone structure

#### Issue Types
- **`IssueContent`**: Summary and acceptance criteria
- **`Challenge`**: Structured problem/solution pairs
- **`IssueDevelopmentProcess`**: Development tracking
- **`IssueCompletionAnalysis`**: Implementation details
- **`IssueReviewDetails`**: PR and review information
- **`Issue`**: Complete issue structure

#### Union Type
```typescript
export type Artifact = Initiative | Milestone | Issue;
```

## Naming Conventions

### Prefixes
- **`C`**: Constant objects (e.g., `CArtifact`)
- **`T`**: Type aliases from constants (e.g., `TArtifact`)
- **`I`**: Interfaces (implicit in interface names)

### Case Styles
- **PascalCase**: Types and interfaces
- **camelCase**: Properties and functions
- **SCREAMING_SNAKE_CASE**: Individual constant values

## Usage Examples

### Using Constants
```typescript
import { CArtifactEvent, CPriority } from '@kodebase/core/types';

// Use constant values
const event = CArtifactEvent.IN_PROGRESS;
const priority = CPriority.HIGH;

// Type checking
function handleEvent(event: TArtifactEvent) {
  if (event === CArtifactEvent.COMPLETED) {
    // Handle completion
  }
}
```

### Creating Typed Objects
```typescript
import type { Issue, ArtifactMetadata } from '@kodebase/core/types';
import { CEventTrigger } from '@kodebase/core/types';

const metadata: ArtifactMetadata = {
  title: 'Implement authentication',
  priority: 'high',
  estimation: 'M',
  created_by: 'John Doe (john@example.com)',
  assignee: 'Jane Smith (jane@example.com)',
  schema_version: '0.2.0',
  relationships: {
    blocks: [],
    blocked_by: ['A.1.1']
  },
  events: [{
    event: 'draft',
    timestamp: new Date().toISOString(),
    actor: 'John Doe (john@example.com)',
    trigger: CEventTrigger.ARTIFACT_CREATED
  }]
};
```

### Type Guards
```typescript
import type { Artifact, Initiative } from '@kodebase/core/types';

function isInitiative(artifact: Artifact): artifact is Initiative {
  return 'content' in artifact && 
         'vision' in artifact.content &&
         'scope' in artifact.content;
}
```

## Best Practices

1. **Import types explicitly** using `import type` for better tree-shaking
2. **Use constants** instead of string literals for enums
3. **Extend interfaces** when adding features to maintain compatibility
4. **Document with JSDoc** for better IDE support
5. **Avoid `any`** - use `unknown` or specific types

## Type vs Schema

- **Types**: Compile-time checking, no runtime overhead
- **Schemas**: Runtime validation, can handle unknown data

Always define types first, then create schemas that match:
```typescript
// Type definition
export interface MyType {
  name: string;
  age: number;
}

// Matching schema
export const mySchema = z.object({
  name: z.string(),
  age: z.number()
});

// Type can be inferred from schema
export type MySchemaType = z.infer<typeof mySchema>;
```

## Event Schema v2.0 System

As of schema v2.0, Kodebase implements a simplified trigger-based event system:

### Event Structure
Each event follows the v2.0 schema with specific field ordering:
```typescript
{
  event: 'draft',                           // State name (required)
  timestamp: '2025-01-07T10:00:00.000Z',    // ISO 8601 timestamp (required)
  actor: 'John Doe (john@example.com)',     // Actor in "Name (email)" format (required)
  trigger: CEventTrigger.ARTIFACT_CREATED,  // What caused the event (required)
  metadata?: {                              // Optional cascade tracking
    trigger_artifact: 'A.1.5',             // What artifact triggered this
    cascade_type: 'dependency_met'          // Type of cascade
  }
}
```

### Trigger System
Events use typed triggers from `CEventTrigger` to indicate causation:
```typescript
// User actions
CEventTrigger.ARTIFACT_CREATED     // Initial creation
CEventTrigger.MANUAL               // Manual state change
CEventTrigger.BRANCH_CREATED       // Git branch created
CEventTrigger.PR_MERGED            // Pull request merged

// System cascades
CEventTrigger.DEPENDENCIES_MET     // Dependencies satisfied
CEventTrigger.DEPENDENCY_COMPLETED // Blocking dependency completed
```

### Cascade Tracking
Cascade events include metadata linking to the triggering artifact:
```typescript
{
  event: 'ready',
  timestamp: '2025-01-07T10:30:00Z',
  actor: 'system',
  trigger: CEventTrigger.DEPENDENCY_COMPLETED,
  metadata: {
    trigger_artifact: 'A.1.3',              // What artifact triggered this cascade
    cascade_type: 'dependency_met',          // Type of cascade
    dependencies_checked: ['A.1.1', 'A.1.2'] // Additional context
  }
}
```

### Benefits of v2.0 Schema
1. **Simplified Structure**: Removed complex correlation tracking
2. **Clear Causation**: Trigger field indicates why event occurred  
3. **Efficient Processing**: Streamlined for better performance
4. **Cascade Transparency**: Easy to trace cascade chains via `trigger_artifact`

For detailed implementation, see the [Events Documentation](../events/README.md).

## Related Documentation

- [Schema Documentation](../schemas/README.md) - Runtime validation
- [Parser Documentation](../parser/README.md) - YAML parsing
- [Validator Documentation](../validator/README.md) - Type detection
- [Events Documentation](../events/README.md) - Event identity system
- [Cascade Documentation](../cascade/README.md) - Cascade automation