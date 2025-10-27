# Cascade Engine

The core engine that implements automatic state propagation in the Kodebase event-driven system.

## Overview

The Cascade Engine automates artifact state transitions based on child artifact states, implementing the key automation that makes Kodebase's event-driven architecture work. With the event identity system (v0.2.0), cascade operations save approximately 140 minutes per complex hierarchy update by eliminating manual status propagation.

## Core Concepts

### What is a Cascade?

A cascade is an automatic state transition triggered by changes in related artifacts:
- When all issues in a milestone complete → milestone transitions to `in_review`
- When the first issue starts → milestone transitions to `in_progress`
- When a parent completes → cancelled children are archived

### Cascade Types

1. **Parent Completion Cascade**: Triggered when all active children complete
2. **Parent Auto-Start Cascade**: Triggered when first child begins work
3. **Archive Cascade**: Triggered when parent completes with cancelled children
4. **Dependency Block Cascade**: Identifies artifacts affected by cancellations
5. **Completion Analysis Cascade**: Analyzes what would be unblocked if specific artifacts complete

### Completion Analysis

The `CompletionCascadeAnalyzer` provides instant completion checking to answer "what happens if I complete this artifact?":
- **Unblocked Artifacts**: Identifies artifacts that would become available for work
- **Auto-Completed Parents**: Detects parents that would cascade to completion
- **Performance**: Sub-second analysis for complex dependency trees
- **Recommendations**: Suggests optimal work prioritization

## Usage

### Basic Example

```typescript
import { CascadeEngine } from '@kodebase/core/cascade';

const engine = new CascadeEngine();

// Check if parent should cascade based on children
const result = engine.shouldCascadeToParent(childArtifacts, parentState);
if (result.shouldCascade) {
  console.log(`Parent should transition to ${result.newState}`);
  console.log(`Reason: ${result.reason}`);
}
```

### Generating Cascade Events

```typescript
// Create a properly formatted cascade event
const cascadeEvent = engine.generateCascadeEvent(
  CArtifactEvent.IN_REVIEW,
  triggerEvent,
  'all_children_complete'
);

// Event includes:
// - event field first for v2.0 schema
// - timestamp in ISO 8601 format
// - actor (system for cascades)
// - trigger indicating cascade type
// - metadata with cascade details
```

### Completion Analysis

```typescript
import { CompletionCascadeAnalyzer } from '@kodebase/core/cascade';

const analyzer = new CompletionCascadeAnalyzer();

// Analyze what happens if a specific artifact completes
const result = analyzer.analyzeCompletionCascade('A.1.1', artifacts);

if (result.hasCascades) {
  console.log(`Completing A.1.1 would unblock ${result.unblocked.length} artifacts`);

  result.unblocked.forEach(artifact => {
    console.log(`- ${artifact.id}: ${artifact.currentState} → ${artifact.newState}`);
  });

  result.autoCompleted.forEach(artifact => {
    console.log(`- Parent ${artifact.id} would auto-complete`);
  });
}

console.log(`Analysis completed in ${result.analysisTimeMs}ms`);
```

### Getting Work Recommendations

```typescript
// Get actionable recommendations for what to work on next
const recommendations = analyzer.getCompletionRecommendations(artifacts);

console.log(`Ready to start: ${recommendations.readyToStart.join(', ')}`);
console.log(`Can complete: ${recommendations.canComplete.join(', ')}`);

recommendations.blocked.forEach(blocked => {
  console.log(`${blocked.id} blocked by: ${blocked.blockedBy.join(', ')}`);
});
```

### Full Cascade Analysis

```typescript
// Comprehensive analysis of entire artifact tree
const fullAnalysis = analyzer.analyzeFullCascade(artifacts);

console.log(`Analyzed ${fullAnalysis.totalArtifacts} artifacts`);
console.log(`Found ${fullAnalysis.circularDependencies.length} circular dependencies`);

// Get specific completion cascades
const a11Cascade = fullAnalysis.completionCascades['A.1.1'];
if (a11Cascade?.hasCascades) {
  console.log('Completing A.1.1 would trigger cascades');
}
```

