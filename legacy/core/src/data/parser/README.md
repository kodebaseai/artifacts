# Kodebase Parser

The parser module provides YAML parsing functionality for Kodebase artifacts. It handles the conversion from YAML strings to validated TypeScript objects.

## Overview

The `ArtifactParser` class provides:
- **YAML parsing** with comprehensive error handling
- **Type-specific parsing** methods for each artifact type
- **Schema validation** integrated with parsing
- **Clear error messages** for debugging

## API Reference

### Constructor

```typescript
const parser = new ArtifactParser();
```

No configuration required - the parser uses schemas from the schemas module.

### Methods

#### `parseYaml(content: string): unknown`

Parses a YAML string into a JavaScript object without validation.

```typescript
const data = parser.parseYaml('title: My Initiative\npriority: high');
// Returns: { title: 'My Initiative', priority: 'high' }
```

**Throws:**
- Error if content is not a string
- Error if content is empty
- Error if YAML syntax is invalid

#### `parseInitiative(content: string): InitiativeSchema`

Parses and validates an Initiative YAML string.

```typescript
const initiative = parser.parseInitiative(yamlContent);
// Returns validated Initiative object
```

**Throws:**
- YAML parsing errors
- Schema validation errors with detailed messages

#### `parseMilestone(content: string): MilestoneSchema`

Parses and validates a Milestone YAML string.

```typescript
const milestone = parser.parseMilestone(yamlContent);
// Returns validated Milestone object
```

#### `parseIssue(content: string): IssueSchema`

Parses and validates an Issue YAML string.

```typescript
const issue = parser.parseIssue(yamlContent);
// Returns validated Issue object
```

## Error Handling

The parser provides detailed error messages for common issues:

### YAML Syntax Errors
```typescript
try {
  parser.parseYaml('invalid: yaml: content:');
} catch (error) {
  // Error: Invalid YAML syntax: bad indentation of a mapping entry
}
```

### Validation Errors
```typescript
try {
  parser.parseIssue('metadata:\n  title: Test');
} catch (error) {
  // Error: Issue validation failed: metadata.priority: Required; 
  // metadata.estimation: Required; metadata.created_by: Required...
}
```

### Empty Content
```typescript
try {
  parser.parseYaml('');
} catch (error) {
  // Error: Cannot parse empty YAML content
}
```

## Usage Examples

### Basic Parsing
```typescript
import { ArtifactParser } from '@kodebase/core/parser';

const parser = new ArtifactParser();

// Parse an issue from YAML string
const yamlContent = `
metadata:
  title: "Implement user authentication"
  priority: high
  estimation: M
  created_by: "John Doe (john@example.com)"
  assignee: "Jane Smith (jane@example.com)"
  schema_version: "0.2.0"
  relationships:
    blocks: []
    blocked_by: ["A.1.1"]
  events:
    - event: draft
      timestamp: "2025-01-06T10:00:00Z"
      actor: "John Doe (john@example.com)"
      trigger: artifact_created
content:
  summary: "Add login functionality"
  acceptance_criteria:
    - "User can log in with email/password"
    - "User receives error for invalid credentials"
`;

const issue = parser.parseIssue(yamlContent);
console.log(issue.metadata.title); // "Implement user authentication"
```

### Error Recovery
```typescript
function safeParseArtifact(content: string, type: 'initiative' | 'milestone' | 'issue') {
  const parser = new ArtifactParser();
  
  try {
    switch (type) {
      case 'initiative':
        return { success: true, data: parser.parseInitiative(content) };
      case 'milestone':
        return { success: true, data: parser.parseMilestone(content) };
      case 'issue':
        return { success: true, data: parser.parseIssue(content) };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
```

### Working with Files
```typescript
import { readFileSync } from 'fs';
import { ArtifactParser } from '@kodebase/core/parser';

const parser = new ArtifactParser();

// Read and parse an artifact file
const content = readFileSync('./artifacts/A.1.5.yml', 'utf-8');
const issue = parser.parseIssue(content);
```

## Design Decisions

### 1. Separation of Parsing and Validation
The `parseYaml` method separates YAML parsing from schema validation, allowing:
- Debugging of YAML syntax issues separately from validation
- Reuse of parsing logic across different artifact types
- Clear error messages indicating the failure point

