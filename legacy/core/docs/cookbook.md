# @kodebase/core Cookbook

Practical recipes for common Kodebase operations using the @kodebase/core package.

## Table of Contents

1. [Creating Artifacts](#creating-artifacts)
2. [Managing Relationships](#managing-relationships)
3. [State Transitions](#state-transitions)
4. [Event Handling](#event-handling)
5. [Cascade Operations](#cascade-operations)
6. [Metrics & Analytics](#metrics--analytics)
7. [Validation & Error Handling](#validation--error-handling)
8. [File Operations](#file-operations)

## Creating Artifacts

### Create a New Issue

```typescript
import {
  createEvent,
  formatActor,
  CPriority,
  CEstimationSize,
  type Issue
} from '@kodebase/core';

function createIssue(params: {
  id: string;
  title: string;
  summary: string;
  acceptanceCriteria: string[];
  priority?: TPriority;
  estimation?: TEstimationSize;
  creator: { name: string; email: string };
  blockedBy?: string[];
}): Issue {
  const actor = formatActor(params.creator.name, params.creator.email);

  return {
    metadata: {
      title: params.title,
      priority: params.priority || CPriority.MEDIUM,
      estimation: params.estimation || CEstimationSize.MEDIUM,
      created_by: actor,
      assignee: actor,
      schema_version: '0.2.0',
      relationships: {
        blocks: [],
        blocked_by: params.blockedBy || []
      },
      events: [
        createEvent({
          event: 'draft',
          actor
        })
      ]
    },
    content: {
      summary: params.summary,
      acceptance_criteria: params.acceptanceCriteria
    }
  };
}

// Usage
const issue = createIssue({
  id: 'A.1.5',
  title: 'Implement user authentication',
  summary: 'Add secure login system with JWT tokens',
  acceptanceCriteria: [
    'Users can register with email/password',
    'Users can login and receive JWT token',
    'Sessions expire after 24 hours'
  ],
  priority: CPriority.HIGH,
  estimation: CEstimationSize.LARGE,
  creator: { name: 'John Doe', email: 'john@example.com' },
  blockedBy: ['A.1.1', 'A.1.2']
});
```

### Create a Milestone with Issues

```typescript
import { type Milestone, type Issue } from '@kodebase/core';

function createMilestoneWithIssues(
  milestone: Milestone,
  issues: Issue[]
): { milestone: Milestone; issues: Issue[] } {
  // Ensure all issues are ready if milestone is ready
  const milestoneState = getCurrentState(milestone);

  if (milestoneState === 'ready') {
    issues.forEach(issue => {
      if (getCurrentState(issue) === 'draft') {
        issue.metadata.events.push(
          createEvent({
            event: 'ready',
            actor: milestone.metadata.assignee
          })
        );
      }
    });
  }

  return { milestone, issues };
}
```

## Managing Relationships

### Update Bidirectional Relationships

```typescript
import { ArtifactParser, ArtifactValidator } from '@kodebase/core';
import { readFileSync, writeFileSync } from 'fs';
import { stringify } from 'yaml';

function updateRelationships(
  artifactPath: string,
  blocks: string[],
  blockedBy: string[]
): void {
  const parser = new ArtifactParser();
  const validator = new ArtifactValidator();

  // Load artifact
  const content = readFileSync(artifactPath, 'utf-8');
  const artifact = parser.validate(content);

  // Update relationships
  artifact.metadata.relationships = {
    blocks: [...new Set(blocks)],  // Remove duplicates
    blocked_by: [...new Set(blockedBy)]
  };

  // Validate
  validator.validate(artifact);

  // Save
  writeFileSync(artifactPath, stringify(artifact));
}

// Batch update relationships
async function updateBidirectionalRelationships(
  artifactId: string,
  nowBlocks: string[]
): Promise<void> {
  // Update this artifact
  updateRelationships(
    `.kodebase/artifacts/${artifactId}.yml`,
    nowBlocks,
    []
  );

  // Update blocked artifacts
  for (const blockedId of nowBlocks) {
    const path = `.kodebase/artifacts/${blockedId}.yml`;
    const artifact = loadArtifact(path);

    if (!artifact.metadata.relationships.blocked_by.includes(artifactId)) {
      artifact.metadata.relationships.blocked_by.push(artifactId);
      saveArtifact(path, artifact);
    }
  }
}
```

### Find Dependency Chains

```typescript
import {
  validateDependencies,
  hasCircularDependency,
  getDependents
} from '@kodebase/core';

function analyzeDependencyChain(
  artifactId: string,
  allArtifacts: TArtifact[]
): {
  blockers: string[];
  blocking: string[];
  hasCircular: boolean;
} {
  const artifact = allArtifacts.find(a =>
    getArtifactId(a) === artifactId
  );

  if (!artifact) {
    throw new Error(`Artifact ${artifactId} not found`);
  }

  const blockers = artifact.metadata.relationships.blocked_by;
  const blocking = getDependents(artifactId, allArtifacts)
    .map(a => getArtifactId(a));

  const hasCircular = hasCircularDependency(artifactId, allArtifacts);

  return { blockers, blocking, hasCircular };
}
```

## State Transitions

### Simple State Transition (Recommended) 🆕

```typescript
import {
  canTransition,
  getValidTransitions,
  performTransition,
  getCurrentState
} from '@kodebase/core';

function transitionArtifact(
  artifact: TArtifact,
  targetState: TArtifactEvent,
  actor: string,
  metadata?: Record<string, unknown>
): void {
  const currentState = getCurrentState(artifact);

  // Check if already in target state
  if (currentState === targetState) {
    console.log(`Already in ${targetState} state`);
    return;
  }

  // Validate transition (automatic type detection)
  if (!canTransition(artifact, targetState)) {
    const validStates = getValidTransitions(artifact);
    throw new Error(
      `Cannot transition from ${currentState} to ${targetState}. ` +
      `Valid transitions: ${validStates.join(', ')}`
    );
  }

  // Perform transition with automatic event creation
  performTransition(artifact, targetState, actor, metadata);
}

// Usage examples
const artifact = await loadArtifact('A.1.5.yml');

// Simple transition
transitionArtifact(artifact, 'ready', 'John Doe (john@example.com)');

// Blocked state requires reason
transitionArtifact(artifact, 'blocked', actor, {
  reason: 'Waiting for external dependency'
});

// Check what transitions are available
const validStates = getValidTransitions(artifact);
console.log('Available transitions:', validStates);
```

### Advanced State Transition (Legacy)

```typescript
import {
  canTransition as canTransitionCore,
  getCurrentState,
  createEvent,
  isTerminalState,
  getValidTransitions as getValidTransitionsCore
} from '@kodebase/core';

function transitionSafely(
  artifact: TArtifact,
  targetState: TArtifactEvent,
  actor: string,
  metadata?: Record<string, unknown>
): void {
  const currentState = getCurrentState(artifact);

  // Check if already in target state
  if (currentState === targetState) {
    console.log(`Already in ${targetState} state`);
    return;
  }

  // Check if current state is terminal
  if (isTerminalState(currentState)) {
    throw new Error(`Cannot transition from terminal state ${currentState}`);
  }

  // Get artifact type
  const type = getArtifactType(artifact);

  // Validate transition
  if (!canTransitionCore(type, currentState, targetState)) {
    const validStates = getValidTransitionsCore(type, currentState);
    throw new Error(
      `Cannot transition from ${currentState} to ${targetState}. ` +
      `Valid transitions: ${validStates.join(', ')}`
    );
  }

  // Create and add event
  const event = createEvent({
    event: targetState,
    actor,
    metadata
  });

  artifact.metadata.events.push(event);
}
```

### Bulk State Updates

```typescript
import { performTransition, canTransition } from '@kodebase/core';

async function bulkTransition(
  artifactIds: string[],
  targetState: TArtifactEvent,
  actor: string,
  metadata?: Record<string, unknown>
): Promise<{ succeeded: string[]; failed: Array<{ id: string; error: string }> }> {
  const succeeded: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const id of artifactIds) {
    try {
      const artifact = await loadArtifact(id);

      // Validate transition before attempting
      if (!canTransition(artifact, targetState)) {
        failed.push({
          id,
          error: `Invalid transition to ${targetState} from current state`
        });
        continue;
      }

      // Perform transition with new simplified API
      performTransition(artifact, targetState, actor, metadata);
      await saveArtifact(id, artifact);
      succeeded.push(id);
    } catch (error) {
      failed.push({
        id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return { succeeded, failed };
}

// Usage
const result = await bulkTransition(
  ['A.1.1', 'A.1.2', 'A.1.3'],
  'ready',
  'John Doe (john@example.com)'
);

console.log(`✅ ${result.succeeded.length} artifacts transitioned successfully`);
console.log(`❌ ${result.failed.length} artifacts failed:`, result.failed);
```
```

## Event Handling

### Add Custom Event Metadata

```typescript
import { createEvent } from '@kodebase/core';

function addBlockedEvent(
  artifact: TArtifact,
  actor: string,
  reason: string,
  blockedBy: string[]
): void {
  const event = createEvent({
    event: 'blocked',
    actor,
    metadata: {
      reason,
      blocked_by: blockedBy,
      estimated_unblock_date: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000  // 1 week
      ).toISOString()
    }
  });

  artifact.metadata.events.push(event);
}
```

### Track Event Duration

```typescript
import { getDurationInMinutes, formatDuration } from '@kodebase/core';

function getStateDurations(events: EventMetadata[]): Record<string, string> {
  const durations: Record<string, number> = {};

  for (let i = 0; i < events.length - 1; i++) {
    const current = events[i];
    const next = events[i + 1];

    const duration = getDurationInMinutes(
      current.timestamp,
      next.timestamp
    );

    durations[current.event] = (durations[current.event] || 0) + duration;
  }

  // Format for display
  return Object.entries(durations).reduce((acc, [state, minutes]) => {
    acc[state] = formatDuration(minutes);
    return acc;
  }, {} as Record<string, string>);
}
```

## Cascade Operations

### Automatic Parent Completion

```typescript
import { CascadeEngine, createCascadeEvent } from '@kodebase/core';

async function checkAndCascadeToParent(
  parentId: string,
  childrenIds: string[]
): Promise<boolean> {
  const engine = new CascadeEngine();

  // Load all artifacts
  const parent = await loadArtifact(parentId);
  const children = await Promise.all(
    childrenIds.map(id => loadArtifact(id))
  );

  // Check cascade conditions
  const result = engine.shouldCascadeToParent(
    children,
    getCurrentState(parent)
  );

  if (!result.shouldCascade) {
    console.log(`Cascade not needed: ${result.reason}`);
    return false;
  }

  // Get the trigger event (last child completion)
  const completedChildren = children.filter(c =>
    getCurrentState(c) === 'completed'
  );
  const lastCompletion = completedChildren
    .flatMap(c => c.metadata.events)
    .filter(e => e.event === 'completed')
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  // Create cascade event
  const cascadeEvent = engine.generateCascadeEvent(
    result.newState!,
    lastCompletion,
    'all_children_complete'
  );

  // Apply to parent
  parent.metadata.events.push(cascadeEvent);
  await saveArtifact(parentId, parent);

  console.log(`✓ Cascaded parent to ${result.newState}`);
  return true;
}
```

### Archive Cancelled Children

```typescript
async function completeParentAndArchive(
  parentId: string,
  actor: string
): Promise<void> {
  const engine = new CascadeEngine();
  const parent = await loadArtifact(parentId);
  const children = await loadChildrenArtifacts(parentId);

  // Complete parent
  const completionEvent = createEvent({
    event: 'completed',
    actor
  });
  parent.metadata.events.push(completionEvent);

  // Archive cancelled children
  const archiveEvents = engine.archiveCancelledChildren(
    children,
    completionEvent
  );

  // Apply archive events
  for (const { artifact, event } of archiveEvents) {
    artifact.metadata.events.push(event);
    await saveArtifact(getArtifactId(artifact), artifact);
  }

  await saveArtifact(parentId, parent);
}
```

## Metrics & Analytics

### Team Velocity Dashboard

```typescript
import {
  calculateDailyVelocity,
  calculateWeeklyVelocity,
  getVelocityTrend,
  calculateCycleTime,
  calculateLeadTime,
  getWorkInProgressCount
} from '@kodebase/core';

function generateVelocityReport(artifacts: TArtifact[]) {
  const now = new Date();

  return {
    current: {
      wip: getWorkInProgressCount(artifacts),
      dailyVelocity: calculateDailyVelocity(artifacts, 30),
      weeklyVelocity: calculateWeeklyVelocity(artifacts, 4)
    },
    trends: {
      daily: getVelocityTrend(artifacts, 30),
      weekly: getVelocityTrend(artifacts, 7)
    },
    cycleTime: {
      average: calculateAverageCycleTime(artifacts),
      median: calculateMedianCycleTime(artifacts)
    },
    leadTime: {
      average: calculateAverageLeadTime(artifacts),
      median: calculateMedianLeadTime(artifacts)
    }
  };
}

function calculateAverageCycleTime(artifacts: TArtifact[]): number | null {
  const times = artifacts
    .map(a => calculateCycleTime(a.metadata.events))
    .filter((t): t is number => t !== null);

  if (times.length === 0) return null;

  return times.reduce((sum, t) => sum + t, 0) / times.length;
}
```

### Blocker Analysis

```typescript
import { calculateBlockedTime, getDependents } from '@kodebase/core';

interface BlockerReport {
  artifactId: string;
  title: string;
  blockedTime: number;
  blockingCount: number;
  blockingArtifacts: string[];
}

function analyzeBlockers(artifacts: TArtifact[]): BlockerReport[] {
  return artifacts
    .filter(a => getCurrentState(a) === 'blocked')
    .map(artifact => {
      const id = getArtifactId(artifact);
      const blockingArtifacts = getDependents(id, artifacts)
        .map(a => getArtifactId(a));

      return {
        artifactId: id,
        title: artifact.metadata.title,
        blockedTime: calculateBlockedTime(artifact.metadata.events),
        blockingCount: blockingArtifacts.length,
        blockingArtifacts
      };
    })
    .sort((a, b) => b.blockedTime - a.blockedTime);
}
```

## Validation & Error Handling

### Comprehensive Validation

```typescript
import {
  ArtifactValidator,
  validateDependencies,
  validateEventChronology
} from '@kodebase/core';

interface ValidationReport {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  type: 'schema' | 'dependency' | 'chronology';
  artifactId?: string;
  message: string;
  details?: any;
}

interface ValidationWarning {
  type: string;
  message: string;
}

async function validateRepository(
  artifactPaths: string[]
): Promise<ValidationReport> {
  const validator = new ArtifactValidator();
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const artifacts: TArtifact[] = [];

  // Validate individual artifacts
  for (const path of artifactPaths) {
    try {
      const content = readFileSync(path, 'utf-8');
      const artifact = validator.validate(
        parser.parseYaml(content)
      );
      artifacts.push(artifact);

      // Check event chronology
      try {
        validateEventChronology(artifact.metadata.events);
      } catch (error) {
        errors.push({
          type: 'chronology',
          artifactId: getArtifactId(artifact),
          message: error.message
        });
      }
    } catch (error) {
      errors.push({
        type: 'schema',
        message: `${path}: ${error.message}`
      });
    }
  }

  // Validate dependencies
  const depValidation = validateDependencies(artifacts);
  if (!depValidation.isValid) {
    errors.push(...depValidation.errors.map(e => ({
      type: 'dependency' as const,
      artifactId: e.artifactId,
      message: e.message,
      details: e.details
    })));
  }

  // Add warnings
  artifacts.forEach(artifact => {
    // Warn about old schema versions
    if (artifact.metadata.schema_version < '0.2.0') {
      warnings.push({
        type: 'schema_version',
        message: `${getArtifactId(artifact)} uses old schema ${artifact.metadata.schema_version}`
      });
    }

    // Warn about stale in-progress items
    const state = getCurrentState(artifact);
    if (state === 'in_progress') {
      const lastEvent = artifact.metadata.events[artifact.metadata.events.length - 1];
      const daysSinceStart = getDurationInMinutes(
        lastEvent.timestamp,
        new Date().toISOString()
      ) / (24 * 60);

      if (daysSinceStart > 14) {
        warnings.push({
          type: 'stale',
          message: `${getArtifactId(artifact)} has been in progress for ${Math.floor(daysSinceStart)} days`
        });
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

## File Operations

### Batch Processing

```typescript
import { glob } from 'glob';
import { ArtifactParser, ArtifactValidator } from '@kodebase/core';

async function processAllArtifacts<T>(
  pattern: string,
  processor: (artifact: TArtifact, path: string) => Promise<T>
): Promise<Array<{ path: string; result?: T; error?: string }>> {
  const parser = new ArtifactParser();
  const validator = new ArtifactValidator();
  const files = await glob(pattern);
  const results = [];

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const data = parser.parseYaml(content);
      const artifact = validator.validate(data);
      const result = await processor(artifact, file);
      results.push({ path: file, result });
    } catch (error) {
      results.push({
        path: file,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
}

// Example: Add missing event IDs
await processAllArtifacts(
  '.kodebase/artifacts/**/*.yml',
  async (artifact, path) => {
    let modified = false;

    artifact.metadata.events.forEach(event => {
      if (!event.event_id) {
        event.event_id = generateEventId();
        modified = true;
      }
    });

    if (modified) {
      writeFileSync(path, stringify(artifact));
      return 'Updated';
    }

    return 'No changes';
  }
);
```

### Safe File Updates

```typescript
import { createWriteStream } from 'fs';
import { rename } from 'fs/promises';

async function safeUpdateArtifact(
  path: string,
  updater: (artifact: TArtifact) => void
): Promise<void> {
  const parser = new ArtifactParser();
  const validator = new ArtifactValidator();

  // Load and parse
  const content = readFileSync(path, 'utf-8');
  const artifact = validator.validate(
    parser.parseYaml(content)
  );

  // Apply updates
  updater(artifact);

  // Validate after update
  validator.validate(artifact);

  // Write to temp file first
  const tempPath = `${path}.tmp`;
  const yaml = stringify(artifact, {
    lineWidth: 0,  // Prevent line wrapping
    nullStr: ''    // Omit null values
  });

  writeFileSync(tempPath, yaml);

  // Atomic rename
  await rename(tempPath, path);
}
```

## Advanced Patterns

### Custom Event Types

```typescript
// Extend event types for domain-specific needs
type CustomEvent = TArtifactEvent | 'deployed' | 'rolled_back';

function createCustomEvent(
  event: CustomEvent,
  actor: string,
  environment?: string
): EventMetadata {
  const baseEvent = createEvent({
    event: event as TArtifactEvent,
    actor,
    metadata: environment ? { environment } : undefined
  });

  // Override event type for custom events
  if (!CArtifactEvent[event.toUpperCase()]) {
    baseEvent.event = event as any;
  }

  return baseEvent;
}
```

### Plugin System

```typescript
interface ArtifactPlugin {
  name: string;
  validateArtifact?: (artifact: TArtifact) => ValidationError[];
  beforeStateTransition?: (
    artifact: TArtifact,
    from: TArtifactEvent,
    to: TArtifactEvent
  ) => void;
  afterStateTransition?: (
    artifact: TArtifact,
    event: EventMetadata
  ) => void;
}

class ArtifactProcessor {
  private plugins: ArtifactPlugin[] = [];

  use(plugin: ArtifactPlugin): void {
    this.plugins.push(plugin);
  }

  async transitionState(
    artifact: TArtifact,
    targetState: TArtifactEvent,
    actor: string
  ): Promise<void> {
    const currentState = getCurrentState(artifact);

    // Run pre-transition plugins
    for (const plugin of this.plugins) {
      plugin.beforeStateTransition?.(artifact, currentState, targetState);
    }

    // Perform transition
    const event = createEvent({ event: targetState, actor });
    artifact.metadata.events.push(event);

    // Run post-transition plugins
    for (const plugin of this.plugins) {
      plugin.afterStateTransition?.(artifact, event);
    }
  }
}
```

This cookbook provides practical patterns for working with @kodebase/core. For more details, see the [API Reference](./api-reference.md).
