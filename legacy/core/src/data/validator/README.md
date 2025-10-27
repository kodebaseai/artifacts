# Kodebase Artifact Validator

The artifact-validator module provides runtime validation and automatic type detection for Kodebase artifacts. It can validate unknown data structures and determine their artifact type dynamically.

## Overview

The `ArtifactValidator` class provides:
- **Runtime validation** of unknown data
- **Automatic type detection** based on content structure
- **Type-specific validation** methods
- **Comprehensive error reporting**

## API Reference

### Constructor

```typescript
const validator = new ArtifactValidator();
```

No configuration required - the validator uses schemas from the schemas module.

### Methods

#### `validate(data: unknown): ArtifactSchema`

Automatically detects the artifact type and validates the data.

```typescript
const artifact = validator.validate(unknownData);
// Returns: Initiative | Milestone | Issue (validated)
```

**Throws:**
- Error if artifact type cannot be detected
- Validation errors with detailed messages

#### `getArtifactType(data: unknown): ArtifactType | null`

Determines the artifact type from data structure without validation.

```typescript
const type = validator.getArtifactType(data);
// Returns: 'initiative' | 'milestone' | 'issue' | null
```

**Type Detection Logic:**
- Initiative: Has `vision`, `scope`, and `success_criteria` in content
- Milestone: Has `deliverables` and `validation` in content
- Issue: Has `acceptance_criteria` in content

#### `validateInitiative(data: unknown): InitiativeSchema`

Validates data as an Initiative artifact.

```typescript
const initiative = validator.validateInitiative(data);
// Returns validated Initiative object
```

**Validates:**
- Vision must be at least 10 characters
- Scope must be at least 10 characters
- At least one success criterion required
- Completion summary fields when present

#### `validateMilestone(data: unknown): MilestoneSchema`

Validates data as a Milestone artifact.

```typescript
const milestone = validator.validateMilestone(data);
// Returns validated Milestone object
```

**Validates:**
- At least one deliverable required
- At least one validation criterion required
- Completion summary fields when present

#### `validateIssue(data: unknown): IssueSchema`

Validates data as an Issue artifact.

```typescript
const issue = validator.validateIssue(data);
// Returns validated Issue object
```

**Validates:**
- At least one acceptance criterion required
- Development process requirements
- Completion analysis requirements
- Manual testing steps when present

## Usage Examples

### Basic Validation

```typescript
import { ArtifactValidator } from '@kodebase/core/artifact-validator';

const validator = new ArtifactValidator();

// Unknown data from file or API
const data = {
  metadata: {
    title: "Build authentication system",
    priority: "high",
    estimation: "L",
    // ... other metadata
  },
  content: {
    summary: "Implement secure user authentication",
    acceptance_criteria: [
      "Users can register with email/password",
      "Users can log in and receive JWT token"
    ]
  }
};

// Auto-detect and validate
const artifact = validator.validate(data);
console.log('Validated as:', validator.getArtifactType(data)); // 'issue'
```

### Type Detection

```typescript
function processArtifact(data: unknown) {
  const validator = new ArtifactValidator();
  const type = validator.getArtifactType(data);
  
  switch (type) {
    case 'initiative':
      console.log('Processing initiative:', data.content.vision);
      break;
    case 'milestone':
      console.log('Processing milestone with', data.content.deliverables.length, 'deliverables');
      break;
    case 'issue':
      console.log('Processing issue with', data.content.acceptance_criteria.length, 'criteria');
      break;
    default:
      throw new Error('Unknown artifact type');
  }
}
```

### Error Handling with Enhanced Formatting

```typescript
import { ArtifactValidator, formatValidationErrors, getValidationErrorDetails } from '@kodebase/core';

const validator = new ArtifactValidator();

try {
  const artifact = validator.validate(unknownData);
  // Process validated artifact
} catch (error) {
  console.error(error.message);
  // Example output:
  // "Issue validation failed: The priority level for this artifact must be one of: 
  //  low, medium, high, critical (found: 'urgent'). Change the value to one of 
  //  the valid options: low, medium, high, critical"
}
```

### Advanced Error Analysis

