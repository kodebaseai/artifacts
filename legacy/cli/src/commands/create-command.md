# Create Command Documentation

The `kodebase create` command is used to create new artifacts (initiatives, milestones, or issues) within the Kodebase system.

## Overview

The create command automates the process of creating structured artifacts with proper metadata, events, and file organization. It intelligently determines the artifact type based on the parent ID and generates the appropriate file structure.

## Usage

```bash
kodebase create [parent_id] <idea>
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `parent_id` | string | No | The ID of the parent artifact. Omit to create an initiative |
| `idea` | string | Yes | Description of what you want to build or accomplish |

### Artifact Type Detection

The command automatically determines what type of artifact to create based on the parent ID:

| Parent ID | Artifact Type | Example |
|-----------|---------------|---------|
| None | Initiative | `kodebase create "Build user authentication"` |
| A, B, C, etc. | Milestone | `kodebase create A "API development milestone"` |
| A.1, B.2, etc. | Issue | `kodebase create A.1 "Implement login endpoint"` |

## How It Works

### 1. Input Validation

The command validates:
- **Idea Description**: Must be provided and non-empty
- **Parent ID Format**: If provided, must follow Kodebase ID conventions
- **Parent Existence**: Parent artifact must exist and not be completed
- **Git Configuration**: User name and email must be configured

### 2. ID Generation

- **Initiatives**: Get next letter (A, B, C...)
- **Milestones**: Get next number under parent (A.1, A.2, A.3...)
- **Issues**: Get next number under milestone (A.1.1, A.1.2, A.1.3...)

### 3. File Creation

Creates properly structured YAML file with:
- Metadata section with title, priority, estimation
- Content section with summary and acceptance criteria
- Events array with initial draft event
- Proper schema validation

### 4. Directory Structure

Follows the milestone-oriented folder structure:
```
.kodebase/artifacts/
├── A.initiative-name/
│   ├── A.yml
│   ├── A.1.milestone-name/
│   │   ├── A.1.yml
│   │   ├── A.1.1.issue-name.yml
│   │   └── A.1.2.issue-name.yml
│   └── A.2.milestone-name/
└── B.initiative-name/
```

## Examples

### Create Initiative

```bash
kodebase create "Build user authentication system"
```

Output:
```
✓ Created initiative successfully
Created file: .kodebase/artifacts/A.build-user-authentication-system/A.yml
ID: A
Type: initiative
```

### Create Milestone

```bash
kodebase create A "API development milestone"
```

Output:
```
✓ Created milestone successfully
Created file: .kodebase/artifacts/A.build-user-authentication-system/A.1.api-development-milestone/A.1.yml
ID: A.1
Type: milestone
```

### Create Issue

```bash
kodebase create A.1 "Implement login endpoint"
```

Output:
```
✓ Created issue successfully
Created file: .kodebase/artifacts/A.build-user-authentication-system/A.1.api-development-milestone/A.1.1.implement-login-endpoint.yml
ID: A.1.1
Type: issue
```

### With Quotes for Multi-word Ideas

```bash
kodebase create A.1 "Fix validation error handling in user registration"
```

## Error Scenarios

### Missing Idea Description

```bash
kodebase create A.1
```

Output:
```
✗ Failed to create artifact
Idea description is required

Suggestions:
• Provide an idea description: kodebase create A.1 "Your idea here"
• Get help: kodebase create --help
```

### Invalid Parent ID Format

```bash
kodebase create A.1.2.3 "Too many levels"
```

Output:
```
✗ Failed to create artifact
Invalid parent ID format: A.1.2.3
Maximum depth is 2 levels (e.g., A.1 for milestones)
```

### Parent Artifact Not Found

```bash
kodebase create X.9 "Non-existent parent"
```

Output:
```
✗ Failed to create artifact
Parent artifact X.9 not found
Use 'kodebase list' to see available artifacts
```

### Git Configuration Missing

```bash
kodebase create "Test idea"
```

Output:
```
✗ Failed to create artifact
Failed to get git user info: Git not configured
Please configure git with: git config --global user.name "Your Name"
```

### Parent Artifact Completed

```bash
kodebase create A "Cannot add to completed initiative"
```

Output:
```
✗ Failed to create artifact
Cannot create child artifacts under completed parent A
```

## Generated Artifact Structure

### Initiative Example

```yaml
metadata:
  title: Build user authentication system
  priority: medium
  estimation: L
  created_by: John Doe (john@example.com)
  assignee: John Doe (john@example.com)
  schema_version: 0.2.0
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event: draft
      timestamp: 2025-07-19T18:30:00Z
      actor: John Doe (john@example.com)
      trigger: artifact_created

content:
  vision: Build user authentication system
  scope: Complete authentication infrastructure including login, registration, and session management
  success_criteria:
    - Users can register with email and password
    - Users can login and logout securely
    - Session management prevents unauthorized access
    - Password reset functionality works correctly
