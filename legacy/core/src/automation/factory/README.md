# Artifact Factory

The Artifact Factory provides automated creation of valid Kodebase artifacts with auto-generated IDs, populated metadata fields, and initial events. This addresses friction points FP-001 (ID generation) and FP-003 (YAML boilerplate) by dramatically reducing manual artifact creation overhead.

## Time Savings

The factory eliminates friction points that together consume 5-8 minutes per artifact creation:
- **FP-001**: Manual ID generation (2-3 minutes) → Automated sequential IDs
- **FP-003**: YAML boilerplate editing (3-5 minutes) → Auto-populated metadata

**Result**: ~80% reduction in artifact creation time, from 8 minutes to ~1.5 minutes

## Features

### Auto-Generated Sequential IDs
- **Initiatives**: A, B, C, D, ... (fills gaps in sequence)
- **Milestones**: A.1, A.2, B.1, B.2, ... (parent.1, parent.2, ...)
- **Issues**: A.1.1, A.1.2, A.2.1, ... (milestone.1, milestone.2, ...)

### Auto-Populated Metadata
- Creates formatted actor strings from git config info
- Generates initial draft events with proper timestamps
- Sets sensible estimation defaults (L for initiatives, M for milestones, S for issues)
- Validates parent existence before creating children
- Ensures all required fields are populated

### Type Safety
- Full TypeScript support with strict typing
- Compile-time validation of required fields
- Auto-completion in IDEs
- Runtime validation with clear error messages

## Quick Start

```typescript
import { ArtifactFactory } from '@kodebase/core/factory';

// Create factory (can pass existing artifacts for ID generation)
const factory = new ArtifactFactory(existingArtifacts);

// Get user info from git config
const user = { name: 'John Doe', email: 'john@example.com' };

// Create an initiative
const initiative = factory.createInitiative({
  user,
  title: 'Core Platform Development',
  vision: 'Build a scalable platform',
  scope: 'Backend APIs and core services',
  success_criteria: ['APIs deployed', 'Performance targets met']
});
// Result: { artifact: Initiative, id: 'A' }

// Create a milestone under the initiative
const milestone = factory.createMilestone({
  user,
  title: 'API Foundation',
  parent_initiative_id: 'A',
  summary: 'Core API infrastructure',
  deliverables: ['REST API', 'Authentication'],
  validation: ['All endpoints tested']
});
// Result: { artifact: Milestone, id: 'A.1' }

// Create an issue under the milestone
const issue = factory.createIssue({
  user,
  title: 'Implement user authentication',
  parent_milestone_id: 'A.1',
  summary: 'Add secure user authentication system',
  acceptance_criteria: [
    'Users can register with email/password',
    'Users can login and receive JWT token'
  ]
});
// Result: { artifact: Issue, id: 'A.1.1' }
```

## API Reference

### ArtifactFactory

#### Constructor
```typescript
new ArtifactFactory(existingArtifacts?: Map<string, unknown>)
```
Creates a new factory instance. Pass existing artifacts for proper ID generation.

#### Methods

##### `createInitiative(options: CreateInitiativeOptions): FactoryResult<Initiative>`
Creates a new initiative with auto-generated ID.

**Options:**
- `user: UserInfo` - User from git config (required)
- `title: string` - Human-readable title (required)
- `vision: string` - Long-term vision (required)
- `scope: string` - What's included/excluded (required)
- `success_criteria: string[]` - Success criteria (required)
- `priority?: TPriority` - Priority level (default: 'medium')
- `estimation?: TEstimationSize` - Effort estimation (default: 'L')
- `schema_version?: string` - Schema version (default: '0.2.0')
- `blocked_by?: string[]` - Blocking artifacts (default: [])
- `notes?: string` - Optional notes

##### `createMilestone(options: CreateMilestoneOptions): FactoryResult<Milestone>`
Creates a new milestone with auto-generated ID.

**Options:**
- `user: UserInfo` - User from git config (required)
- `title: string` - Human-readable title (required)
- `parent_initiative_id: string` - Parent initiative ID (required)
- `summary: string` - Milestone summary (required)
- `deliverables: string[]` - List of deliverables (required)
- `validation: string[]` - Validation criteria (required)
- `priority?: TPriority` - Priority level (default: 'medium')
- `estimation?: TEstimationSize` - Effort estimation (default: 'M')
- `schema_version?: string` - Schema version (default: '0.2.0')
- `blocked_by?: string[]` - Blocking artifacts (default: [])
- `notes?: string` - Optional notes

##### `createIssue(options: CreateIssueOptions): FactoryResult<Issue>`
Creates a new issue with auto-generated ID.

**Options:**
- `user: UserInfo` - User from git config (required)
- `title: string` - Human-readable title (required)
- `parent_milestone_id: string` - Parent milestone ID (required)
- `summary: string` - Issue summary (required)
- `acceptance_criteria: string[]` - Acceptance criteria (required)
- `priority?: TPriority` - Priority level (default: 'medium')
- `estimation?: TEstimationSize` - Effort estimation (default: 'S')
- `schema_version?: string` - Schema version (default: '0.2.0')
- `blocked_by?: string[]` - Blocking artifacts (default: [])
- `notes?: string` - Optional notes

