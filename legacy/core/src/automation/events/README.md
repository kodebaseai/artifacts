# Event System Utilities

This module provides core utilities for managing events in the Kodebase cascade system, including event building, ordering, and validation for the v2.0 event schema.

## Overview

The event system is the foundation of Kodebase's cascade architecture, providing:
- Event trigger system for cascade automation
- Event builder with fluent API  
- Event ordering and validation
- Helper functions for cascade event creation

## Event Schema v2.0

As of schema v2.0, events have been simplified with a focus on triggers rather than complex correlation tracking:

```typescript
interface EventMetadata {
  event: TArtifactEvent;        // State name (draft, ready, etc.)
  timestamp: string;            // ISO 8601 timestamp  
  actor: string;                // Who triggered the event
  trigger: TEventTrigger;       // What caused the event (required)
  metadata?: Record<string, unknown>; // Optional additional data
}
```

### Key Changes from v1.0:
- **Removed**: `event_id`, `correlation_id`, `parent_event_id` (deprecated fields)
- **Added**: `trigger` field (required) - indicates what caused the event
- **Simplified**: Field ordering: `event`, `timestamp`, `actor`, `trigger`, `metadata`

## Components

### Event Builder (`builder.ts`)

Provides a fluent API for creating events with proper v2.0 schema structure.

```typescript
import { EventBuilder, createEvent } from '@kodebase/core/events';
import { CEventTrigger } from '@kodebase/core/constants';

// Using the builder directly
const event = new EventBuilder()
  .event('ready')
  .timestamp('2025-01-01T12:00:00Z')
  .actor('John Doe (john@example.com)')
  .trigger(CEventTrigger.DEPENDENCIES_MET)
  .metadata({ custom: 'data' })
  .build();

// Using helper function
const simpleEvent = createEvent({
  event: 'draft',
  actor: 'Jane Smith (jane@example.com)',
  trigger: CEventTrigger.ARTIFACT_CREATED
});
```

**Features:**
- Auto-generates timestamp if not provided
- Ensures proper field ordering (v2.0 schema)
- Validates trigger values against CEventTrigger constants
- Type-safe event creation

### Event Ordering (`ordering.ts`)

Utilities for sorting and validating event chronology.

```typescript
import { 
  sortEventsByTimestamp, 
  validateEventChronology,
  getEventsByType,
  getLatestEventByType 
} from '@kodebase/core/events';

// Sort events chronologically
const sorted = sortEventsByTimestamp(events);

// Validate chronological order
validateEventChronology(events); // Throws if out of order

// Filter by event type
const readyEvents = getEventsByType(events, CArtifactEvent.READY);

// Get most recent event of type
const latestCompleted = getLatestEventByType(events, CArtifactEvent.COMPLETED);
```

### Event Identity (`identity.ts`)

Provides utilities that are still used for backwards compatibility and testing.

```typescript
import { generateEventId, isValidEventId } from '@kodebase/core/events';

// Generate a unique event ID (for testing/migration)
const eventId = generateEventId();
// Returns: "evt_1a2b3c4d5e6f7890"

// Validate an event ID format
isValidEventId(eventId); // true
isValidEventId("invalid"); // false
```

**Note**: Event IDs are no longer part of the core schema but may be used in migration scenarios.

## Trigger System

The v2.0 schema uses triggers to indicate what caused each event:

### Available Triggers (CEventTrigger):

```typescript
import { CEventTrigger } from '@kodebase/core/constants';

// User actions
CEventTrigger.MANUAL                // Manual state change
CEventTrigger.ARTIFACT_CREATED     // Initial creation
CEventTrigger.BRANCH_CREATED       // Git branch created
CEventTrigger.PR_CREATED          // Pull request created  
CEventTrigger.PR_READY            // PR marked ready
CEventTrigger.PR_MERGED           // PR merged to main

// System cascade actions
CEventTrigger.DEPENDENCIES_MET     // Dependencies already satisfied
CEventTrigger.DEPENDENCY_COMPLETED // Blocking dependency completed  
CEventTrigger.HAS_DEPENDENCIES     // Has blocking dependencies
CEventTrigger.CHILD_STARTED       // Child artifact started
```

### Trigger Usage Examples:

