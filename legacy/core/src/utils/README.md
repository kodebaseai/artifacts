# Utils Module

The utils module provides essential utilities for formatting and parsing common Kodebase data types. These utilities eliminate manual repetitive tasks and ensure consistency across the system.

## Overview

This module provides:
- **Timestamp formatting and parsing** for ISO 8601 timestamps
- **Actor formatting and parsing** for both human and AI agent formats
- **YAML formatting** with structure preservation and field ordering
- **Field ordering** for consistent artifact structure
- **Smart diffing** for readable git history
- **Type-safe validation** with comprehensive error handling
- **Edge case handling** for malformed inputs

All utilities follow a consistent pattern: format functions create standardized output, parse functions extract structured data, and validation functions check format without throwing errors.

## Time Savings

These utilities address key pain points identified in the Kodebase workflow:
- **Timestamp generation**: Used 75-100 times per week (30s each = ~50 min/week saved)
- **Actor formatting**: Ensures consistency across all events and eliminates formatting errors
- **YAML formatting**: Used 75-100 times per week for artifact serialization
- **Field ordering**: Ensures consistent structure across all artifacts
- **Smart diffing**: Makes git history more readable and reviewable

## Timestamp Utilities

### `formatTimestamp(): string`

Returns the current UTC time in ISO 8601 format.

```typescript
import { formatTimestamp } from '@kodebase/core/utils';

const now = formatTimestamp();
// Returns: "2025-01-11T12:00:00.000Z"
```

**Features:**
- Always returns UTC timezone (Z suffix)
- Consistent 3-digit millisecond precision
- Compatible with all Kodebase event timestamps

### `parseTimestamp(timestamp: string): Date`

Validates and parses an ISO 8601 timestamp into a Date object.

```typescript
import { parseTimestamp } from '@kodebase/core/utils';

const date = parseTimestamp("2025-01-11T12:00:00Z");
// Returns: Date object

// Handles different precision levels
parseTimestamp("2025-01-11T12:00:00.1Z");   // 1 digit milliseconds
parseTimestamp("2025-01-11T12:00:00.12Z");  // 2 digits
parseTimestamp("2025-01-11T12:00:00.123Z"); // 3 digits
```

**Validation:**
- Ensures ISO 8601 format compliance
- Validates date components (catches invalid dates)
- Throws descriptive errors for malformed input

**Throws:**
- `Error` if timestamp is not a string or is empty
- `Error` if format doesn't match ISO 8601 pattern
- `Error` if date components are invalid

### `isValidTimestamp(timestamp: string): boolean`

Validates timestamp format without throwing errors.

```typescript
import { isValidTimestamp } from '@kodebase/core/utils';

isValidTimestamp("2025-01-11T12:00:00Z"); // true
isValidTimestamp("invalid");              // false
isValidTimestamp(null);                   // false (safely handles any input)
```

## Actor Utilities

### `formatActor(name: string, email: string): string`

Formats actor name and email into the standard Kodebase format.

```typescript
import { formatActor } from '@kodebase/core/utils';

const actor = formatActor("John Doe", "john@example.com");
// Returns: "John Doe (john@example.com)"

// Handles whitespace
formatActor("  Jane Smith  ", "  jane@company.com  ");
// Returns: "Jane Smith (jane@company.com)"
```

**Features:**
- Trims whitespace from inputs
- Validates email format
- Consistent output format for all events

**Throws:**
- `Error` if name is not a string or is empty
- `Error` if email is not a string or is empty
- `Error` if email format is invalid

### `parseActor(actorString: string): ActorInfo`

Parses formatted actor strings to extract name and email components.

```typescript
import { parseActor, type ActorInfo } from '@kodebase/core/utils';

// Human format
const { name, email } = parseActor("John Doe (john@example.com)");
// Returns: { name: "John Doe", email: "john@example.com" }

// AI agent format
const agent = parseActor("agent.CLAUDE.ABC123@acme.kodebase.ai");
// Returns: { name: "CLAUDE Agent ABC123", email: "agent.CLAUDE.ABC123@acme.kodebase.ai" }
```

**Supported Formats:**
- **Human**: `"Name (email@domain.com)"`
- **AI Agent**: `"agent.[TYPE].[SESSION]@[TENANT].kodebase.ai"`

