# Event Validation System

This module provides business logic validation for the Kodebase event-driven cascade system.

## Overview

Event validation ensures the integrity of the artifact lifecycle by:
- Enforcing state transition rules
- Validating dependency relationships
- Preventing invalid operations

## Components

### State Helpers (`state-helpers.ts`) 🆕

**New in this release:** Simplified artifact-based state transition API that eliminates the need to manually specify artifact types.

📖 **[Complete State Helpers Documentation](./state-helpers.md)**

```typescript
import {
  canTransition,
  getValidTransitions,
  performTransition
} from '@kodebase/core';

// ✨ New: Artifact-based API (recommended)
const artifact = await loadArtifact('A.1.5.yml');

// Check if transition is valid
if (canTransition(artifact, 'ready')) {
  console.log('Can transition to ready state');
}

// Get all valid next states
const validStates = getValidTransitions(artifact);
console.log('Valid transitions:', validStates); // ['in_progress', 'cancelled']

// Perform complete state transition with automatic event creation
performTransition(artifact, 'in_progress', 'John Doe (john@example.com)');

// Blocked state requires reason metadata
performTransition(artifact, 'blocked', actor, { reason: 'Waiting for API design' });
```

**Key Features:**
- **Automatic Type Detection**: Determines artifact type from content structure
  - `vision` field → Initiative
  - `deliverables` field → Milestone
  - `acceptance_criteria` field → Issue
- **Event Creation**: Automatically creates v2.0 schema events with triggers and timestamps
- **Validation**: Enforces state machine rules and metadata requirements
- **Blocked State Validation**: Requires `reason` in metadata when transitioning to blocked state

**vs. Legacy Type-Based API:**
```typescript
// ❌ Old: Manual type specification required
import { canTransition as canTransitionCore } from '@kodebase/core/state-machine';
const artifactType = 'issue'; // Manual detection
if (canTransitionCore(artifactType, getCurrentState(artifact), 'ready')) {
  const event = createEvent({ 
    event: 'ready', 
    actor,
    trigger: CEventTrigger.MANUAL 
  });
  artifact.metadata.events.push(event);
}

// ✅ New: Automatic and simple
if (canTransition(artifact, 'ready')) {
  performTransition(artifact, 'ready', actor);
}
```

### State Machine (`state-machine.ts`)

Implements and enforces the artifact lifecycle state transitions.

```typescript
import {
  canTransition,
  getValidTransitions,
  validateEventOrder,
  getCurrentState,
  isTerminalState
} from '@kodebase/core/event-validation';

// Check if transition is valid
canTransition('issue', CArtifactEvent.DRAFT, CArtifactEvent.READY); // true
canTransition('issue', CArtifactEvent.DRAFT, CArtifactEvent.COMPLETED); // false

// Get all valid next states
getValidTransitions('milestone', CArtifactEvent.READY);
// Returns: [CArtifactEvent.IN_PROGRESS, CArtifactEvent.CANCELLED]

// Validate event history
validateEventOrder(events, 'issue'); // Throws if invalid

// Check terminal states
isTerminalState(CArtifactEvent.COMPLETED); // true
isTerminalState(CArtifactEvent.ARCHIVED); // true
```

**State Transitions:**

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

### Dependency Validation (`dependencies.ts`)

Ensures consistency in artifact relationships.

```typescript
import {
  validateDependencies,
  hasCircularDependency,
  findOrphanedArtifacts,
  getDependents,
  getAllDependencies
} from '@kodebase/core/event-validation';

// Validate all dependencies
validateDependencies(artifactRelationships); // Throws if invalid

// Check for circular dependencies
hasCircularDependency('A.1.1', artifactMap); // true/false

// Find artifacts blocked by cancelled dependencies
const orphaned = findOrphanedArtifacts(artifactMap, statusMap);

// Get all artifacts that depend on a given artifact
const dependents = getDependents('A.1.1', artifactMap);

// Get transitive dependency closure
const allDeps = getAllDependencies('A.1.5', artifactMap);
```

