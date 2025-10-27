# Getting Started with @kodebase/core

Welcome to @kodebase/core! This guide will help you get up and running quickly with the Kodebase artifact management system.

## Installation

```bash
npm install @kodebase/core
# or
pnpm add @kodebase/core
# or
yarn add @kodebase/core
```

## Basic Usage

### 1. Parse Existing YAML Files

If you have existing Kodebase YAML files, you can parse and validate them:

```typescript
import { ArtifactParser } from '@kodebase/core';
import { readFileSync } from 'fs';

// Create parser instance
const parser = new ArtifactParser();

// Read and parse YAML file
const yamlContent = readFileSync('.kodebase/artifacts/A.1.5.yml', 'utf-8');
const issue = parser.parseIssue(yamlContent);

// Access typed data
console.log(issue.metadata.title);
console.log(issue.content.acceptance_criteria);
```

### 2. Create New Artifacts

Create type-safe artifacts programmatically:

```typescript
import {
  createEvent,
  formatActor,
  CPriority,
  CEstimationSize,
  type Issue
} from '@kodebase/core';

// Create a new issue
const issue: Issue = {
  metadata: {
    title: "Add user authentication",
    priority: CPriority.HIGH,
    estimation: CEstimationSize.LARGE,
    created_by: formatActor("John Doe", "john@example.com"),
    assignee: formatActor("Jane Smith", "jane@example.com"),
    schema_version: "0.2.0",
    relationships: {
      blocks: [],
      blocked_by: ["A.1.1"]
    },
    events: [
      createEvent({
        event: 'draft',
        actor: formatActor("John Doe", "john@example.com")
      })
    ]
  },
  content: {
    summary: "Implement secure user authentication system",
    acceptance_criteria: [
      "Users can register with email/password",
      "Users can login and receive JWT token",
      "Password reset functionality works",
      "Sessions expire after 24 hours"
    ]
  }
};
```

### 3. Validate Unknown Data

When receiving data from external sources:

```typescript
import { ArtifactValidator } from '@kodebase/core';

const validator = new ArtifactValidator();

try {
  // Auto-detect and validate artifact type
  const artifact = validator.validate(unknownData);

  // Get specific type
  const type = validator.getArtifactType(unknownData);
  console.log(`Detected artifact type: ${type}`);

  // Type-specific validation
  if (type === 'issue') {
    const issue = validator.validateIssue(unknownData);
  }
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

### 4. Work with Events

Manage artifact lifecycle through events:

```typescript
import {
  createEvent,
  getCurrentState,
  canTransition,
  formatTimestamp
} from '@kodebase/core';

// Check current state
const currentState = getCurrentState(issue);
console.log(`Current state: ${currentState}`);

// Check if transition is valid
if (canTransition('issue', currentState, 'ready')) {
  // Add state transition event
  issue.metadata.events.push(
    createEvent({
      event: 'ready',
      actor: formatActor("John Doe", "john@example.com")
    })
  );
}

// Events are automatically timestamped and assigned IDs
const latestEvent = issue.metadata.events[issue.metadata.events.length - 1];
console.log(`Event ID: ${latestEvent.event_id}`);
console.log(`Timestamp: ${latestEvent.timestamp}`);
```

### 5. Calculate Metrics

Analyze productivity metrics:

```typescript
import {
  calculateCycleTime,
  calculateLeadTime,
  formatDuration,
  calculateDailyVelocity
} from '@kodebase/core';

// Single artifact metrics
const cycleTime = calculateCycleTime(issue.metadata.events);
if (cycleTime !== null) {
  console.log(`Cycle time: ${formatDuration(cycleTime)}`);
}

// Team velocity
const artifacts = [issue1, issue2, issue3]; // Your artifacts
const velocity = calculateDailyVelocity(artifacts, 30);
console.log(`Daily velocity: ${velocity.toFixed(2)} items/day`);
```

## Core Concepts

### Artifact Types

Kodebase uses three hierarchical artifact types:

1. **Initiative** - High-level strategic goals
2. **Milestone** - Major deliverables within initiatives
3. **Issue** - Specific work items with acceptance criteria

### Event-Driven Lifecycle

All artifacts follow this lifecycle:

```
draft → ready → in_progress → in_review → completed
         ↓           ↓            ↓           ↓
     cancelled → cancelled → cancelled → cancelled
                                          ↓
                                      archived