**Features:**
- Handles complex names with spaces and special characters
- Supports parentheses within names
- Validates email format for human actors
- Extracts meaningful names from AI agent identifiers

**Throws:**
- `Error` if input is not a string or is empty
- `Error` if format doesn't match supported patterns
- `Error` if email validation fails

### `isValidActor(actorString: string): boolean`

Validates actor format without throwing errors.

```typescript
import { isValidActor } from '@kodebase/core/utils';

isValidActor("John Doe (john@example.com)");              // true
isValidActor("agent.CLAUDE.ABC123@acme.kodebase.ai");     // true
isValidActor("invalid format");                           // false
```

## Type Definitions

```typescript
interface ActorInfo {
  name: string;
  email: string;
}
```

## Usage Examples

### Event Creation with Utilities

```typescript
import { formatTimestamp, formatActor, createEvent } from '@kodebase/core';

// Manual approach (before utilities)
const manualEvent = {
  timestamp: new Date().toISOString(),
  actor: "John Doe (john@example.com)",
  event: 'ready',
  // ... other fields
};

// With utilities (consistent and validated)
const event = createEvent({
  timestamp: formatTimestamp(),
  actor: formatActor("John Doe", "john@example.com"),
  event: 'ready'
});
```

### Processing Event Data

```typescript
import { parseTimestamp, parseActor } from '@kodebase/core/utils';

function analyzeEvent(event) {
  // Parse timestamp for calculations
  const eventDate = parseTimestamp(event.timestamp);
  const hoursSinceEvent = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60);

  // Parse actor for display
  const { name, email } = parseActor(event.actor);

  return {
    actor: name,
    contact: email,
    hoursAgo: Math.round(hoursSinceEvent)
  };
}
```

### Validation Pipeline

```typescript
import { isValidTimestamp, isValidActor } from '@kodebase/core/utils';

function validateEventData(data) {
  const errors = [];

  if (!isValidTimestamp(data.timestamp)) {
    errors.push('Invalid timestamp format');
  }

  if (!isValidActor(data.actor)) {
    errors.push('Invalid actor format');
  }

  return errors.length === 0 ? null : errors;
}
```

### Round-trip Operations

```typescript
import { formatActor, parseActor, formatTimestamp, parseTimestamp } from '@kodebase/core/utils';

// Actors
const formatted = formatActor("John Doe", "john@example.com");
const parsed = parseActor(formatted);
const reformatted = formatActor(parsed.name, parsed.email);
// formatted === reformatted (true)

// Timestamps
const timestamp = formatTimestamp();
const date = parseTimestamp(timestamp);
const backToString = date.toISOString();
// timestamp === backToString (true)
```

## Error Handling

All utilities provide clear, actionable error messages:

```typescript
// Timestamp errors
parseTimestamp("");
// Error: Invalid timestamp format. Expected ISO 8601 format.

parseTimestamp("2025-01-11");
// Error: Invalid timestamp format. Expected ISO 8601 format with UTC timezone.

// Actor errors
formatActor("", "john@example.com");
// Error: Actor name is required and must be a non-empty string.

formatActor("John", "invalid-email");
// Error: Invalid email format. Expected format: user@domain.com

parseActor("John Doe");
// Error: Invalid actor format. Expected "Name (email@domain.com)" or AI agent format "agent.[TYPE].[SESSION]@[TENANT].kodebase.ai"
```

## Design Principles

1. **Consistency** - All utilities follow the same pattern: format, parse, validate
2. **Type Safety** - Strong TypeScript types with proper error handling
3. **Validation First** - All inputs are validated before processing
4. **Clear Errors** - Descriptive error messages for easy debugging
5. **Edge Case Handling** - Graceful handling of malformed inputs
6. **No Side Effects** - Pure functions with predictable outputs

## YAML Formatting Utilities

### `formatYaml(data: unknown, options?: YamlFormatOptions): string`

Formats JavaScript objects as YAML with consistent formatting.

```typescript
import { formatYaml } from '@kodebase/core/utils';

const yaml = formatYaml({ name: "test", value: 123 });
// Returns:
// name: test
// value: 123
```