##### `updateContext(newArtifacts: Map<string, unknown>): void`
Updates the factory context with additional existing artifacts.

##### `getContext(): FactoryContext`
Returns the current factory context (useful for debugging).

### Types

#### `UserInfo`
```typescript
interface UserInfo {
  name: string;    // From git config user.name
  email: string;   // From git config user.email
}
```

#### `FactoryResult<T>`
```typescript
interface FactoryResult<T extends Artifact> {
  artifact: T;  // The created artifact
  id: string;   // The auto-generated ID
}
```

## Usage Patterns

### With Git Config Integration
```typescript
// In a CLI tool or application
const userInfo = {
  name: execSync('git config user.name', { encoding: 'utf8' }).trim(),
  email: execSync('git config user.email', { encoding: 'utf8' }).trim()
};

const factory = new ArtifactFactory(loadExistingArtifacts());
const result = factory.createInitiative({ user: userInfo, /* ... */ });
```

### Custom Defaults
```typescript
const result = factory.createInitiative({
  user,
  title: 'High Priority Initiative',
  vision: 'Strategic vision',
  scope: 'Defined scope',
  success_criteria: ['Criteria'],
  priority: CPriority.HIGH,         // Override default
  estimation: CEstimationSize.EXTRA_LARGE,  // Override default
  schema_version: '1.0.0'           // Use specific version
});
```

### Hierarchical Creation
```typescript
// Create complete hierarchy
const initiative = factory.createInitiative({ /* ... */ });
console.log(initiative.id); // 'A'

const milestone1 = factory.createMilestone({
  /* ... */,
  parent_initiative_id: initiative.id
});
console.log(milestone1.id); // 'A.1'

const milestone2 = factory.createMilestone({
  /* ... */,
  parent_initiative_id: initiative.id
});
console.log(milestone2.id); // 'A.2'

const issue1 = factory.createIssue({
  /* ... */,
  parent_milestone_id: milestone1.id
});
console.log(issue1.id); // 'A.1.1'

const issue2 = factory.createIssue({
  /* ... */,
  parent_milestone_id: milestone1.id
});
console.log(issue2.id); // 'A.1.2'
```

### Error Handling
```typescript
try {
  const result = factory.createMilestone({
    user,
    title: 'Orphaned Milestone',
    parent_initiative_id: 'Z', // Doesn't exist
    summary: 'Summary',
    deliverables: ['Deliverable'],
    validation: ['Validation']
  });
} catch (error) {
  console.error(error.message);
  // "Parent initiative 'Z' not found. Parent must exist before creating children."
}
```

## Implementation Details

### ID Generation Strategy
- **Initiatives**: Scans A-Z, returns first available letter
- **Milestones**: Scans parent.1, parent.2, ..., returns next sequential number
- **Issues**: Scans milestone.1, milestone.2, ..., returns next sequential number
- **Gap Filling**: Always fills gaps in sequences (A, C, D → next is B)

### Event Creation (v2.0 Schema)

Each created artifact includes an initial 'draft' event following the v2.0 event schema:

```typescript
{
  event: 'draft',                           // State name
  timestamp: '2025-01-07T14:30:00.000Z',   // Auto-generated ISO 8601
  actor: 'John Doe (john@example.com)',    // From user info
  trigger: CEventTrigger.ARTIFACT_CREATED, // Creation trigger
  metadata: {}                              // Empty for initial events
}
```

**Event Features:**
- **v2.0 Schema**: Uses simplified event structure without deprecated fields
- **Trigger System**: All events use `ARTIFACT_CREATED` trigger for factory-created artifacts
- **Auto-Generated Timestamps**: Precise ISO 8601 timestamps
- **Formatted Actors**: Consistent "Name (email)" format from git config
- **Type Safety**: Proper TypeScript types for all event fields

### Parent Validation
- Milestones require parent initiative to exist
- Issues require parent milestone to exist
- Clear error messages when parents are missing
- Type-safe parent ID validation

## Best Practices

1. **Load Existing Context**: Always pass existing artifacts to the constructor for proper ID generation
2. **Use Git Config**: Get user info from git config for consistency with the Kodebase methodology
3. **Handle Errors**: Wrap factory calls in try-catch blocks for graceful error handling
4. **Update Context**: Use `updateContext()` if artifacts are created outside the factory
5. **Validate Hierarchies**: Ensure parent artifacts exist before creating children

## Integration

The factory integrates seamlessly with existing Kodebase utilities:
- **Event System v2.0**: Uses modern event builders with trigger-based event creation
- **Actor Formatting**: Leverages actor utilities for consistent "Name (email)" format
- **TypeScript Patterns**: Follows established patterns and naming conventions
- **Schema Validation**: Compatible with v2.0 artifact schema validation
- **ID Generation**: Uses robust sequential ID generation with gap-filling
- **Cascade System**: Creates events that integrate with the trigger-based cascade system

## Future Enhancements

Planned improvements (not in current scope):
- Bulk creation methods for multiple artifacts
- Template-based creation with predefined structures
- Integration with file system operations for automatic persistence
- CLI commands that wrap factory methods for direct usage