```typescript
import { formatValidationErrors, getValidationErrorDetails } from '@kodebase/core';
import { z } from 'zod';

try {
  const artifact = validator.validate(unknownData);
} catch (error) {
  if (error instanceof Error && error.message.includes('validation failed')) {
    // The error message already contains formatted, actionable information
    console.error(error.message);
  }
  
  // For deeper analysis, use Zod directly
  try {
    issueSchema.parse(unknownData);
  } catch (zodError) {
    if (zodError instanceof z.ZodError) {
      // Get detailed error information
      const details = getValidationErrorDetails(zodError);
      details.forEach(detail => {
        console.log(`Field: ${detail.path}`);
        console.log(`Problem: ${detail.message}`);
        console.log(`Expected: ${detail.expected}`);
        console.log(`Suggestion: ${detail.suggestion}`);
      });
    }
  }
}
```

### Validation Pipeline

```typescript
import { ArtifactParser, ArtifactValidator } from '@kodebase/core';

// Complete validation pipeline
function validateYamlFile(yamlContent: string) {
  const parser = new ArtifactParser();
  const validator = new ArtifactValidator();
  
  // Parse YAML to object
  const data = parser.parseYaml(yamlContent);
  
  // Validate and get typed result
  const artifact = validator.validate(data);
  
  return {
    type: validator.getArtifactType(data),
    artifact
  };
}
```

## Design Decisions

### 1. Unknown Input Type
All validation methods accept `unknown` instead of specific types:
- Allows validation of data from any source
- Forces proper runtime checking
- Prevents TypeScript bypass with `any`

### 2. Type Detection Strategy
Type detection uses content structure rather than explicit type fields:
- More resilient to data corruption
- Works with legacy data
- Enables migration scenarios

### 3. Error Message Quality
Validation errors are formatted for clarity:
```typescript
private formatZodError(error: z.ZodError): string {
  return error.errors
    .map((err) => `${err.path.join('.')}: ${err.message}`)
    .join('; ');
}
```

### 4. Enhanced Error Formatting
Validation errors are transformed into developer-friendly messages:
- Field paths with human-readable descriptions
- Expected values clearly shown
- Actionable fix suggestions
- Support for nested validation errors

### 5. Single Responsibility
The validator only validates - it doesn't parse or transform:
- Clear separation of concerns
- Composable with other modules
- Easier to test and maintain

## Testing Strategies

### Unit Tests
```typescript
describe('ArtifactValidator', () => {
  let validator: ArtifactValidator;
  
  beforeEach(() => {
    validator = new ArtifactValidator();
  });
  
  it('should detect initiative type', () => {
    const data = {
      content: {
        vision: 'Long term vision',
        scope: 'Project scope',
        success_criteria: ['Criterion 1']
      }
    };
    
    expect(validator.getArtifactType(data)).toBe('initiative');
  });
  
  it('should validate complete issue', () => {
    const issue = createValidIssue();
    expect(() => validator.validateIssue(issue)).not.toThrow();
  });
});
```

### Integration Tests
```typescript
it('should work with parser output', () => {
  const parser = new ArtifactParser();
  const validator = new ArtifactValidator();
  
  const parsed = parser.parseYaml(yamlContent);
  const validated = validator.validate(parsed);
  
  expect(validated).toBeDefined();
});
```

## Performance Notes

- **Type detection** is O(1) - only checks for specific fields
- **Validation** performance depends on schema complexity
- **Error formatting** only runs on failure
- **No caching** - each validation is independent

## Common Patterns

### Validate Multiple Artifacts
```typescript
function validateArtifacts(dataArray: unknown[]): ArtifactSchema[] {
  const validator = new ArtifactValidator();
  return dataArray.map(data => validator.validate(data));
}
```

### Filter by Type
```typescript
function getIssuesOnly(artifacts: unknown[]): IssueSchema[] {
  const validator = new ArtifactValidator();
  
  return artifacts
    .filter(a => validator.getArtifactType(a) === 'issue')
    .map(a => validator.validateIssue(a));
}
```

## Related Documentation

- [Schema Documentation](../schemas/README.md) - Validation rules
- [Type Documentation](../types/README.md) - TypeScript interfaces
- [Parser Documentation](../parser/README.md) - YAML parsing