### 2. Type-Specific Methods
Instead of a generic `parse` method, we provide type-specific methods:
- Better TypeScript inference
- Clear API intent
- Type-safe return values

### 3. Error Message Formatting
Validation errors are formatted for readability:
```typescript
private formatZodError(error: z.ZodError): string {
  return error.errors
    .map((err) => `${err.path.join('.')}: ${err.message}`)
    .join('; ');
}
```

This produces errors like:
```
metadata.priority: Required; content.summary: Required
```

## Testing Patterns

### Unit Tests
```typescript
describe('ArtifactParser', () => {
  it('should parse valid YAML', () => {
    const parser = new ArtifactParser();
    const result = parser.parseYaml('key: value');
    expect(result).toEqual({ key: 'value' });
  });

  it('should validate issue structure', () => {
    const parser = new ArtifactParser();
    const issue = parser.parseIssue(validIssueYaml);
    expect(issue.metadata.title).toBeDefined();
  });
});
```

### Test Fixtures
Use the test fixtures for consistent test data:
```typescript
import { createIssueYaml } from '@kodebase/core/test/fixtures';

const yamlContent = createIssueYaml({
  metadata: { title: 'Test Issue' }
});
const issue = parser.parseIssue(yamlContent);
```

## Performance Considerations

- **YAML parsing** is synchronous - for large files, consider async alternatives
- **Schema validation** is fast but scales with object complexity
- **Error formatting** only runs on validation failure

## Event Schema v2.0 Parsing

As of schema v2.0, the parser validates the simplified event structure:

### Required Event Fields (v2.0 Schema)
```yaml
events:
  - event: draft                               # Event type (required)
    timestamp: "2025-01-07T00:00:00Z"         # ISO 8601 timestamp (required)
    actor: "John Doe (john@example.com)"      # Actor in "Name (email)" format (required)
    trigger: artifact_created                 # What caused the event (required)
```

### Event Field Order
The v2.0 schema enforces specific field ordering for consistency:
1. `event` - The state name
2. `timestamp` - When it happened
3. `actor` - Who triggered it
4. `trigger` - What caused it
5. `metadata` - Optional additional data

### Cascade Events with Metadata
When events are part of a cascade chain:
```yaml
events:
  - event: ready
    timestamp: "2025-01-07T10:30:00Z"
    actor: "system"
    trigger: dependency_completed
    metadata:
      trigger_artifact: "A.1.3"              # What artifact triggered this cascade
      cascade_type: "dependency_met"         # Type of cascade
      dependencies_checked: ["A.1.1", "A.1.2"]
```

### Available Triggers
Common trigger values from `CEventTrigger`:
- `artifact_created` - Initial creation
- `manual` - Manual state change
- `branch_created` - Git branch created
- `pr_created` - Pull request created
- `pr_merged` - Pull request merged
- `dependencies_met` - Dependencies already satisfied
- `dependency_completed` - Blocking dependency completed

### Common Parsing Errors

Missing trigger field:
```yaml
# This will fail validation
events:
  - event: draft
    timestamp: "2025-01-07T00:00:00Z"
    actor: "John Doe (john@example.com)"
    # Missing trigger field!
```

Error: `events[0].trigger: Trigger is required`

Invalid actor format:
```yaml
# This will fail - actor must be in "Name (email)" format
events:
  - event: draft
    timestamp: "2025-01-07T00:00:00Z"
    actor: "john@example.com"  # Missing name format
    trigger: artifact_created
```

Error: `events[0].actor: Actor must be in format "Name (email@domain)"`

### Using Event Builder

For easier event creation in tests and applications:
```typescript
import { createEvent } from '@kodebase/core/events';
import { CEventTrigger } from '@kodebase/core/constants';
import { createIssueYaml } from '@kodebase/core/test/fixtures';

const yaml = createIssueYaml({
  metadata: {
    events: [
      createEvent({
        event: 'draft',
        actor: 'John Doe (john@example.com)',
        trigger: CEventTrigger.ARTIFACT_CREATED
      })
    ]
  }
});

const issue = parser.parseIssue(yaml);
// Event will have auto-generated timestamp and proper field ordering
```

## Related Documentation

- [Schema Documentation](../schemas/README.md) - Validation rules
- [Type Documentation](../types/README.md) - TypeScript interfaces
- [Validator Documentation](../validator/README.md) - Runtime validation
- [Events Documentation](../events/README.md) - Event builder and identity