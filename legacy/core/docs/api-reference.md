# @kodebase/core API Reference

This document provides a comprehensive API reference for all public exports from the @kodebase/core package.

## Table of Contents

1. [Types](#types)
2. [Schemas](#schemas)
3. [Parser](#parser)
4. [Validator](#validator)
5. [Events](#events)
6. [Cascade Engine](#cascade-engine)
7. [Event Validation](#event-validation)
8. [Metrics](#metrics)
9. [Utilities](#utilities)

## Types

### Type Aliases

```typescript
import {
  TArtifact,
  TArtifactEvent,
  TPriority,
  TEstimationSize,
  TArtifactType
} from '@kodebase/core';
```

#### TArtifact
Union type of all artifact types (Initiative | Milestone | Issue).

#### TArtifactEvent
Valid artifact lifecycle events:
- `'draft'` - Initial creation state
- `'ready'` - Ready for implementation
- `'blocked'` - Blocked by dependencies
- `'cancelled'` - Work cancelled
- `'in_progress'` - Work started
- `'in_review'` - Ready for review
- `'completed'` - Work finished
- `'archived'` - Permanently archived

#### TPriority
Priority levels: `'critical' | 'high' | 'medium' | 'low'`

#### TEstimationSize
T-shirt sizing: `'XS' | 'S' | 'M' | 'L' | 'XL'`

### Interfaces

```typescript
import {
  Initiative,
  Milestone,
  Issue,
  ArtifactMetadata,
  EventMetadata,
  Challenge
} from '@kodebase/core';
```

#### ArtifactMetadata
Common metadata structure for all artifacts:

```typescript
interface ArtifactMetadata {
  title: string;
  priority: TPriority;
  estimation: TEstimationSize;
  created_by: string;  // Format: "Name (email)"
  assignee: string;
  schema_version: string;
  relationships: {
    blocks: string[];
    blocked_by: string[];
  };
  events: EventMetadata[];
}
```

#### EventMetadata
Event tracking with identity fields:

```typescript
interface EventMetadata {
  event_id: string;              // evt_<16-hex-chars>
  timestamp: string;             // ISO 8601
  event: TArtifactEvent;
  actor: string;                 // "Name (email)"
  commit_hash?: string;
  metadata?: {
    correlation_id: string;      // Required for cascades
    parent_event_id: string | null;
    [key: string]: unknown;
  };
}
```

### Constants

```typescript
import {
  CArtifact,
  CArtifactEvent,
  CPriority,
  CEstimationSize
} from '@kodebase/core';
```

Object constants providing enumeration values for type safety.

## Schemas

Zod schemas for runtime validation:

```typescript
import {
  initiativeSchema,
  milestoneSchema,
  issueSchema,
  artifactMetadataSchema,
  eventMetadataSchema
} from '@kodebase/core';
```

### Example Usage

```typescript
import { issueSchema } from '@kodebase/core';

try {
  const validIssue = issueSchema.parse(unknownData);
} catch (error) {
  // Handle validation error
}
```

## Parser

### ArtifactParser

Handles YAML parsing and validation.

```typescript
import { ArtifactParser } from '@kodebase/core';

const parser = new ArtifactParser();
```

#### Methods

##### parseYaml(content: string): unknown
Parse YAML string to JavaScript object without validation.

**Parameters:**
- `content` - YAML string to parse

**Returns:** Parsed JavaScript object

**Throws:** Error if YAML syntax is invalid

**Example:**
```typescript
const data = parser.parseYaml(`
metadata:
  title: "Example"
`);
```

##### parseInitiative(content: string): InitiativeSchema
Parse and validate Initiative YAML.

**Parameters:**
- `content` - Initiative YAML string

**Returns:** Validated Initiative object

**Throws:** Error with detailed validation messages

**Example:**
```typescript
const initiative = parser.parseInitiative(yamlContent);
console.log(initiative.metadata.title);
```

##### parseMilestone(content: string): MilestoneSchema
Parse and validate Milestone YAML.

##### parseIssue(content: string): IssueSchema
Parse and validate Issue YAML.

## Validator

### ArtifactValidator

Type detection and validation for artifact objects.

```typescript
import { ArtifactValidator } from '@kodebase/core';

const validator = new ArtifactValidator();
```

#### Methods

##### validate(data: unknown): ArtifactSchema
Auto-detect artifact type and validate.

**Parameters:**
- `data` - Unknown data to validate

**Returns:** Validated artifact (Initiative | Milestone | Issue)

**Throws:** Error if type cannot be determined or validation fails

**Example:**
```typescript
const artifact = validator.validate(unknownData);
console.log(`Validated ${artifact.metadata.title}`);
```

##### getArtifactType(data: unknown): ArtifactType | null
Detect artifact type from data structure.

**Parameters:**
- `data` - Unknown data to analyze

**Returns:** `'initiative' | 'milestone' | 'issue' | null`

**Example:**
```typescript
const type = validator.getArtifactType(data);
if (type === 'issue') {
  const issue = validator.validateIssue(data);
}
```

##### validateInitiative(data: unknown): InitiativeSchema
Validate data as Initiative.

##### validateMilestone(data: unknown): MilestoneSchema
Validate data as Milestone.

##### validateIssue(data: unknown): IssueSchema
Validate data as Issue.

## Events

Event system utilities for identity and cascade tracking.

### Event Identity

```typescript
import { generateEventId, isValidEventId } from '@kodebase/core';
```

#### generateEventId(): string
Generate unique event ID.

**Returns:** Event ID in format `evt_<16-hex-chars>`

**Example:**
```typescript
const eventId = generateEventId();
// evt_1234567890abcdef
```

#### isValidEventId(eventId: string): boolean
Validate event ID format.

**Parameters:**
- `eventId` - String to validate

**Returns:** true if valid event ID

**Example:**
```typescript
if (isValidEventId(id)) {
  // Process valid event
}
```

### Correlation Tracking

```typescript
import { generateCorrelationId, isValidCorrelationId } from '@kodebase/core';
```

#### generateCorrelationId(initialEvent?: EventMetadata): string
Generate or extract correlation ID.

**Parameters:**
- `initialEvent` - Optional initial event to extract ID from

**Returns:** Correlation ID

**Example:**
```typescript
// New cascade
const correlationId = generateCorrelationId();

// Continue cascade
const correlationId = generateCorrelationId(parentEvent);
```

### Event Builder

```typescript
import { EventBuilder, createEvent, createCascadeEvent } from '@kodebase/core';
```

#### createEvent(options): EventMetadata
Create a new event with auto-generated identity fields.

**Parameters:**
```typescript
{
  event: TArtifactEvent;
  actor: string;
  timestamp?: string;  // Defaults to now
  commitHash?: string;
  metadata?: Record<string, unknown>;
}
```

**Returns:** Complete EventMetadata object

**Example:**
```typescript
const event = createEvent({
  event: 'ready',
  actor: 'John Doe (john@example.com)'
});
```

#### createCascadeEvent(parentEvent, options): EventMetadata
Create cascade event linked to parent.

**Parameters:**
- `parentEvent` - Parent event to link to
- `options` - Event options (see createEvent)

**Returns:** EventMetadata with cascade metadata

**Example:**
```typescript
const cascade = createCascadeEvent(parentEvent, {
  event: 'completed',
  actor: 'system',
  additionalMetadata: {
    cascade_type: 'all_children_complete'
  }
});
```

### Event Ordering

```typescript
import { sortEventsByTimestamp, validateEventChronology } from '@kodebase/core';
```

#### sortEventsByTimestamp(events: EventMetadata[]): EventMetadata[]
Sort events chronologically.

**Parameters:**
- `events` - Array of events to sort

**Returns:** New sorted array (immutable)

#### validateEventChronology(events: EventMetadata[]): void
Ensure events are in chronological order.

**Throws:** EventOrderingError if out of order

## Cascade Engine

Automated state propagation system.

```typescript
import { CascadeEngine } from '@kodebase/core';

const engine = new CascadeEngine();
```

### Methods

#### shouldCascadeToParent(children: TArtifact[], parentState?: TArtifactEvent): CascadeResult
Determine if parent should cascade based on children states.

**Parameters:**
- `children` - Child artifacts to analyze
- `parentState` - Current parent state

**Returns:**
```typescript
{
  shouldCascade: boolean;
  newState?: TArtifactEvent;
  reason?: string;
}
```

**Example:**
```typescript
const result = engine.shouldCascadeToParent(issues, 'ready');
if (result.shouldCascade) {
  console.log(`Parent should transition to ${result.newState}`);
}
```

#### generateCascadeEvent(newState, triggerEvent, cascadeType?): EventMetadata
Generate cascade event with proper metadata.

**Parameters:**
- `newState` - Target state
- `triggerEvent` - Event that triggered cascade
- `cascadeType` - Optional cascade type description

**Returns:** Complete cascade event

#### archiveCancelledChildren(children, parentCompletionEvent): ArchiveEvent[]
Archive cancelled children when parent completes.

**Returns:** Array of archive events to apply

#### getBlockedDependents(artifactId, artifacts): TArtifact[]
Find artifacts blocked by given artifact.

**Parameters:**
- `artifactId` - ID to check
- `artifacts` - All artifacts to search

**Returns:** Array of blocked artifacts

## Event Validation

State machine and dependency validation.

### State Helpers (Recommended) 🆕

Simplified artifact-based API for state transitions:

```typescript
import {
  canTransition,
  getValidTransitions,
  performTransition
} from '@kodebase/core';
```

#### canTransition(artifact, newState): boolean
Check if artifact can transition to new state. Automatically detects artifact type.

**Parameters:**
- `artifact` - Complete artifact object
- `newState` - Target state

**Returns:** true if transition allowed

**Example:**
```typescript
if (canTransition(artifact, 'ready')) {
  // Proceed with transition
}
```

#### getValidTransitions(artifact): TArtifactEvent[]
Get all valid transitions for artifact from current state.

**Parameters:**
- `artifact` - Complete artifact object

**Returns:** Array of valid target states

**Example:**
```typescript
const validStates = getValidTransitions(artifact);
console.log('Can transition to:', validStates);
```

#### performTransition(artifact, newState, actor, metadata?): void
Perform complete state transition with automatic event creation.

**Parameters:**
- `artifact` - Artifact to transition (modified in place)
- `newState` - Target state
- `actor` - Actor performing transition
- `metadata` - Optional event metadata (required for blocked state with reason)

**Example:**
```typescript
// Simple transition
performTransition(artifact, 'ready', 'John Doe (john@example.com)');

// Blocked state requires reason
performTransition(artifact, 'blocked', actor, {
  reason: 'Waiting for API design approval'
});
```

### State Machine (Legacy)

Type-based API for advanced use cases:

```typescript
import {
  canTransition as canTransitionCore,
  getValidTransitions as getValidTransitionsCore,
  validateEventOrder,
  getCurrentState,
  isTerminalState
} from '@kodebase/core';
```

#### canTransition(artifactType, fromState, toState): boolean
Check if state transition is valid.

**Parameters:**
- `artifactType` - Type of artifact
- `fromState` - Current state
- `toState` - Target state

**Returns:** true if transition allowed

**Example:**
```typescript
if (canTransitionCore('issue', 'draft', 'ready')) {
  // Proceed with transition
}
```

#### getValidTransitions(artifactType, currentState): TArtifactEvent[]
Get all valid transitions from current state.

**Returns:** Array of valid target states

#### getCurrentState(artifact): TArtifactEvent | null
Get current state from latest event.

#### isTerminalState(state): boolean
Check if state is terminal (completed/archived).

### Dependency Validation

```typescript
import {
  validateDependencies,
  hasCircularDependency,
  findOrphanedArtifacts,
  getDependents
} from '@kodebase/core';
```

#### validateDependencies(artifacts): DependencyValidation
Comprehensive dependency validation.

**Returns:**
```typescript
{
  isValid: boolean;
  errors: Array<{
    type: string;
    artifactId: string;
    message: string;
    details?: any;
  }>;
}
```

#### hasCircularDependency(artifactId, artifacts): boolean
Check for circular dependencies.

## Metrics

Productivity metrics calculations.

### Time Metrics

```typescript
import {
  calculateCycleTime,
  calculateLeadTime,
  calculateBlockedTime,
  getDurationInMinutes,
  formatDuration
} from '@kodebase/core';
```

#### calculateCycleTime(events): number | null
Calculate time from in_progress to completed.

**Parameters:**
- `events` - Event history

**Returns:** Duration in minutes or null

**Example:**
```typescript
const cycleTime = calculateCycleTime(issue.metadata.events);
if (cycleTime) {
  console.log(`Cycle time: ${formatDuration(cycleTime)}`);
}
```

#### calculateLeadTime(events): number | null
Calculate time from ready to completed.

#### calculateBlockedTime(events): number
Calculate total time in blocked state.

#### formatDuration(minutes): string
Format minutes to human-readable string.

**Example:**
```typescript
formatDuration(90);  // "1 hour 30 minutes"
formatDuration(45);  // "45 minutes"
```

### Velocity Metrics

```typescript
import {
  calculateDailyVelocity,
  calculateWeeklyVelocity,
  getVelocityTrend
} from '@kodebase/core';
```

#### calculateDailyVelocity(artifacts, days): number
Calculate average items completed per day.

**Parameters:**
- `artifacts` - Artifacts to analyze
- `days` - Number of days to look back

**Returns:** Items per day

#### calculateWeeklyVelocity(artifacts, weeks): number
Calculate average items completed per week.

#### getVelocityTrend(artifacts, days): VelocityTrend
Compare velocity between periods.

**Returns:**
```typescript
{
  current: number;
  previous: number;
  percentageChange: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}
```

### Progress Metrics

```typescript
import {
  getWorkInProgressCount,
  calculateThroughput
} from '@kodebase/core';
```

#### getWorkInProgressCount(artifacts): number
Count artifacts currently in progress.

#### calculateThroughput(artifacts, startDate, endDate): number
Count completed items in date range.

## Utilities

### Timestamp Utilities

```typescript
import {
  formatTimestamp,
  parseTimestamp,
  isValidTimestamp
} from '@kodebase/core';
```

#### formatTimestamp(): string
Get current UTC time as ISO 8601.

**Returns:** Timestamp string

**Example:**
```typescript
const now = formatTimestamp();
// "2025-01-14T12:00:00.000Z"
```

#### parseTimestamp(timestamp: string): Date
Parse and validate ISO 8601 timestamp.

**Throws:** Error if invalid format

#### isValidTimestamp(timestamp: string): boolean
Check if string is valid ISO 8601.

### Actor Utilities

```typescript
import {
  formatActor,
  parseActor,
  isValidActor,
  type ActorInfo
} from '@kodebase/core';
```

#### formatActor(name: string, email: string): string
Format actor string.

**Parameters:**
- `name` - Person's name
- `email` - Email address

**Returns:** Formatted string "Name (email)"

**Example:**
```typescript
const actor = formatActor('John Doe', 'john@example.com');
// "John Doe (john@example.com)"
```

#### parseActor(actorString: string): ActorInfo
Parse actor string to components.

**Returns:**
```typescript
{
  name: string;
  email: string;
}
```

**Throws:** Error if invalid format

#### isValidActor(actorString: string): boolean
Check if string matches actor format.

## Error Handling

All validation functions provide detailed error messages:

```typescript
try {
  const artifact = parser.parseIssue(invalidYaml);
} catch (error) {
  console.error(error.message);
  // "Issue validation failed: metadata.priority: Invalid enum value.
  //  Expected "critical" | "high" | "medium" | "low", received "urgent""
}
```

## Best Practices

1. **Always validate external data** - Use validator before processing
2. **Handle errors gracefully** - All methods can throw
3. **Use type guards** - Check artifact type before casting
4. **Maintain event order** - Events must be chronological
5. **Preserve correlation** - Use createCascadeEvent for related events

## Migration Guide

See [Migration Guide](./migration-guide.md) for upgrading from manual YAML editing.