**Validation Rules:**
1. All referenced artifacts must exist
2. Bidirectional consistency (if A blocks B, then B must be blocked by A)
3. No circular dependencies allowed
4. Cancelled dependencies create orphaned artifacts

## Error Classes

### StateTransitionError

Thrown when an invalid state transition is attempted.

```typescript
try {
  validateEventOrder(events, 'issue');
} catch (e) {
  if (e instanceof StateTransitionError) {
    console.error('Invalid state transition:', e.message);
  }
}
```

### DependencyValidationError

Thrown when dependency validation fails.

```typescript
try {
  validateDependencies(artifactMap);
} catch (e) {
  if (e instanceof DependencyValidationError) {
    console.error('Dependency error:', e.message);
  }
}
```

## Integration with Event System v2.0

The validation system works seamlessly with the v2.0 event schema:

```typescript
// Validate cascade event transitions
function validateCascadeEvent(
  artifact: Artifact,
  cascadeEvent: EventMetadata
): boolean {
  const currentState = getCurrentState(artifact);
  const newState = cascadeEvent.event;

  // Ensure cascade follows state rules
  if (!canTransition(artifactType, currentState, newState)) {
    console.error(
      `Invalid cascade: ${currentState} → ${newState}`,
      `Triggered by: ${cascadeEvent.trigger} for ${cascadeEvent.metadata?.trigger_artifact}`
    );
    return false;
  }

  return true;
}

// Track state transitions by trigger
function getStateFlowByTrigger(
  events: EventMetadata[],
  triggerArtifact: string
): StateFlow {
  const cascadeEvents = events.filter(e =>
    e.metadata?.trigger_artifact === triggerArtifact
  );

  return cascadeEvents.map(e => ({
    state: e.event,
    actor: e.actor,
    trigger: e.trigger,
    triggerArtifact: e.metadata?.trigger_artifact,
    timestamp: e.timestamp
  }));
}
```

## Integration with Cascade System

The validation system acts as a gatekeeper:

1. **Before Cascade**: Validate that the proposed state transition is legal
2. **During Cascade**: Ensure dependency relationships allow the cascade
3. **After Cascade**: Verify the resulting state is consistent
4. **Trigger Traceability**: Use trigger system to track cascade chains via `trigger_artifact`

## Event Schema v2.0 Considerations

The validation system has been updated for the v2.0 event schema:

### Key Changes:
- **Removed Fields**: No longer validates `event_id`, `correlation_id`, `parent_event_id` (deprecated)
- **Trigger Validation**: Validates required `trigger` field using `CEventTrigger` constants
- **Cascade Tracking**: Uses `trigger_artifact` metadata instead of `parent_event_id` chains
- **Field Ordering**: Enforces v2.0 field order: `event`, `timestamp`, `actor`, `trigger`, `metadata`

### Trigger-Based Validation:
```typescript
import { CEventTrigger } from '@kodebase/core/constants';

// Validate event has proper trigger
function validateEvent(event: EventMetadata): boolean {
  if (!event.trigger) {
    throw new ValidationError('Event missing required trigger field');
  }
  
  // Validate trigger is a known value
  const validTriggers = Object.values(CEventTrigger);
  if (!validTriggers.includes(event.trigger)) {
    throw new ValidationError(`Invalid trigger: ${event.trigger}`);
  }
  
  return true;
}
```

## Best Practices

1. **Always validate before state changes**: Call `canTransition()` before applying events
2. **Use proper triggers**: Choose appropriate `CEventTrigger` values for events
3. **Check dependencies**: Run `validateDependencies()` after relationship changes  
4. **Handle orphaned artifacts**: Monitor for artifacts blocked by cancelled dependencies
5. **Respect terminal states**: Never attempt to transition from completed/archived states
6. **Include cascade metadata**: Add `trigger_artifact` for cascade events

## Testing

Comprehensive test coverage in:
- `state-machine.test.ts`: State transition validation
- `dependencies.test.ts`: Dependency relationship validation
