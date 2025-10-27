# @kodebase/core

Core TypeScript package for the Kodebase methodology. Provides types, schemas, parsing, and validation for Kodebase artifacts (Initiatives, Milestones, and Issues).

## Installation

```bash
pnpm add @kodebase/core
```

## Overview

The `@kodebase/core` package provides the foundational tools for working with Kodebase artifacts:

- **TypeScript Types** - Compile-time type safety for all artifact structures
- **Zod Schemas** - Runtime validation with detailed error messages
- **YAML Parser** - Convert YAML strings to validated TypeScript objects
- **Artifact Validator** - Auto-detect and validate unknown data structures
- **Enhanced Error Formatting** - Transform cryptic validation errors into actionable messages
- **Event Identity System** - Unique IDs and correlation tracking for cascade automation
- **Cascade Engine** - Automatic state propagation and completion analysis
- **State Machine** - Enforce valid lifecycle transitions
- **Metrics Calculations** - Analyze productivity metrics from artifact events
- **Query System** - Simple, chainable API for filtering and searching artifacts

## Quick Start

```typescript
import { ArtifactParser, ArtifactValidator } from '@kodebase/core';
import { readFileSync } from 'fs';

// Parse YAML file
const parser = new ArtifactParser();
const content = readFileSync('./artifacts/A.1.5.yml', 'utf-8');
const issue = parser.parseIssue(content);

// Validate unknown data
const validator = new ArtifactValidator();
const artifact = validator.validate(unknownData);
const type = validator.getArtifactType(unknownData); // 'issue'
```

## Architecture

```
@kodebase/core
├── types/               # TypeScript interfaces and constants
├── schemas/             # Zod runtime validation schemas
├── parser/              # YAML parsing with validation
├── validator/           # Type detection and validation
├── metrics/             # Productivity metrics calculations
├── events/              # Event identity and builder system
├── cascade/             # Cascade automation engine
├── event-validation/    # State machine and validation rules
├── query/               # Artifact query and filtering system
├── test/                # Test utilities and fixtures
└── index.ts             # Public API exports
```

## Core Concepts

### Artifact Types

Kodebase uses three hierarchical artifact types:

1. **Initiative** - Strategic goals with vision and scope
2. **Milestone** - Major deliverables within initiatives
3. **Issue** - Atomic units of work with acceptance criteria

### Common Structure

All artifacts share a common metadata structure:

```typescript
interface ArtifactMetadata {
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimation: 'XS' | 'S' | 'M' | 'L' | 'XL';
  created_by: string;  // "Name (email)" or AI agent format
  assignee: string;
  schema_version: string;  // Semver format
  relationships: {
    blocks: string[];
    blocked_by: string[];
  };
  events: EventMetadata[];  // Immutable event log
}
```

### Event-Driven Lifecycle

Artifacts track their lifecycle through an append-only event log:

```typescript
type ArtifactEvent =
  | 'draft'        // Initial creation
  | 'ready'        // Ready for work
  | 'blocked'      // Blocked by dependencies
  | 'cancelled'    // No longer needed
  | 'in_progress'  // Work has started
  | 'in_review'    // Ready for review
  | 'completed'    // Work finished
  | 'archived';    // Permanently archived
```

### Event Identity System (v0.2.0)

All events include identity fields for tracking and cascade automation:

```typescript
interface EventMetadata {
  event_id: string;              // Unique identifier (evt_[16 hex chars])
  timestamp: string;             // ISO 8601 format
  event: TArtifactEvent;         // State transition
  actor: string;                 // Who triggered the event
  commit_hash?: string;          // Optional Git reference
  metadata?: {
    correlation_id: string;      // Links cascade chain (required)
    parent_event_id: string | null;  // Direct parent event
    [key: string]: unknown;      // Additional metadata
  };
}
```

This enables:
- **Cascade Automation**: State changes propagate automatically
- **Event Deduplication**: Unique IDs prevent duplicate processing
- **Audit Trails**: Complete history of all state transitions
- **Time Savings**: ~140 minutes saved per cascade operation

## Documentation

### 📚 Core Documentation