### Archive Cancelled Children

```typescript
// When parent completes, archive cancelled children
const archiveEvents = engine.archiveCancelledChildren(
  childArtifacts,
  parentCompletionEvent
);

// Apply archive events to cancelled artifacts
archiveEvents.forEach(({ artifactId, event }) => {
  applyEventToArtifact(artifactId, event);
});
```

### Dependency Analysis

```typescript
// Find artifacts blocked by a cancellation
const blockedArtifacts = engine.getBlockedDependents(
  'A.1.1', // cancelled artifact
  artifactMap
);

// Notify or transition blocked artifacts
blockedArtifacts.forEach(id => {
  notifyBlocked(id, 'Dependency A.1.1 was cancelled');
});
```

## API Reference

### CascadeEngine Methods

#### `shouldCascadeToParent(children, parentState?)`

Determines if a parent artifact should cascade based on child states.

**Parameters:**
- `children`: Array of child artifacts
- `parentState`: Current state of parent (optional)

**Returns:** `CascadeResult`
- `shouldCascade`: Boolean indicating if cascade should occur
- `newState`: The state to transition to (if cascading)
- `reason`: Human-readable explanation

#### `generateCascadeEvent(newState, triggerEvent, cascadeType)`

Creates a properly formatted cascade event with all required metadata.

**Parameters:**
- `newState`: The state to transition to
- `triggerEvent`: The event that triggered this cascade
- `cascadeType`: Type identifier for the cascade

**Returns:** `EventMetadata` with:
- `event` field first (v2.0 schema)
- `timestamp` in ISO 8601 format
- System `actor`
- `trigger` indicating cascade type
- Optional `metadata` with cascade context

#### `archiveCancelledChildren(children, parentCompletionEvent)`

Generates archive events for cancelled children when parent completes.

**Parameters:**
- `children`: Array of child artifacts
- `parentCompletionEvent`: Parent's completion event

**Returns:** Array of `ArchiveEvent` objects

#### `getBlockedDependents(cancelledArtifactId, artifacts)`

Identifies artifacts that are blocked by a cancelled dependency.

**Parameters:**
- `cancelledArtifactId`: ID of the cancelled artifact
- `artifacts`: Map of all artifacts

**Returns:** Array of blocked artifact IDs

### CompletionCascadeAnalyzer Methods

#### `analyzeCompletionCascade(artifactId, artifacts)`

Analyzes what would happen if a specific artifact completes.

**Parameters:**
- `artifactId`: ID of artifact to analyze completion for
- `artifacts`: Map of artifact ID to artifact

**Returns:** `CompletionCascadeResult`
- `hasCascades`: Boolean indicating if completion would trigger cascades
- `unblocked`: Array of artifacts that would be unblocked
- `autoCompleted`: Array of parents that would auto-complete
- `analysisTimeMs`: Time taken for analysis (performance tracking)
- `errors`: Any errors encountered during analysis

#### `getCompletionRecommendations(artifacts)`

Provides actionable recommendations for what to work on next.

**Parameters:**
- `artifacts`: Map of artifact ID to artifact

**Returns:** `CompletionRecommendations`
- `readyToStart`: Array of artifact IDs ready to begin work
- `canComplete`: Array of artifact IDs that can be completed (all children done)
- `blocked`: Array of blocked artifacts with their blocker information
- `analysisTimeMs`: Time taken for analysis

#### `analyzeFullCascade(artifacts)`

Performs comprehensive cascade analysis for all artifacts.

**Parameters:**
- `artifacts`: Map of artifact ID to artifact

**Returns:** `FullCascadeAnalysis`
- `totalArtifacts`: Total number of artifacts analyzed
- `recommendations`: Completion recommendations
- `completionCascades`: Per-artifact completion cascade analysis
- `circularDependencies`: Array of artifact IDs with circular dependencies
- `performanceMs`: Total analysis time

## Cascade Rules

### Parent Completion (All Children Complete)
- **Condition**: All non-cancelled children are in `completed` state
- **Action**: Parent transitions to `in_review`
- **Applies to**: Issues → Milestones, Milestones → Initiatives

