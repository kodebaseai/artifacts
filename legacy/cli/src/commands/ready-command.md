# Kodebase Ready Command

The `kodebase ready` command transitions an artifact from `draft` to `ready` status, indicating it's fully specified and ready to begin work.

## Usage

```bash
kodebase ready <artifact-id> [--verbose]
```

### Arguments

- `artifact-id` - The ID of the artifact to mark as ready (e.g., `A.1.5`, `D.2.3`)

### Options

- `--verbose` - Show detailed error information and additional context

## What This Command Does

The ready command performs comprehensive validation before transitioning an artifact:

1. **Validates Artifact Existence** - Ensures the artifact file exists and can be loaded
2. **Status Validation** - Confirms the artifact is currently in `draft` status
3. **Dependency Check** - Verifies no blocking dependencies (`blocked_by` relationships)
4. **Field Validation** - Ensures all required fields are present and complete
5. **Interactive Confirmation** - Shows a summary and asks for user confirmation
6. **Status Update** - Adds a `ready` event and saves the updated artifact

## Validation Rules

### Status Requirements
- Artifact must be in `draft` status
- Cannot transition artifacts that are already `ready`, `in_progress`, `completed`, etc.

### Dependency Requirements
- The `blocked_by` array must be empty or undefined
- All blocking dependencies must be resolved before marking as ready

### Field Requirements
- `title` - Must be present and non-empty
- `acceptance_criteria` - Required for issues (artifacts with 3-part IDs)
- Other type-specific required fields based on artifact schema

## Examples

### Mark Issue as Ready
```bash
$ kodebase ready D.2.3
Validating D.2.3...

Ready to mark artifact as ready?

Artifact: D.2.3
Title: Implement kodebase ready command
Current status: draft

This will:
• Change status from 'draft' to 'ready'
• Add a ready event to the artifact
• Save the updated artifact file

Press Y to continue, N to cancel: y

✓ Artifact D.2.3 marked as ready

Next steps:
1. Start work: kodebase start D.2.3
2. Or assign to someone: Update assignee in artifact file
```

### Handle Blocking Dependencies
```bash
$ kodebase ready A.1.5
Validating A.1.5...

✗ Failed to mark A.1.5 as ready
Artifact A.1.5 has blocking dependencies: A.1.1, A.1.2. Resolve these blockers before marking as ready.
```

### Handle Missing Fields
```bash
$ kodebase ready B.2.1
Validating B.2.1...

✗ Failed to mark B.2.1 as ready
Artifact B.2.1 is missing required fields: acceptance_criteria. Complete these fields before marking as ready.
```

### Handle Wrong Status
```bash
$ kodebase ready C.1.3
Validating C.1.3...

✗ Failed to mark C.1.3 as ready
Artifact C.1.3 is not in draft status. Current status: in_progress. Only artifacts with status "draft" can be marked as ready.
```

## Technical Details

### Event Generation
When an artifact is successfully marked as ready, the command:

1. Gets git actor information from `git config user.name` and `git config user.email`
2. Creates an ISO timestamp for the event
3. Sets the event type to `ready` as the first field
4. Sets the trigger to `manual` to indicate user-initiated action
5. Optionally includes metadata for additional context

### File Operations
- Reads artifact YAML files using the `ArtifactLoader` utility
- Validates artifacts against their respective schemas (Initiative, Milestone, Issue)
- Saves updated artifacts back to the filesystem with proper formatting
- Preserves existing file structure and organization

### Error Handling
The command provides detailed error messages for common failure scenarios:
- Artifact not found
- Invalid artifact ID format
- Status validation failures
- Dependency blocking issues
- Missing required fields
- File system errors

## Integration with Workflow

The ready command fits into the standard Kodebase workflow:

1. **Create** - Generate new draft artifacts with `kodebase create`
2. **Ready** - Validate and mark complete artifacts as ready ← **This command**
3. **Start** - Begin work by creating feature branches with `kodebase start`
4. **Complete** - Finish work and merge changes

## Related Commands

- [`kodebase create`](./create-command.md) - Create new draft artifacts
- [`kodebase start`](./start-command.md) - Begin work on ready artifacts
- [`kodebase status`](./status-command.md) - View artifact status and timeline
- [`kodebase list`](./list-command.md) - List artifacts with filtering options

## Help

For additional help and examples:

```bash
kodebase ready --help
```