- **[Getting Started Guide](./docs/getting-started.md)** - Quick introduction and basic usage
- **[API Reference](./docs/api-reference.md)** - Complete API documentation for all exports
- **[Cookbook](./docs/cookbook.md)** - Practical recipes for common operations
- **[Migration Guide](./docs/migration-guide.md)** - Upgrade from manual YAML editing

### 🔧 Module Documentation

- [Types Documentation](./src/types/README.md) - TypeScript interfaces and constants
- [Schemas Documentation](./src/schemas/README.md) - Runtime validation rules
- [Parser Documentation](./src/parser/README.md) - YAML parsing functionality
- [Validator Documentation](./src/validator/README.md) - Type detection and validation
- [Metrics Documentation](./src/metrics/README.md) - Productivity metrics calculations
- [Events Documentation](./src/events/README.md) - Event identity and builder system
- [Cascade Documentation](./src/cascade/README.md) - Automatic state propagation
- [Event Validation Documentation](./src/event-validation/README.md) - State machine rules
- [Query Documentation](./src/query/README.md) - Artifact filtering and searching
- [Utils Documentation](./src/utils/README.md) - Timestamp and actor formatting utilities

## API Reference

### Types

```typescript
import {
  // Type aliases
  TArtifact, TArtifactEvent, TPriority, TEstimationSize,

  // Interfaces
  Initiative, Milestone, Issue, Artifact,
  ArtifactMetadata, EventMetadata, Challenge,

  // Constants
  CArtifact, CArtifactEvent, CPriority, CEstimationSize
} from '@kodebase/core/types';
```

### Schemas

```typescript
import {
  // Schema types
  InitiativeSchema, MilestoneSchema, IssueSchema, ArtifactSchema,

  // Zod schemas
  initiativeSchema, milestoneSchema, issueSchema,
  artifactMetadataSchema, eventMetadataSchema
} from '@kodebase/core/schemas';
```

### Parser

```typescript
import { ArtifactParser } from '@kodebase/core/parser';

const parser = new ArtifactParser();
parser.parseYaml(content);        // Parse without validation
parser.parseInitiative(content);  // Parse and validate as Initiative
parser.parseMilestone(content);   // Parse and validate as Milestone
parser.parseIssue(content);       // Parse and validate as Issue
```

### Validator

```typescript
import { ArtifactValidator } from '@kodebase/core/validator';

const validator = new ArtifactValidator();
validator.validate(data);           // Auto-detect and validate
validator.getArtifactType(data);    // Detect type without validation
validator.validateInitiative(data); // Validate as Initiative
validator.validateMilestone(data);  // Validate as Milestone
validator.validateIssue(data);      // Validate as Issue
```

### Events

```typescript
import {
  // Event identity
  generateEventId, isValidEventId,

  // Correlation tracking
  generateCorrelationId,

  // Event builders
  EventBuilder, createEvent, createCascadeEvent,

  // Cascade utilities
  getCascadeMetadata, hasCascadeMetadata
} from '@kodebase/core/events';
```

### Cascade

```typescript
import { CascadeEngine, CompletionCascadeAnalyzer } from '@kodebase/core/cascade';

// Basic cascade operations
const engine = new CascadeEngine();
engine.shouldCascadeToParent(children, parentState);
engine.generateCascadeEvent(newState, triggerEvent, cascadeType);
engine.archiveCancelledChildren(children, parentCompletionEvent);
engine.getBlockedDependents(artifactId, artifacts);

// Completion analysis (new in v0.2.0)
const analyzer = new CompletionCascadeAnalyzer();
const result = analyzer.analyzeCompletionCascade('A.1.1', artifacts);
const recommendations = analyzer.getCompletionRecommendations(artifacts);
```

### Event Validation

```typescript
import {
  // State machine
  canTransition, getValidTransitions, validateEventOrder,
  getCurrentState, isTerminalState,

  // Dependencies
  validateDependencies, hasCircularDependency,
  findOrphanedArtifacts, getDependents
} from '@kodebase/core/event-validation';
```

### Metrics

