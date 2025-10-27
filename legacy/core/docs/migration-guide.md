# Migration Guide: From Manual YAML to @kodebase/core

This guide helps you transition from manually editing YAML files to using the @kodebase/core TypeScript API.

## Table of Contents

1. [Overview](#overview)
2. [Key Benefits](#key-benefits)
3. [Migration Steps](#migration-steps)
4. [Common Patterns](#common-patterns)
5. [CLI Integration](#cli-integration)
6. [Troubleshooting](#troubleshooting)

## Overview

Previously, Kodebase artifacts were managed by manually editing YAML files. This approach was error-prone and lacked validation. The @kodebase/core package provides:

- **Type Safety**: Full TypeScript types prevent errors
- **Validation**: Runtime validation with clear error messages
- **Automation**: Event IDs, timestamps, and formatting handled automatically
- **Intelligence**: Cascade analysis and state machine validation

## Key Benefits

### Before (Manual YAML)
```yaml
# Manually typed, error-prone
metadata:
  title: "Implement feature"
  priority: high  # Easy to misspell
  events:
    - timestamp: "2025-01-14T12:00:00Z"  # Manual formatting
      event: ready
      actor: "John Doe (john@example.com)"  # Manual formatting
      event_id: evt_...  # Manual generation
```

### After (@kodebase/core)
```typescript
import { createEvent, formatActor, formatTimestamp } from '@kodebase/core';

// Type-safe, validated, automated
const event = createEvent({
  event: 'ready',  // Auto-completed
  actor: formatActor('John Doe', 'john@example.com')
  // timestamp and event_id generated automatically
});
```

## Migration Steps

### Step 1: Install the Package

```bash
pnpm add @kodebase/core
```

### Step 2: Load Existing YAML Files

```typescript
import { ArtifactParser } from '@kodebase/core';
import { readFileSync, writeFileSync } from 'fs';

const parser = new ArtifactParser();

// Load existing YAML
const yamlContent = readFileSync('.kodebase/artifacts/A.1.5.yml', 'utf-8');
const issue = parser.parseIssue(yamlContent);

// Now you have a type-safe object
console.log(issue.metadata.title);
```

### Step 3: Update Artifacts Programmatically

```typescript
import { createEvent } from '@kodebase/core';

// Add new event
const newEvent = createEvent({
  event: 'in_progress',
  actor: 'Jane Smith (jane@example.com)'
});

issue.metadata.events.push(newEvent);

// Validate before saving
const validator = new ArtifactValidator();
validator.validateIssue(issue); // Throws if invalid
```

### Step 4: Save Updated Artifacts

```typescript
import { stringify } from 'yaml';

// Convert back to YAML
const updatedYaml = stringify(issue);
writeFileSync('.kodebase/artifacts/A.1.5.yml', updatedYaml);
```

## Common Patterns

### Pattern 1: State Transitions

```typescript
import { canTransition, getCurrentState, createEvent } from '@kodebase/core';

function transitionArtifact(artifact: Issue, newState: TArtifactEvent, actor: string) {
  const currentState = getCurrentState(artifact);
  
  if (!canTransition('issue', currentState, newState)) {
    throw new Error(`Cannot transition from ${currentState} to ${newState}`);
  }
  
  artifact.metadata.events.push(
    createEvent({ event: newState, actor })
  );
}
```

### Pattern 2: Cascade Automation

```typescript
import { CascadeEngine, createCascadeEvent } from '@kodebase/core';

const engine = new CascadeEngine();

// Check if parent should cascade
const children = [issue1, issue2, issue3];
const result = engine.shouldCascadeToParent(children, parent.metadata.events);

if (result.shouldCascade) {
  const cascadeEvent = createCascadeEvent(
    lastChildEvent,
    {
      event: result.newState,
      actor: 'system'
    }
  );
  
  parent.metadata.events.push(cascadeEvent);
  // Save 140+ minutes of manual cascade checking!
}
```

### Pattern 3: Bulk Operations

```typescript
import { ArtifactParser, ArtifactValidator } from '@kodebase/core';
import { glob } from 'glob';

async function validateAllArtifacts() {
  const parser = new ArtifactParser();
  const validator = new ArtifactValidator();
  
  const files = await glob('.kodebase/artifacts/**/*.yml');
  const errors: string[] = [];
  
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const data = parser.parseYaml(content);
      validator.validate(data);
    } catch (error) {
      errors.push(`${file}: ${error.message}`);
    }
  }
  
  return errors;
}
```

### Pattern 4: Creating New Artifacts

```typescript
import { 
  createEvent, 
  formatActor, 
  formatTimestamp,
  type Issue 
} from '@kodebase/core';

function createNewIssue(
  title: string,
  summary: string,
  acceptanceCriteria: string[],
  creator: { name: string; email: string }
): Issue {
  return {
    metadata: {
      title,
      priority: 'medium',
      estimation: 'M',
      created_by: formatActor(creator.name, creator.email),
      assignee: formatActor(creator.name, creator.email),
      schema_version: '0.2.0',
      relationships: {
        blocks: [],
        blocked_by: []
      },
      events: [
        createEvent({
          event: 'draft',
          actor: formatActor(creator.name, creator.email)
        })
      ]
    },
    content: {
      summary,
      acceptance_criteria: acceptanceCriteria
    }
  };
}
```

## CLI Integration

The @kodebase/core package is designed to power the Kodebase CLI:

### Example CLI Command Implementation

```typescript
import { ArtifactParser, createEvent, formatActor } from '@kodebase/core';
import { readFileSync, writeFileSync } from 'fs';
import { stringify } from 'yaml';

export function markReady(artifactPath: string, actor: string) {
  // Load artifact
  const parser = new ArtifactParser();
  const content = readFileSync(artifactPath, 'utf-8');
  const artifact = parser.validate(content);
  
  // Add ready event
  const event = createEvent({
    event: 'ready',
    actor
  });
  
  artifact.metadata.events.push(event);
  
  // Save
  const yaml = stringify(artifact);
  writeFileSync(artifactPath, yaml);
  
  console.log(`✓ Marked ${artifact.metadata.title} as ready`);
}
```

### Git Hook Integration

```typescript
// .git/hooks/post-checkout
import { createEvent } from '@kodebase/core';
import { execSync } from 'child_process';

const branch = process.argv[2];
const actor = execSync('git config user.name').toString().trim();
const email = execSync('git config user.email').toString().trim();

if (branch.match(/^[A-Z]\.\d+\.\d+$/)) {
  // Auto-update artifact to in_progress
  updateArtifactStatus(branch, 'in_progress', formatActor(actor, email));
}
```

## Troubleshooting

### Common Issues

#### 1. Validation Errors
```typescript
// Problem: "Invalid enum value"
issue.metadata.priority = 'urgent'; // ❌ Not a valid priority

// Solution: Use constants
import { CPriority } from '@kodebase/core';
issue.metadata.priority = CPriority.HIGH; // ✓
```

#### 2. Event Chronology
```typescript
// Problem: "Events must be in chronological order"
events.push({ timestamp: '2025-01-01T12:00:00Z', ... }); // ❌ Earlier than last

// Solution: Use createEvent for auto-timestamp
events.push(createEvent({ event: 'ready', actor })); // ✓
```

#### 3. Missing Required Fields
```typescript
// Problem: "metadata.events[0].metadata.correlation_id required"
const event = {
  event_id: generateEventId(),
  // Missing correlation_id in metadata
};

// Solution: Use createCascadeEvent
const event = createCascadeEvent(parentEvent, {
  event: 'completed',
  actor: 'system'
}); // ✓ Auto-includes all required fields
```

### Best Practices

1. **Always validate after modifications**
   ```typescript
   artifact.metadata.priority = newPriority;
   validator.validate(artifact); // Catch errors early
   ```

2. **Use helper functions for consistency**
   ```typescript
   // Don't manually format
   const actor = `${name} (${email})`; // ❌
   
   // Use formatActor
   const actor = formatActor(name, email); // ✓
   ```

3. **Handle errors gracefully**
   ```typescript
   try {
     const artifact = parser.parseIssue(content);
   } catch (error) {
     if (error.message.includes('validation failed')) {
       // Handle validation error
     }
   }
   ```

4. **Preserve immutability in events**
   ```typescript
   // Don't modify existing events
   artifact.metadata.events[0].event = 'ready'; // ❌
   
   // Add new events only
   artifact.metadata.events.push(newEvent); // ✓
   ```

## Next Steps

1. **Explore the API**: See [API Reference](./api-reference.md)
2. **View Examples**: Check the README for practical examples
3. **Join Community**: Report issues or contribute at github.com/kodebase/core

## Questions?

For additional help:
- Check the [API Reference](./api-reference.md)
- Review the test files for usage examples
- Open an issue on GitHub