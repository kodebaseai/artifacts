# @kodebase/core Documentation

Welcome to the comprehensive documentation for @kodebase/core - the foundational TypeScript package for the Kodebase methodology.

## Quick Links

### 📚 Core Documentation

- **[Getting Started](./getting-started.md)** - Quick introduction and basic usage
- **[API Reference](./api-reference.md)** - Complete API documentation for all exports
- **[Cookbook](./cookbook.md)** - Practical recipes for common operations
- **[Migration Guide](./migration-guide.md)** - Upgrade from manual YAML editing

### 🎯 Key Features

- **Type-Safe Artifacts** - Full TypeScript support for Initiatives, Milestones, and Issues
- **Runtime Validation** - Zod schemas ensure data integrity
- **Event System** - Immutable event log with identity tracking
- **State Helpers** - Simplified artifact-based transitions (addresses FP-010 friction point)
- **Cascade Automation** - Automatic state propagation saves 140+ minutes per cascade
- **Metrics & Analytics** - Built-in productivity calculations
- **Developer-Friendly** - Clear error messages and comprehensive documentation

## Overview

The @kodebase/core package provides:

1. **Types & Schemas** - TypeScript interfaces and Zod validation schemas
2. **Parser & Validator** - YAML parsing with automatic type detection
3. **Event Management** - Event creation, validation, and cascade tracking
4. **State Machine** - Lifecycle transition validation
5. **Metrics Engine** - Cycle time, lead time, velocity calculations
6. **Utilities** - Timestamp and actor formatting helpers

## Quick Start

```typescript
import { ArtifactParser, createEvent, formatActor } from '@kodebase/core';

// Parse existing YAML
const parser = new ArtifactParser();
const issue = parser.parseIssue(yamlContent);

// Add new event
issue.metadata.events.push(
  createEvent({
    event: 'ready',
    actor: formatActor('John Doe', 'john@example.com')
  })
);
```

## Architecture

```
@kodebase/core/
├── types/           # TypeScript interfaces
├── schemas/         # Zod validation schemas
├── parser/          # YAML parsing
├── validator/       # Type detection & validation
├── events/          # Event system & cascades
├── metrics/         # Analytics calculations
└── utils/           # Common utilities
```

## Documentation Structure

### For New Users
Start with **[Getting Started](./getting-started.md)** to understand basic concepts and usage patterns.

### For Migration
If you're currently editing YAML manually, see the **[Migration Guide](./migration-guide.md)** for a smooth transition.

### For Reference
The **[API Reference](./api-reference.md)** contains detailed documentation for every exported function, type, and class.

### For Examples
The **[Cookbook](./cookbook.md)** provides copy-paste solutions for common tasks like creating artifacts, managing state transitions, and calculating metrics.

## Core Concepts

### Artifact Hierarchy
- **Initiative** → Strategic goals (vision & scope)
- **Milestone** → Major deliverables
- **Issue** → Atomic work units

### Event-Driven State
- All state changes tracked via immutable events
- Each event has unique ID and correlation tracking
- Cascades propagate automatically

### Type Safety
- Full TypeScript support with strict typing
- Runtime validation with descriptive errors
- Auto-completion in IDEs

## Best Practices

1. **Always validate** after modifications
2. **Use helper functions** for consistency
3. **Preserve event immutability**
4. **Handle errors gracefully**
5. **Let automation handle mechanical tasks**

## Support

- **Issues**: Report bugs at [GitHub](https://github.com/kodebase-org/kodebase)
- **Examples**: Check test files for additional patterns
- **Types**: All exports include JSDoc comments

## Version

Current version: 0.1.0

Schema version: 0.2.0 (with event identity system)