```typescript
import {
  // Time metrics
  calculateCycleTime, calculateLeadTime, calculateBlockedTime,

  // Velocity metrics
  calculateDailyVelocity, calculateWeeklyVelocity, getVelocityTrend,

  // Progress metrics
  getWorkInProgressCount, calculateThroughput,

  // Utilities
  getDurationInMinutes, formatDuration
} from '@kodebase/core/metrics';
```

### Query

```typescript
import {
  // Query builder
  ArtifactQuery, query,

  // Type guards
  isInitiative, isMilestone, isIssue
} from '@kodebase/core/query';
```

### Utils

```typescript
import {
  // Timestamp utilities
  formatTimestamp, parseTimestamp, isValidTimestamp,

  // Actor utilities
  formatActor, parseActor, isValidActor,

  // Types
  type ActorInfo
} from '@kodebase/core/utils';
```

## Usage Examples

### Complete Validation Pipeline

```typescript
import { ArtifactParser, ArtifactValidator } from '@kodebase/core';
import { readFileSync } from 'fs';

function loadAndValidateArtifact(filePath: string) {
  const parser = new ArtifactParser();
  const validator = new ArtifactValidator();

  try {
    // Read file
    const content = readFileSync(filePath, 'utf-8');

    // Parse YAML
    const data = parser.parseYaml(content);

    // Detect type
    const type = validator.getArtifactType(data);
    if (!type) {
      throw new Error('Unknown artifact type');
    }

    // Validate based on type
    const artifact = validator.validate(data);

    return { type, artifact };
  } catch (error) {
    console.error(`Failed to load ${filePath}:`, error.message);
    throw error;
  }
}
```

### Creating Type-Safe Artifacts

```typescript
import type { Issue } from '@kodebase/core/types';
import { CPriority, CEstimationSize, CArtifactEvent } from '@kodebase/core/types';

const issue: Issue = {
  metadata: {
    title: "Implement user authentication",
    priority: CPriority.HIGH,
    estimation: CEstimationSize.LARGE,
    created_by: "John Doe (john@example.com)",
    assignee: "Jane Smith (jane@example.com)",
    schema_version: "0.1.0",
    relationships: {
      blocks: [],
      blocked_by: ["A.1.1"]
    },
    events: [{
      timestamp: new Date().toISOString(),
      event: CArtifactEvent.DRAFT,
      actor: "John Doe (john@example.com)",
      event_id: "evt_1234567890abcdef",
      metadata: {
        correlation_id: "evt_1234567890abcdef",
        parent_event_id: null
      }
    }]
  },
  content: {
    summary: "Add secure authentication system",
    acceptance_criteria: [
      "Users can register with email/password",
      "Users can log in and receive JWT token",
      "Sessions expire after 24 hours"
    ]
  }
};
```

### Working with Events

```typescript
import { createEvent, createCascadeEvent } from '@kodebase/core/events';

// Create a simple event
const draftEvent = createEvent({
  event: 'draft',
  actor: 'John Doe (john@example.com)'
});

// Create a cascade event
const parentEvent = createEvent({
  event: 'completed',
  actor: 'developer@example.com'
});

const cascadeEvent = createCascadeEvent(parentEvent, {
  event: 'in_review',
  actor: 'system',
  additionalMetadata: {
    cascade_type: 'all_children_complete'
  }
});

// Events have proper identity fields
console.log(cascadeEvent.event_id);                    // evt_2345678901bcdef0
console.log(cascadeEvent.metadata.correlation_id);     // evt_1234567890abcdef
console.log(cascadeEvent.metadata.parent_event_id);    // evt_1234567890abcdef
```

### Working with Test Fixtures

```typescript
import { createIssueYaml, createInitiativeYaml } from '@kodebase/core/test/fixtures';
import { createEvent } from '@kodebase/core/events';

// Create test data with overrides
const issueYaml = createIssueYaml({
  metadata: {
    title: "Test Issue",
    priority: "critical",
    events: [
      createEvent({ event: 'draft', actor: 'test@example.com' }),
      createEvent({ event: 'ready', actor: 'test@example.com' })
    ]
  },
  content: {
    summary: "Test summary"
  }
});

// Use in tests
const parser = new ArtifactParser();
const issue = parser.parseIssue(issueYaml);
```