```typescript
// User creates new issue
const draftEvent = createEvent({
  event: 'draft',
  actor: 'developer@example.com',
  trigger: CEventTrigger.ARTIFACT_CREATED
});

// System detects dependencies are met
const readyEvent = createEvent({
  event: 'ready', 
  actor: 'system',
  trigger: CEventTrigger.DEPENDENCIES_MET,
  metadata: {
    dependencies_checked: ['A.1.1', 'A.1.2']
  }
});

// Cascade when dependency completes
const cascadeEvent = createEvent({
  event: 'ready',
  actor: 'system', 
  trigger: CEventTrigger.DEPENDENCY_COMPLETED,
  metadata: {
    trigger_artifact: 'A.1.3',
    cascade_type: 'dependency_met'
  }
});
```

## Usage in Cascade System

Events drive state changes in the simplified v2.0 architecture:

1. **User Action**: Developer completes an issue
2. **Event Created**: System generates event with appropriate trigger
3. **Cascade Evaluation**: System checks dependent artifacts
4. **Cascade Events**: New events created with `DEPENDENCY_COMPLETED` trigger
5. **Traceability**: `trigger_artifact` metadata links cascade chains

## Cascade Event Metadata

For cascade events, include helpful metadata:

```typescript
const cascadeEvent = createEvent({
  event: 'ready',
  actor: 'system',
  trigger: CEventTrigger.DEPENDENCY_COMPLETED,
  metadata: {
    trigger_artifact: 'A.1.5',           // What artifact triggered this
    cascade_type: 'dependency_met',       // Type of cascade
    cascade_root: 'evt_abc123',          // Optional: root event reference
    dependencies_remaining: 0             // Additional context
  }
});
```

## Error Handling

All utilities include proper error handling:
- `EventOrderingError`: Thrown when events are out of chronological order
- Invalid inputs return `false` or `null` rather than throwing
- Builder validates trigger values against known constants

## Examples

### Creating a Complete Issue Lifecycle

```typescript
import { createEvent } from '@kodebase/core/events';
import { CEventTrigger } from '@kodebase/core/constants';

// Developer creates issue
const created = createEvent({
  event: 'draft',
  actor: 'developer@example.com',
  trigger: CEventTrigger.ARTIFACT_CREATED
});

// Dependencies are met, ready for work
const ready = createEvent({
  event: 'ready',
  actor: 'system',
  trigger: CEventTrigger.DEPENDENCIES_MET,
  metadata: {
    dependencies_checked: ['A.1.1', 'A.1.2']
  }
});

// Developer starts work
const inProgress = createEvent({
  event: 'in_progress',
  actor: 'developer@example.com', 
  trigger: CEventTrigger.BRANCH_CREATED,
  metadata: {
    branch_name: 'feature/A.1.5-new-feature',
    git_ref: 'a1b2c3d'
  }
});

// Work completed and merged
const completed = createEvent({
  event: 'completed',
  actor: 'system',
  trigger: CEventTrigger.PR_MERGED,
  metadata: {
    pr_number: 123,
    merge_commit: 'e4f5g6h'
  }
});
```

### Analyzing Event Triggers

```typescript
function getTriggerMetrics(events: EventMetadata[]) {
  const triggerCounts = events.reduce((acc, event) => {
    acc[event.trigger] = (acc[event.trigger] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const cascadeEvents = events.filter(e => 
    e.trigger === CEventTrigger.DEPENDENCY_COMPLETED ||
    e.trigger === CEventTrigger.DEPENDENCIES_MET
  );
  
  const manualEvents = events.filter(e => 
    e.trigger === CEventTrigger.MANUAL
  );

  return {
    totalEvents: events.length,
    triggerBreakdown: triggerCounts,
    automationRate: (cascadeEvents.length / events.length) * 100,
    manualInterventions: manualEvents.length
  };
}
```

## Best Practices

1. **Use appropriate triggers** - Choose the trigger that best represents what caused the event
2. **Include cascade metadata** - Add `trigger_artifact` and `cascade_type` for cascade events  
3. **Use 'system' actor** - For automated events
4. **Preserve chronological order** - Ensure timestamps are accurate
5. **Test with realistic events** - Use proper triggers in test fixtures

## Migration from v1.0

When migrating from v1.0 to v2.0:

1. **Remove deprecated fields**: `event_id`, `correlation_id`, `parent_event_id`
2. **Add trigger field**: Choose appropriate `CEventTrigger` value
3. **Update field order**: `event`, `timestamp`, `actor`, `trigger`, `metadata`
4. **Replace correlation logic**: Use `trigger_artifact` in metadata for cascade tracking

## Testing

Comprehensive test coverage in:
- `identity.test.ts`: Event ID utilities (backwards compatibility)
- `ordering.test.ts`: Event sorting and filtering
- `builder.test.ts`: Event builder with v2.0 schema
- `correlation.test.ts`: Legacy correlation utilities