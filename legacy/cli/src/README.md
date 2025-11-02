# Kodebase CLI Documentation

Welcome to the Kodebase CLI documentation. This package provides command-line tools for managing Kodebase artifacts and workflows.

## Commands

### Core Commands

- **[start](start-command.md)** - Create feature branch and start work on an artifact
- **create** - Create new artifact (initiative, milestone, or issue)
- **status** - Show detailed artifact status and timeline  
- **list** - List artifacts with filtering and sorting

### Command Categories

#### Artifact Management
- `create` - Create new artifacts
- `status` - View artifact details
- `list` - Browse and filter artifacts

#### Workflow Commands
- `start` - Begin work on an artifact
- *(Future: `complete`, `review`, `block`)*

#### Utility Commands
- `--help` - Show help information
- `--version` - Show version number

## Architecture

### Component Structure

The CLI is built using React components with Ink for terminal rendering:

```
src/
├── commands/           # Command implementations
│   ├── Start.tsx      # Start command (documented)
│   ├── Create.tsx     # Create command
│   ├── Status.tsx     # Status command
│   └── List.tsx       # List command
├── components/        # Shared components
│   ├── App.tsx        # Main app router
│   ├── ErrorHandler.tsx
│   └── ...
├── integrations/      # External integrations
│   └── git-ops.ts     # Git operations integration
└── utils/             # Utility functions
    ├── artifact-loader.ts
    └── artifact-creator.ts
```

### Key Dependencies

- **@kodebase/core** - Artifact schemas and validation
- **@kodebase/git-ops** - Git operations and branch management
- **ink** - React-based terminal UI framework
- **simple-git** - Git repository operations
- **zod** - Runtime type validation

## Development

### Getting Started

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build the package
pnpm build

# Run locally
pnpm dev
```

### Testing

Each command has comprehensive test coverage:

```bash
# Run all CLI tests
pnpm test

# Run specific command tests
pnpm test Start.test.tsx
pnpm test Create.test.tsx
```

### Code Quality

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm check-types
```

## Integration with Kodebase Ecosystem

### Core Package Integration

- Uses schemas from `@kodebase/core` for artifact validation
- Leverages automation utilities for event management
- Follows established patterns for artifact manipulation

### Git-Ops Integration

- BranchCreator for validated branch operations
- Post-checkout hooks for automatic status transitions
- Error handling wrappers for consistent user experience

### Workflow Integration

The CLI integrates with the broader Kodebase methodology:

1. **Artifact Lifecycle** - Commands respect artifact state transitions
2. **Event System** - All actions generate proper audit events
3. **Git Workflow** - Branch naming and commit patterns are enforced
4. **Quality Gates** - Built-in validation prevents invalid operations

## Error Handling

### Design Principles

- **Fail Fast** - Validate early and provide clear feedback
- **User-Friendly** - Convert technical errors to actionable messages
- **Verbose Mode** - Detailed error information available when needed
- **Graceful Degradation** - No partial state left on failures

### Error Categories

1. **Validation Errors** - Invalid input or preconditions
2. **Git Errors** - Repository or branch operation failures  
3. **Filesystem Errors** - Artifact loading or creation issues
4. **Integration Errors** - Git-ops or core package failures

## Contributing

### Adding New Commands

1. Create command component in `src/commands/`
2. Add routing logic to `App.tsx`
3. Include comprehensive tests
4. Update help documentation
5. Add command documentation to this directory

### Documentation Standards

- Each command should have detailed documentation
- Include usage examples and error scenarios
- Document integration points and dependencies
- Provide troubleshooting guidance

### Testing Requirements

- Unit tests for all command logic
- Integration tests for git-ops interactions
- Error handling test coverage
- Loading state and edge case tests

## Support

For issues, questions, or contributions:

- **Issues**: Create GitHub issue with detailed reproduction steps
- **Discussions**: Use GitHub Discussions for questions
- **Contributing**: See [CONTRIBUTING.md](../../../CONTRIBUTING.md)

## Related Documentation

- [Kodebase Core](../../core/docs/README.md) - Artifact schemas and automation
- [Git-Ops](../../git-ops/README.md) - Git integration and branch management
- [Kodebase Methodology](../../../AGENTIC_KODEBASE_METHODOLOGY.mdc) - Overall workflow
- [Constitution](../../../AGENTIC_CONSTITUTION.mdc) - Development principles