### Analyzing Productivity Metrics

```typescript
import {
  calculateCycleTime,
  calculateDailyVelocity,
  getVelocityTrend,
  formatDuration
} from '@kodebase/core/metrics';

// Analyze single artifact
const cycleTime = calculateCycleTime(artifact.metadata.events);
if (cycleTime !== null) {
  console.log(`Cycle time: ${formatDuration(cycleTime)}`);
}

// Calculate team velocity
const completedArtifacts = artifacts.filter(a =>
  a.metadata.events.some(e => e.event === 'completed')
);
const velocity = calculateDailyVelocity(completedArtifacts, 30);
console.log(`Daily velocity: ${velocity.toFixed(2)} items/day`);

// Check velocity trend
const trend = getVelocityTrend(artifacts, 14);
console.log(`Velocity ${trend.trend}: ${trend.current} vs ${trend.previous}`);
console.log(`Change: ${trend.percentageChange}%`);
```

### Cascade Automation

```typescript
import { CascadeEngine } from '@kodebase/core/cascade';
import { canTransition } from '@kodebase/core/event-validation';

const engine = new CascadeEngine();

// Check if parent should cascade
const children = [issue1, issue2, issue3]; // All completed
const decision = engine.shouldCascadeToParent(children);

if (decision.shouldCascade) {
  // Validate the transition
  const parentState = getCurrentState(parent);
  if (canTransition('milestone', parentState, decision.newState)) {
    // Generate cascade event
    const cascadeEvent = engine.generateCascadeEvent(
      decision.newState,
      lastChildCompletionEvent,
      'all_children_complete'
    );

    // Apply to parent
    parent.metadata.events.push(cascadeEvent);

    console.log(`Cascade triggered: ${parentState} → ${decision.newState}`);
    console.log(`Time saved: ~2 minutes`);
  }
}
```

### Query System

```typescript
import { ArtifactQuery, query, isIssue } from '@kodebase/core/query';

// Create a query instance
const q = query(artifacts);

// Find all ready issues in milestone A.3
const readyIssues = q
  .byStatus('ready')
  .inMilestone('A.3')
  .ofType('issue')
  .execute();

console.log(`Found ${readyIssues.length} ready issues in A.3`);

// Filter by multiple criteria
const blockedMilestones = new ArtifactQuery(artifacts)
  .byStatus('blocked')
  .ofType('milestone')
  .execute();

// Use type guards
readyIssues.forEach(artifact => {
  if (isIssue(artifact)) {
    console.log(`Issue: ${artifact.metadata.title}`);
    console.log(`Criteria: ${artifact.content.acceptance_criteria.length}`);
  }
});

// Performance: handles large datasets efficiently
const start = performance.now();
const results = query(thousandsOfArtifacts)
  .byStatus('in_progress')
  .execute();
const duration = performance.now() - start;
console.log(`Queried ${thousandsOfArtifacts.length} artifacts in ${duration}ms`);
```

## Error Handling

The package provides detailed error messages for validation failures:

```typescript
try {
  const artifact = parser.parseIssue(invalidYaml);
} catch (error) {
  console.error(error.message);
  // "Issue validation failed: metadata.priority: Invalid enum value.
  //  Expected "critical" | "high" | "medium" | "low", received "urgent";
  //  content.acceptance_criteria: Array must contain at least 1 element(s)"
}
```

## Design Principles

1. **Type Safety First** - All data structures have TypeScript types
2. **Runtime Validation** - Zod schemas ensure data integrity
3. **Clear Errors** - Detailed messages help debug issues quickly
4. **Separation of Concerns** - Each module has a single responsibility
5. **No Side Effects** - Pure functions for predictable behavior
6. **Extensible** - Easy to add new artifact types or fields

## Contributing

When contributing to this package:

1. Follow the existing naming conventions (C prefix for constants, T for type aliases)
2. Add comprehensive JSDoc comments to all public APIs
3. Write tests for new functionality
4. Update relevant documentation
5. Ensure all tests pass with `pnpm test`

## License

See LICENSE in the repository root.