### Parent Auto-Start (First Child Starts)
- **Condition**: Parent is in `ready` state AND first child enters `in_progress`
- **Action**: Parent transitions to `in_progress`
- **Applies to**: Issues → Milestones, Milestones → Initiatives

### Archive on Parent Completion
- **Condition**: Parent reaches `completed` state
- **Action**: All `cancelled` children transition to `archived`
- **Purpose**: Clean up cancelled work when parent is done

### Dependency Blocks
- **Condition**: Artifact is cancelled that others depend on
- **Action**: Dependent artifacts identified for notification
- **Purpose**: Maintain dependency integrity

## Integration Example

```typescript
// In your event processing system
async function processEvent(artifactId: string, event: EventMetadata) {
  // Apply the event
  await applyEvent(artifactId, event);

  // Check for cascades
  const artifact = await getArtifact(artifactId);
  const parent = await getParent(artifactId);

  if (parent) {
    const siblings = await getSiblings(artifactId);
    const result = engine.shouldCascadeToParent(siblings, parent.currentState);

    if (result.shouldCascade) {
      const cascadeEvent = engine.generateCascadeEvent(
        result.newState!,
        event,
        'child_state_change'
      );

      // Recursively process the cascade
      await processEvent(parent.id, cascadeEvent);
    }
  }
}
```

## Testing

The cascade engine has comprehensive test coverage:
- `engine.test.ts`: Unit tests for all cascade scenarios
- `integration.test.ts`: End-to-end cascade chain testing

## Event Identity and Cascade Tracking

The cascade engine leverages the event identity system to maintain complete audit trails:

### v2.0 Schema in Cascades
```typescript
const cascadeEvent = {
  event: 'in_review',                      // State transition
  timestamp: '2025-07-19T18:30:00Z',       // When cascade occurred
  actor: 'System (automation@kodebase.ai)', // System actor for cascades
  trigger: 'all_children_complete',        // What triggered the cascade
  metadata: {
    cascade_type: 'parent_completion',
    trigger_artifact: 'A.1.3',            // Which artifact triggered this
    affected_artifacts: ['A.1.1', 'A.1.2', 'A.1.3']
  }
};
```

### Tracing Cascade Chains
```typescript
// Find all events in a cascade chain using triggers
function getCascadeChain(events: EventMetadata[], triggerArtifact: string) {
  return events.filter(e => 
    e.trigger?.includes('cascade') && 
    e.metadata?.trigger_artifact === triggerArtifact
  );
}

// Calculate cascade impact by analyzing trigger patterns
function getCascadeImpact(events: EventMetadata[]): CascadeImpact {
  const cascadeEvents = events.filter(e => 
    e.trigger === 'all_children_complete' || 
    e.trigger === 'first_child_started'
  );
  
  return {
    totalCascades: cascadeEvents.length,
    automatedTransitions: cascadeEvents.length,
    timeSavedMinutes: cascadeEvents.length * 3 // avg 3min per manual update
  };
}
```

### Time Savings Analysis
```typescript
// Each cascade saves ~2-5 minutes of manual work
function calculateTimeSaved(cascadeEvents: EventMetadata[]) {
  const baseTimeSaved = cascadeEvents.length * 2; // 2 min per status update
  const complexityMultiplier = 1.5; // Additional time for finding related artifacts

  return {
    totalMinutes: Math.round(baseTimeSaved * complexityMultiplier),
    totalHours: Math.round((baseTimeSaved * complexityMultiplier) / 60)
  };
}
```

## Best Practices

1. **Always check cascade conditions**: Use `shouldCascadeToParent()` before generating events
2. **Maintain correlation**: Use `generateCascadeEvent()` to ensure proper event linking
3. **Handle all cascade types**: Don't forget archive and dependency cascades
4. **Test cascade chains**: Ensure multi-level cascades work correctly
5. **Log cascade actions**: Track automated state changes for debugging
6. **Preserve identity chain**: Always use proper event builders for cascade events