**Options:**
- `indent`: Number of spaces for indentation (default: 2)
- `lineWidth`: Maximum line width (default: 80)
- `quotingType`: Quote style for strings ('"' or "'", default: '"')
- `forceQuotes`: Force quotes on all strings (default: false)

### `parseYaml(yamlString: string): unknown`

Parses YAML string to JavaScript object.

```typescript
import { parseYaml } from '@kodebase/core/utils';

const data = parseYaml("name: test\nvalue: 123");
// Returns: { name: "test", value: 123 }
```

### `formatYamlWithFieldOrder(data: Record<string, unknown>, fieldOrder: string[]): string`

Formats YAML with fields in a specific order.

```typescript
import { formatYamlWithFieldOrder } from '@kodebase/core/utils';

const yaml = formatYamlWithFieldOrder(
  { b: 2, a: 1, c: 3 },
  ['a', 'b', 'c']
);
// Returns YAML with fields in order: a, b, c
```

## Field Ordering Utilities

### `orderArtifactFields(artifact: Record<string, unknown>, type: 'issue' | 'milestone' | 'initiative'): Record<string, unknown>`

Orders all fields in an artifact according to Kodebase conventions.

```typescript
import { orderArtifactFields } from '@kodebase/core/utils';

const orderedArtifact = orderArtifactFields(artifact, 'issue');
// Returns artifact with all fields properly ordered
```

### Pre-defined Field Orders

```typescript
import {
  METADATA_FIELD_ORDER,
  EVENT_FIELD_ORDER,
  ISSUE_CONTENT_FIELD_ORDER
} from '@kodebase/core/utils';

// Use these constants for consistent field ordering
```

### `detectArtifactType(artifactId: string): 'issue' | 'milestone' | 'initiative'`

Detects artifact type from its ID.

```typescript
import { detectArtifactType } from '@kodebase/core/utils';

detectArtifactType('A.1.5'); // 'issue'
detectArtifactType('B.2');   // 'milestone'
detectArtifactType('C');     // 'initiative'
```

## Smart Diff Utilities

### `formatForDiff(value: unknown, options?: SmartDiffOptions): string`

Formats values for optimal git diff readability.

```typescript
import { formatForDiff } from '@kodebase/core/utils';

const formatted = formatForDiff({
  items: ['one', 'two', 'three']
}, {
  arrayItemsPerLine: true,
  trailingCommas: true
});
// Returns formatted string with each array item on its own line
```

### `formatArtifactForDiff(artifact: Record<string, unknown>): string`

Special formatting for Kodebase artifacts to make diffs more readable.

```typescript
import { formatArtifactForDiff } from '@kodebase/core/utils';

const formatted = formatArtifactForDiff(artifact);
// Returns artifact formatted with optimal diff visibility
```

### `summarizeArtifactChanges(oldArtifact: Record<string, unknown>, newArtifact: Record<string, unknown>): string[]`

Generates human-readable change summary.

```typescript
import { summarizeArtifactChanges } from '@kodebase/core/utils';

const changes = summarizeArtifactChanges(oldArtifact, newArtifact);
// Returns: ["metadata.status changed from 'draft' to 'ready'", ...]
```

## Combined Usage Example

```typescript
import {
  formatTimestamp,
  parseActor,
  orderArtifactFields,
  formatYamlWithFieldOrder,
  METADATA_FIELD_ORDER
} from '@kodebase/core/utils';

// Create a properly formatted artifact
const artifact = {
  metadata: {
    title: "New Feature",
    timestamp: formatTimestamp(),
    actor: formatActor("John Doe", "john@example.com")
  },
  content: {
    summary: "Add new feature"
  }
};

// Order fields properly
const ordered = orderArtifactFields(artifact, 'issue');

// Format as YAML with correct field order
const yaml = formatYamlWithFieldOrder(ordered, METADATA_FIELD_ORDER);
```

## Best Practices

1. **Use formatters for all event creation** - Ensures consistency
2. **Validate inputs early** - Use `isValid*` functions before processing
3. **Handle errors gracefully** - Catch and provide user-friendly messages
4. **Round-trip test data** - Format then parse to verify data integrity
5. **Prefer utilities over manual formatting** - Eliminates human error
6. **Use field ordering for all artifacts** - Ensures consistent structure
7. **Format artifacts for diff before committing** - Improves git history readability
