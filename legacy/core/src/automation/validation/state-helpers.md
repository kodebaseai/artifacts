# State Helpers

Simplified artifact-based state transition API that eliminates friction point FP-010 (state validation taking 1-2 minutes per transition).

## Overview

The state helpers module provides a streamlined API for artifact state transitions by:
- **Automatic Type Detection**: No need to manually specify artifact types
- **Event Management**: Automatic v2.0 event creation with triggers and timestamps
- **Validation**: Built-in state machine rule enforcement
- **Simplified API**: One function call instead of multiple steps

## API Reference

### canTransition(artifact, newState): boolean

Check if an artifact can transition to a new state.

```typescript
import { canTransition } from '@kodebase/core';

const artifact = await loadArtifact('A.1.5.yml');

if (canTransition(artifact, 'ready')) {
  console.log('✅ Can transition to ready');
} else {
  console.log('❌ Cannot transition to ready');
}
```

**Parameters:**
- `artifact: Artifact` - Complete artifact object
- `newState: TArtifactEvent` - Target state

**Returns:** `boolean` - True if transition is valid

**Automatic Type Detection:**
- `vision` field → Initiative
- `deliverables` field → Milestone
- `acceptance_criteria` field → Issue

### getValidTransitions(artifact): TArtifactEvent[]

Get all valid next states for an artifact from its current state.

```typescript
import { getValidTransitions } from '@kodebase/core';

const validStates = getValidTransitions(artifact);
console.log('Available transitions:', validStates);
// Output: ['in_progress', 'cancelled']
```

**Parameters:**
- `artifact: Artifact` - Complete artifact object

**Returns:** `TArtifactEvent[]` - Array of valid target states

### performTransition(artifact, newState, actor, metadata?): void

Perform a complete state transition with automatic event creation.

```typescript
import { performTransition } from '@kodebase/core';

// Simple transition
performTransition(artifact, 'ready', 'John Doe (john@example.com)');

// Blocked state requires reason metadata
performTransition(artifact, 'blocked', 'John Doe (john@example.com)', {
  reason: 'Waiting for API design approval'
});
```

**Parameters:**
- `artifact: Artifact` - Artifact to transition (modified in place)
- `newState: TArtifactEvent` - Target state
- `actor: string` - Actor performing transition (format: "Name (email)")
- `metadata?: Record<string, unknown>` - Optional event metadata

**Special Requirements:**
- **Blocked state**: Must include `reason` in metadata
- **Event creation**: Automatically generates v2.0 events with `trigger`, `timestamp`, and proper field ordering

## Error Handling

### StateTransitionError

Thrown when an invalid state transition is attempted.

```typescript
import { performTransition, StateTransitionError } from '@kodebase/core';

try {
  performTransition(artifact, 'completed', actor);
} catch (error) {
  if (error instanceof StateTransitionError) {
    console.error('Invalid transition:', error.message);
    // Error includes current state and valid transitions
  }
}
```

### Blocked State Validation

```typescript
try {
  // ❌ This will throw - no reason provided
  performTransition(artifact, 'blocked', actor);
} catch (error) {
  console.error('Blocked state requires reason:', error.message);
}

// ✅ This works - reason provided
performTransition(artifact, 'blocked', actor, {
  reason: 'Waiting for external dependency'
});
```

## Migration from Legacy API

### Before (Type-based API)

```typescript
import {
  canTransition as canTransitionCore,
  getCurrentState,
  createEvent
} from '@kodebase/core';

// Manual type detection
const artifactType = artifact.content.acceptance_criteria ? 'issue' :
                    artifact.content.deliverables ? 'milestone' : 'initiative';

// Manual validation
const currentState = getCurrentState(artifact);
if (canTransitionCore(artifactType, currentState, 'ready')) {
  // Manual event creation
  const event = createEvent({
    event: 'ready',
    actor: 'John Doe (john@example.com)',
    trigger: CEventTrigger.MANUAL
  });
  artifact.metadata.events.push(event);
}
```

### After (Artifact-based API)

```typescript
import { canTransition, performTransition } from '@kodebase/core';

// Automatic type detection and event creation
if (canTransition(artifact, 'ready')) {
  performTransition(artifact, 'ready', 'John Doe (john@example.com)');
}
```

## State Machine Rules

The helpers enforce the Kodebase Methodology v2.0 state machine:

```
DRAFT → READY | BLOCKED | CANCELLED
BLOCKED → READY | CANCELLED
READY → IN_PROGRESS | CANCELLED
IN_PROGRESS → IN_REVIEW | CANCELLED
IN_REVIEW → COMPLETED | CANCELLED
COMPLETED → (terminal)
CANCELLED → DRAFT | ARCHIVED
ARCHIVED → (terminal)
```

## Event Creation v2.0

The `performTransition` function creates events using the v2.0 schema:

```typescript
// Generated event structure
{
  event: 'ready',                      // Target state
  timestamp: '2025-01-07T15:30:00Z',   // Auto-generated ISO 8601
  actor: 'John Doe (john@example.com)', // From parameter
  trigger: 'manual',                   // CEventTrigger.MANUAL for user actions
  metadata: {                          // Optional metadata
    reason: 'Dependencies completed'   // For blocked states, etc.
  }
}
```

**Key Features:**
- **v2.0 Schema**: Uses simplified event structure without deprecated fields
- **Automatic Triggers**: Assigns `CEventTrigger.MANUAL` for user-initiated transitions
- **Type Safety**: All triggers use proper `CEventTrigger` constants
- **Field Ordering**: Maintains correct v2.0 field order in generated events

## Performance Impact

**Addresses FP-010**: Reduces state validation time from 1-2 minutes to near-instantaneous by:
- Eliminating manual type detection
- Providing single-function API
- Automatic error handling
- Built-in validation
- v2.0 schema compliance

## Testing

Comprehensive test coverage in `state-helpers.test.ts`:
- All state transitions for each artifact type
- Error cases and validation
- Blocked state metadata requirements
- Edge cases and boundary conditions

## Related

- [State Machine Documentation](./README.md#state-machine) - Lower-level type-based API
- [Event System](../events/README.md) - Event creation and management
- [Cascade Engine](../cascade/README.md) - Automatic state propagation