```

### Issue Example

```yaml
metadata:
  title: Implement login endpoint
  priority: medium
  estimation: M
  created_by: John Doe (john@example.com)
  assignee: John Doe (john@example.com)
  schema_version: 0.2.0
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event: draft
      timestamp: 2025-07-19T18:30:00Z
      actor: John Doe (john@example.com)
      trigger: artifact_created

content:
  summary: Implement login endpoint
  acceptance_criteria:
    - POST /api/auth/login endpoint accepts email and password
    - Returns JWT token on successful authentication
    - Returns 401 error for invalid credentials
    - Validates input format and sanitizes data
    - Logs authentication attempts for security
```

## Implementation Details

### Component Structure

```typescript
interface CreateCommandProps {
  parentId?: string;
  idea: string;
  verbose?: boolean;
}

export const Create: FC<CreateCommandProps> = ({ parentId, idea }) => {
  // Auto-detects artifact type and delegates to createArtifact utility
}
```

### Key Dependencies

- `createArtifact` utility function for artifact generation
- Git configuration for user identity
- Filesystem operations for file creation
- Schema validation for proper structure

### Validation Logic

1. **Input Validation**: Checks idea description and parent ID format
2. **Parent Validation**: Ensures parent exists and is not completed
3. **ID Generation**: Finds next available ID in sequence
4. **Git User Info**: Gets user name and email from git config
5. **File Creation**: Creates YAML file with proper structure

### Error Handling

The command provides user-friendly error messages for:
- Missing or invalid input
- Git configuration issues
- Filesystem permissions
- Parent artifact problems
- Schema validation failures

## Integration with Kodebase System

### Schema Compliance

All created artifacts follow the official Kodebase schemas:
- `InitiativeSchema` for strategic initiatives
- `MilestoneSchema` for major deliverables
- `IssueSchema` for atomic work units

### Event System

Each artifact starts with a proper draft event containing:
- Event type (draft) as the first field
- Timestamp in ISO 8601 format
- Actor from git configuration
- Trigger indicating what caused the event (artifact_created)
- Optional metadata for additional context

### File Organization

Follows the milestone-oriented structure for:
- Easy context loading for AI agents
- Natural work boundaries
- Efficient artifact discovery
- Simple archival processes

## Testing

The create command has comprehensive test coverage with 9 test cases:

### Test Categories

1. **Successful Creation**
   - Initiative creation (no parent)
   - Milestone creation (initiative parent)
   - Issue creation (milestone parent)
   - ID generation logic

2. **Error Handling**
   - Git configuration errors
   - Invalid parent ID formats
   - Artifact creation failures
   - Unknown errors

3. **Loading States**
   - Initial loading display
   - Async operation handling

### Running Tests

```bash
# Run Create command tests
cd packages/cli
pnpm test Create.test.tsx

# Run with coverage
pnpm test Create.test.tsx --coverage
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Git not configured" | Missing user.name or user.email | Configure git globally or locally |
| "Invalid parent ID" | Wrong ID format | Use proper format: A, A.1, B.2, etc. |
| "Parent not found" | Parent artifact doesn't exist | Check available artifacts with `kodebase list` |
| "Permission denied" | Filesystem permissions | Check write permissions in project directory |

### Debug Steps

1. **Check Git Configuration**:
   ```bash
   git config user.name
   git config user.email
   ```

2. **Verify Parent Exists**:
   ```bash
   kodebase list
   kodebase status A.1
   ```

3. **Check Directory Permissions**:
   ```bash
   ls -la .kodebase/artifacts/
   ```

4. **Use Verbose Output**:
   ```bash
   kodebase create A.1 "Test idea" --verbose
   ```

## Related Commands

- [`kodebase list`](list-command.md) - Find parent artifacts to create children under
- [`kodebase status`](status-command.md) - Check artifact details after creation
- [`kodebase start`](start-command.md) - Begin work on created artifacts

## Best Practices

### Naming Conventions

- **Clear and Descriptive**: Use specific, actionable descriptions
- **Consistent Terminology**: Follow project vocabulary and glossary
- **Appropriate Scope**: Match complexity to artifact type

### Good Examples
```bash
kodebase create "User authentication system"           # Initiative
kodebase create A "Login and registration API"         # Milestone  
kodebase create A.1 "Implement password hashing"       # Issue
```

### Avoid
```bash
kodebase create "Stuff"                    # Too vague
kodebase create A "Fix everything"         # Too broad for milestone
kodebase create A.1 "Build entire system" # Too large for issue
```

### Workflow Integration

1. **Strategic Planning**: Start with initiatives for high-level goals
2. **Milestone Breakdown**: Create milestones for major deliverables
3. **Issue Decomposition**: Break milestones into actionable issues
4. **Development Flow**: Use `kodebase start` to begin implementation

## Configuration

No additional configuration required. The command uses:
- Git configuration for user identity
- Current working directory for artifact placement
- Existing artifact structure for ID generation
- Built-in schemas for validation