```

### Type Safety

The package provides full TypeScript support:

```typescript
// Type aliases for valid values
type TArtifactEvent = 'draft' | 'ready' | 'blocked' | ...
type TPriority = 'critical' | 'high' | 'medium' | 'low'
type TEstimationSize = 'XS' | 'S' | 'M' | 'L' | 'XL'

// Constants for runtime usage
const CPriority = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const;
```

## Common Patterns

### Loading and Saving Artifacts

```typescript
import { ArtifactParser, ArtifactValidator } from '@kodebase/core';
import { readFileSync, writeFileSync } from 'fs';
import { stringify } from 'yaml';

function loadArtifact(path: string): TArtifact {
  const parser = new ArtifactParser();
  const content = readFileSync(path, 'utf-8');
  return parser.validate(content);
}

function saveArtifact(path: string, artifact: TArtifact): void {
  const validator = new ArtifactValidator();
  validator.validate(artifact); // Ensure valid before saving

  const yaml = stringify(artifact);
  writeFileSync(path, yaml);
}
```

### Error Handling

The package provides detailed error messages:

```typescript
try {
  const issue = parser.parseIssue(yamlContent);
} catch (error) {
  if (error.message.includes('validation failed')) {
    // Handle validation error
    console.error('Invalid issue format:', error.message);
  } else if (error.message.includes('Invalid YAML syntax')) {
    // Handle parse error
    console.error('YAML syntax error:', error.message);
  }
}
```

### Working with Relationships

```typescript
// Check for circular dependencies
import { hasCircularDependency } from '@kodebase/core';

if (hasCircularDependency('A.1.5', allArtifacts)) {
  console.error('Circular dependency detected!');
}

// Find blocked artifacts
import { getBlockedDependents } from '@kodebase/core';

const engine = new CascadeEngine();
const blocked = engine.getBlockedDependents('A.1.1', allArtifacts);
console.log(`Artifacts blocked by A.1.1:`, blocked.map(a => a.metadata.title));
```

## Next Steps

1. **Explore the API**: Check out the [API Reference](./api-reference.md) for detailed documentation
2. **Learn Patterns**: See the [Cookbook](./cookbook.md) for common recipes
3. **Migration Guide**: If upgrading from manual YAML editing, see the [Migration Guide](./migration-guide.md)
4. **Examples**: Review the test files in the repository for more usage examples

## Getting Help

- **Documentation**: Full docs at `/packages/core/docs/`
- **Types**: All types are exported with JSDoc comments
- **Examples**: Check the README.md for practical examples
- **Issues**: Report bugs at github.com/kodebase-org/kodebase

## Quick Reference

### Imports

```typescript
// Types and interfaces
import type {
  Issue, Milestone, Initiative,
  TArtifact, TArtifactEvent, TPriority
} from '@kodebase/core';

// Runtime constants
import {
  CArtifactEvent, CPriority, CEstimationSize
} from '@kodebase/core';

// Classes
import {
  ArtifactParser, ArtifactValidator, CascadeEngine
} from '@kodebase/core';

// Functions
import {
  // State helpers (recommended)
  canTransition, getValidTransitions, performTransition,
  // Event utilities
  createEvent, formatActor, formatTimestamp,
  // State utilities
  getCurrentState,
  // Metrics
  calculateCycleTime, formatDuration
} from '@kodebase/core';
```

### Common Operations

```typescript
// Parse YAML
const issue = parser.parseIssue(yamlContent);

// Validate data
const artifact = validator.validate(unknownData);

// ✨ New: Simple state transitions
if (canTransition(artifact, 'ready')) {
  performTransition(artifact, 'ready', 'John Doe (john@example.com)');
}

// Check available transitions
const validStates = getValidTransitions(artifact);
console.log('Can transition to:', validStates);

// Legacy: Manual event creation
const event = createEvent({ event: 'ready', actor });

// Check current state
const state = getCurrentState(artifact);

// Calculate metrics
const cycleTime = calculateCycleTime(events);
```

Happy coding with @kodebase/core!
