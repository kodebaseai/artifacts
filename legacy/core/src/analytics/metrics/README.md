# Metrics Module

The metrics module provides functions to calculate productivity metrics from artifact event data.

## Overview

This module calculates various metrics based on the event-driven artifact lifecycle:
- **Time metrics**: Cycle time, lead time, blocked time
- **Velocity metrics**: Daily/weekly completion rates, trends
- **Progress metrics**: Work in progress counts, throughput

All metrics are calculated on-demand from event timestamps rather than stored in artifact metadata.

## Core Functions

### Time Metrics

#### `calculateCycleTime(events: EventMetadata[]): number | null`
Calculates the time from when work starts (`in_progress`) to completion (`completed`).

```typescript
const cycleTime = calculateCycleTime(artifact.metadata.events);
// Returns minutes or null if not completed
```

#### `calculateLeadTime(events: EventMetadata[]): number | null`
Calculates the total time from creation (`draft`) to completion (`completed`).

```typescript
const leadTime = calculateLeadTime(artifact.metadata.events);
// Returns minutes or null if not completed
```

#### `calculateBlockedTime(events: EventMetadata[]): number`
Calculates the total time an artifact spent in blocked state.

```typescript
const blockedTime = calculateBlockedTime(artifact.metadata.events);
// Returns minutes (0 if never blocked)
```

### Velocity Metrics

#### `calculateDailyVelocity(artifacts: Artifact[], windowDays?: number): number`
Calculates the average number of completions per day.

```typescript
const velocity = calculateDailyVelocity(completedArtifacts, 30);
// Returns completions per day over the last 30 days
```

#### `calculateWeeklyVelocity(artifacts: Artifact[], windowWeeks?: number): number`
Calculates the average number of completions per week.

```typescript
const velocity = calculateWeeklyVelocity(completedArtifacts, 4);
// Returns completions per week over the last 4 weeks
```

#### `getVelocityTrend(artifacts: Artifact[], periodDays?: number): TrendMetrics`
Compares velocity between current and previous periods to identify trends.

```typescript
const trend = getVelocityTrend(allArtifacts, 14);
// Returns: { current, previous, percentageChange, trend: 'increasing'|'stable'|'decreasing' }
```

### Progress Metrics

#### `getWorkInProgressCount(artifacts: Artifact[]): number`
Counts artifacts currently in progress.

```typescript
const wipCount = getWorkInProgressCount(allArtifacts);
```

#### `calculateThroughput(artifacts: Artifact[], windowDays?: number): ThroughputMetrics`
Calculates completion rates by artifact type.

```typescript
const throughput = calculateThroughput(allArtifacts, 30);
// Returns: { issues: 10, milestones: 2, initiatives: 0 }
```

## Utility Functions

The module includes utility functions for time calculations:

- `getDurationInMinutes(start, end)`: Basic duration calculation
- `getDurationMetrics(start, end, excludeWeekends?)`: Multi-unit duration with optional business days
- `calculateBusinessDays(start, end)`: Count weekdays only
- `isWithinWindow(date, windowDays, endDate?)`: Check if date falls within time window
- `formatDuration(minutes)`: Human-readable duration formatting

## Usage Example

```typescript
import { 
  calculateCycleTime, 
  calculateLeadTime,
  calculateDailyVelocity,
  getVelocityTrend 
} from '@kodebase/core';

// Analyze a single artifact
const artifact = await parser.parseArtifact('A.1.5.yml');
const cycleTime = calculateCycleTime(artifact.metadata.events);
const leadTime = calculateLeadTime(artifact.metadata.events);

console.log(`Cycle time: ${cycleTime} minutes`);
console.log(`Lead time: ${leadTime} minutes`);

// Analyze team velocity
const allArtifacts = await loadAllArtifacts();
const velocity = calculateDailyVelocity(allArtifacts);
const trend = getVelocityTrend(allArtifacts);

console.log(`Current velocity: ${velocity} items/day`);
console.log(`Trend: ${trend.trend} (${trend.percentageChange}%)`);
```

## Event-Based Metrics

With the simplified v2.0 event schema, metrics focus on state transitions and triggers:

### Trigger Analysis
```typescript
// Analyze automation vs manual state changes
function analyzeTriggerDistribution(artifacts: Artifact[]) {
  const allEvents = artifacts.flatMap(a => a.metadata.events);
  
  const triggerCounts = allEvents.reduce((acc, event) => {
    const trigger = event.trigger;
    acc[trigger] = (acc[trigger] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const totalEvents = allEvents.length;
  const automationRate = (triggerCounts.dependency_completed || 0) / totalEvents;
  
  return {
    triggerDistribution: triggerCounts,
    totalEvents,
    automationRate: Math.round(automationRate * 100)
  };
}
```

### State Transition Analysis
```typescript
// Analyze state transition patterns
function analyzeTransitionPatterns(artifacts: Artifact[]) {
  const transitions = artifacts.flatMap(a => {
    const events = a.metadata.events;
    return events.slice(1).map((event, index) => ({
      from: events[index].event,
      to: event.event,
      trigger: event.trigger,
      artifactType: a.metadata.schema_version ? getArtifactType(a) : 'unknown'
    }));
  });
  
  // Find most common transition patterns
  const patterns = transitions.reduce((acc, t) => {
    const key = `${t.from} -> ${t.to}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    totalTransitions: transitions.length,
    patterns,
    automatedTransitions: transitions.filter(t => 
      t.trigger === 'dependency_completed' || t.trigger === 'pr_merged'
    ).length
  };
}
```

## Design Decisions

1. **On-demand calculation**: Metrics are calculated when needed rather than stored, ensuring they're always current
2. **Event-based**: All metrics derive from the event log, maintaining single source of truth
3. **Pure functions**: No side effects or state management
4. **Null safety**: Functions return null for invalid/incomplete data rather than throwing errors
5. **Business days**: Optional support for excluding weekends in time calculations
6. **Trigger-based insights**: Leverage trigger field to distinguish manual vs automated state changes