# Error Handling System

Centralized error handling system for `@kodebase/git-ops` with structured messages, debug mode, and actionable guidance.

## Overview

The error handling system provides:

- **Structured Error Messages** - Clear problem description with specific solutions
- **Error Categorization** - Differentiates between user errors, system failures, and external dependencies
- **Color-Coded Severity** - Visual indicators for quick issue assessment
- **Debug Mode** - Detailed execution information when needed
- **Error Catalog** - Predefined errors with consistent formatting and documentation links

## Quick Start

```typescript
import { ErrorFormatter, ERROR_CODES } from '@kodebase/git-ops/error-handling';

// Basic usage
const formatter = new ErrorFormatter();
const error = formatter.format('ARTIFACT_NOT_FOUND', { artifactId: 'A.1.5' });
console.log(error.message);

// With debug mode
const debugFormatter = new ErrorFormatter({ debug: true });
const debugError = debugFormatter.format('GIT_OPERATION_FAILED', {
  operation: 'push',
  details: 'Permission denied'
});
```

## Error Categories

### User Errors (`user_error`)
Issues that require user action:
- Invalid artifact IDs
- Missing configuration
- Incorrect file paths
- Authentication problems

### System Failures (`system_failure`)
Internal system problems:
- File corruption
- Git repository issues
- Permission problems
- Dependency conflicts

### External Dependencies (`external_dependency`)
External service problems:
- GitHub API failures
- Network connectivity issues
- Service timeouts
- Rate limiting

## Severity Levels

- **`critical`** 🔴 - Blocks operation completely, immediate action required
- **`error`** 🟠 - Operation failed but may be recoverable
- **`warning`** 🟡 - Potential issues, operation continues with caution
- **`info`** 🔵 - Status information and helpful guidance

## Debug Mode

Enable detailed error information through multiple methods:

### Environment Variables
```bash
# Primary debug flags
export DEBUG=true
export KODEBASE_DEBUG=true

# Disable colors
export NO_COLOR=true
```

### Constructor Options
```typescript
const formatter = new ErrorFormatter({
  debug: true,
  colors: false  // Disable colors programmatically
});
```

### Command Line Arguments
Debug mode is automatically enabled when `--debug` is detected in process arguments.

## Error Catalog

The system includes a comprehensive error catalog with 20+ predefined error scenarios:

```typescript
import { ERROR_CODES } from '@kodebase/git-ops/error-handling';

// Available error codes
ERROR_CODES.ARTIFACT_NOT_FOUND
ERROR_CODES.INVALID_ARTIFACT_ID
ERROR_CODES.GIT_CONFIG_MISSING
ERROR_CODES.GITHUB_API_ERROR
ERROR_CODES.PERMISSION_DENIED
// ... and more
```

### Adding New Error Types

1. **Define the error in `error-catalog.ts`:**
```typescript
export const ERROR_CATALOG = {
  MY_NEW_ERROR: {
    code: 'MY_NEW_ERROR',
    severity: 'error' as const,
    category: 'user_error' as const,
    title: 'Custom Error Title',
    description: 'What went wrong in simple terms',
    suggestions: [
      'First thing to try',
      'Second option if first fails'
    ],
    documentationUrl: 'https://docs.kodebase.ai/troubleshooting/my-error'
  }
};
```

2. **Use in your code:**
```typescript
const error = formatter.format('MY_NEW_ERROR', { customParam: 'value' });
```

## Error Message Structure

Each error message includes:

```
🔴 [ERROR_CODE] Title
Description of what went wrong

💡 Suggestions:
• First suggested solution
• Alternative approach
• Additional help

📖 Help: https://docs.kodebase.ai/troubleshooting/error-code

🔧 Debug Information (when debug mode enabled):
• Detailed execution context
• Parameter values
• Stack trace information
```

## Integration with Hooks

All git hooks automatically use the centralized error system:

```typescript
import { formatHookError } from '@kodebase/git-ops/error-handling';

export class PreCommitHook {
  async run(context: PreCommitContext): Promise<HookResult> {
    try {
      // Hook logic here
      return { exitCode: 0, message: 'Success', continue: true };
    } catch (error) {
      return formatHookError(error, context);
    }
  }
}
```

## Testing Error Scenarios

The system includes comprehensive test utilities:

```typescript
import { createMockErrorFormatter } from '@kodebase/git-ops/error-handling/test';

describe('Error handling', () => {
  it('should format errors correctly', () => {
    const formatter = createMockErrorFormatter({ debug: true });
    const error = formatter.format('TEST_ERROR', { param: 'value' });

    expect(error.severity).toBe('error');
    expect(error.category).toBe('user_error');
    expect(error.message).toContain('Test error message');
  });
});
```

## Environment Configuration

Configure error handling behavior through environment variables:

```bash
# Debug settings
KODEBASE_DEBUG=true          # Enable debug mode
DEBUG=true                   # Alternative debug flag

# Output formatting
NO_COLOR=true               # Disable colored output
KODEBASE_ERROR_FORMAT=json  # Output format (text|json|structured)

# Behavior settings
KODEBASE_ERROR_EXIT_ON_CRITICAL=true  # Exit process on critical errors
KODEBASE_ERROR_LOG_LEVEL=info         # Minimum log level to display
```

## Performance Considerations

The error handling system is optimized for performance:

- **Lazy Loading** - Error catalog loaded only when needed
- **String Templates** - Efficient message interpolation
- **Color Detection** - Automatic terminal capability detection
- **Debug Mode** - Additional processing only when enabled

## Migration from Previous Error Handling

**Before:**
```typescript
throw new Error('Artifact not found: A.1.5');
```

**After:**
```typescript
import { ErrorFormatter } from '@kodebase/git-ops/error-handling';

const formatter = new ErrorFormatter();
const error = formatter.format('ARTIFACT_NOT_FOUND', { artifactId: 'A.1.5' });
throw new Error(error.message);
```

## API Reference

### ErrorFormatter

Main class for formatting error messages.

#### Constructor
```typescript
new ErrorFormatter(options?: {
  debug?: boolean;
  colors?: boolean;
})
```

#### Methods

##### `format(errorCode, context?)`
Format an error message using the error catalog.

**Parameters:**
- `errorCode: string` - Error code from ERROR_CODES
- `context?: Record<string, any>` - Context for message interpolation

**Returns:** `FormattedError`

##### `isDebugMode()`
Check if debug mode is currently enabled.

**Returns:** `boolean`

### Error Types

#### `FormattedError`
```typescript
interface FormattedError {
  code: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  category: 'user_error' | 'system_failure' | 'external_dependency';
  message: string;
  continue: boolean;
}
```

#### `ErrorCatalogEntry`
```typescript
interface ErrorCatalogEntry {
  code: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  category: 'user_error' | 'system_failure' | 'external_dependency';
  title: string;
  description: string;
  suggestions: string[];
  documentationUrl?: string;
  continueOnError?: boolean;
}
```
