# Status Command Documentation

The `kodebase status` command displays detailed information about a specific artifact, including its metadata, timeline, and relationships.

## Overview

The status command provides a comprehensive view of any artifact in the system. It shows the current state, event history, dependencies, and metadata in either a formatted human-readable display or machine-readable JSON format.

## Usage

```bash
kodebase status <artifact-id> [--json]
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `artifact-id` | string | Yes | The ID of the artifact to display (e.g., A.1.5, D.2, C) |

### Options

| Option | Description |
|--------|-------------|
| `--json` | Output status information in JSON format for scripting |
| `--verbose` | Show detailed error information and stack traces |
| `--help`, `-h` | Show command help |

## How It Works

### 1. Artifact Loading

The command:
- Locates the artifact file using the Kodebase directory structure
- Loads and parses the YAML content
- Validates the artifact against schemas
- Extracts metadata, events, and relationships

### 2. Status Analysis

Determines current state by:
- Examining the events timeline
- Finding the most recent status event
- Calculating derived information (duration, progress)
- Identifying blocking dependencies

### 3. Display Formatting

Provides two output modes:
- **Formatted**: Human-readable display with colors and structure
- **JSON**: Machine-readable format for scripts and integrations

## Examples

### Basic Status Display

```bash
kodebase status D.2.2
```

Output:
```
D.2.2: Implement kodebase start command

Status: ✓ completed                  Priority: critical
Assignee: Miguel Carvalho           Estimation: S
Created: 2025-07-19T14:31:00Z

Events Timeline:
├─ 2025-07-19T14:31:00Z  📝 draft      (Claude)
├─ 2025-07-19T15:45:00Z  🚫 blocked    (Miguel Carvalho)
├─ 2025-07-19T16:46:27Z  ✅ ready      (Github Actions)
├─ 2025-07-19T16:48:23Z  🔄 in_progress (Miguel Carvalho)
├─ 2025-07-19T17:09:31Z  👀 in_review  (Miguel Carvalho)
└─ 2025-07-19T17:23:45Z  ✓ completed  (Github Actions)

Dependencies:
🚫 Blocked by: D.2.1

Summary:
Implement the 'kodebase start <artifact-id>' command that creates a feature
branch for an artifact and transitions it to in_progress status.
```

### JSON Output

```bash
kodebase status D.2.2 --json
```

Output:
```json
{
  "artifactId": "D.2.2",
  "metadata": {
    "title": "Implement kodebase start command",
    "priority": "critical",
    "estimation": "S",
    "created_by": "Miguel Carvalho (m@kodebase.ai)",
    "assignee": "Miguel Carvalho (m@kodebase.ai)",
    "schema_version": "0.2.0",
    "relationships": {
      "blocks": [],
      "blocked_by": ["D.2.1"]
    },
    "events": [
      {
        "event": "draft",
        "timestamp": "2025-07-19T14:31:00Z",
        "actor": "Claude (noreply@anthropic.com)",
        "trigger": "artifact_created"
      }
      // ... more events
    ]
  },
  "content": {
    "summary": "Implement the 'kodebase start <artifact-id>' command...",
    "acceptance_criteria": [
      "Command accepts artifact ID as argument",
      "Validates artifact exists and is in 'ready' status",
      // ... more criteria
    ]
  },
  "currentStatus": "completed",
  "duration": "8h 52m",
  "lastUpdated": "2025-07-19T17:23:45Z"
}
```

### Initiative Status

```bash
kodebase status A
```

Output:
```
A: Build User Authentication System

Status: 🔄 in_progress               Priority: high
Assignee: John Doe                  Estimation: XL
Created: 2025-07-15T09:00:00Z

Events Timeline:
├─ 2025-07-15T09:00:00Z  📝 draft      (John Doe)
├─ 2025-07-15T10:30:00Z  ✅ ready      (John Doe)
└─ 2025-07-15T11:00:00Z  🔄 in_progress (John Doe)

Dependencies:
None

Vision:
Build comprehensive user authentication system with secure login,
registration, and session management capabilities.

Success Criteria:
• Users can register with email and password validation
• Secure login with JWT token generation
• Session management with automatic expiration
• Password reset functionality via email
• Role-based access control system
```

### Milestone Status

```bash
kodebase status A.1
```

Output:
```
A.1: API Development Milestone

Status: ✅ ready                    Priority: high
Assignee: Sarah Smith              Estimation: L
Created: 2025-07-16T14:20:00Z

Events Timeline:
├─ 2025-07-16T14:20:00Z  📝 draft    (Sarah Smith)
└─ 2025-07-16T15:45:00Z  ✅ ready    (Sarah Smith)

Dependencies:
None

Deliverables:
• REST API endpoints for user authentication
• OpenAPI documentation and testing suite
• Rate limiting and security middleware
• Database schema and migration scripts

Validation Criteria:
• All endpoints return proper HTTP status codes
• API documentation is complete and accurate
• Security headers are properly configured
• Performance meets defined SLA requirements
```

## Error Scenarios

### Artifact Not Found

```bash
kodebase status X.9.9
```

Output:
```
✗ Failed to load artifact X.9.9
Artifact not found: X.9.9

Suggestions:
• Check artifact ID spelling
• Use 'kodebase list' to see available artifacts
• Ensure you're in the correct project directory
```

### Invalid Artifact ID Format

```bash
kodebase status "invalid-id"
```

Output:
```
✗ Failed to load artifact invalid-id
Invalid artifact ID format: invalid-id
Expected format: A, A.1, or A.1.5
```

### Missing Argument

```bash
kodebase status
```

Output:
```
✗ Artifact ID is required

Suggestions:
• Provide an artifact ID: kodebase status A.1.5
• List available artifacts: kodebase list
• Get help: kodebase status --help
```

### File System Error

```bash
kodebase status A.1.5
```

Output:
```
✗ Failed to load artifact A.1.5
Permission denied: Cannot read artifact file
Check file permissions in .kodebase/artifacts/
```

## Display Components

### Status Badge

Shows current status with appropriate icons and colors:
- 📝 `draft` - Gray
- ✅ `ready` - Green
- 🔄 `in_progress` - Blue
- 👀 `in_review` - Yellow
- ✓ `completed` - Green
- 🚫 `blocked` - Red
- ❌ `cancelled` - Red
- 📁 `archived` - Gray

### Event Timeline

Displays chronological event history with:
- Timestamp in local timezone
- Event type with descriptive icon
- Actor who triggered the event
- Event metadata (when relevant)

### Relationship List

Shows dependencies with clear indicators:
- 🚫 **Blocked by**: Dependencies that must complete first
- 🔓 **Blocks**: Artifacts waiting on this one
- Visual indicators for status of related artifacts

### Metadata Display

Presents key information:
- **Title**: Human-readable artifact name
- **Priority**: critical, high, medium, low
- **Estimation**: XS, S, M, L, XL
- **Assignee**: Person responsible for the work
- **Created Date**: When artifact was first created
- **Duration**: Time since creation or completion time

## JSON Output Format

The `--json` flag outputs structured data suitable for:
- Scripting and automation
- Integration with other tools
- Data analysis and reporting
- CI/CD pipeline integration

### JSON Schema

```typescript
interface StatusOutput {
  artifactId: string;
  metadata: ArtifactMetadata;
  content: ArtifactContent;
  currentStatus: string;
  duration?: string;
  lastUpdated: string;
  relationships?: {
    blocks: string[];
    blocked_by: string[];
  };
  analytics?: {
    cycleTime?: string;
    leadTime?: string;
    blockedTime?: string;
  };
}
```

## Implementation Details

### Component Structure

```typescript
interface StatusCommandProps {
  artifactId: string;
  format: 'formatted' | 'json';
  verbose?: boolean;
}

export const Status: FC<StatusCommandProps> = ({ 
  artifactId, 
  format 
}) => {
  // Loads artifact and renders appropriate format
}
```

### Key Dependencies

- `ArtifactLoader` - Filesystem access and artifact parsing
- `StatusBadge` - Visual status representation
- `EventTimeline` - Chronological event display
- `RelationshipList` - Dependency visualization
- `@kodebase/core` - Schema validation and types

### Error Handling

Provides specific error messages for:
- Invalid artifact IDs
- Missing artifact files
- Filesystem permission issues
- Schema validation failures
- Malformed YAML content

## Integration with Analytics

The status command can display analytical insights:

### Timing Metrics
- **Cycle Time**: Time from in_progress to completed
- **Lead Time**: Time from ready to completed
- **Blocked Time**: Total time spent in blocked status
- **Age**: Time since creation

### Progress Indicators
- **Completion Percentage**: For milestones with child issues
- **Velocity Trends**: Historical completion rates
- **Bottleneck Analysis**: Most common blocking points

## Testing

The status command has comprehensive test coverage with 5 test cases:

### Test Categories

1. **Successful Display**
   - Formatted output rendering
   - JSON output format
   - Different artifact types

2. **Error Handling**
   - Missing artifacts
   - Invalid IDs
   - Loading failures

3. **Component Integration**
   - StatusBadge rendering
   - EventTimeline display
   - RelationshipList functionality

### Running Tests

```bash
# Run Status command tests
cd packages/cli
pnpm test Status.test.tsx

# Run with coverage
pnpm test Status.test.tsx --coverage
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Artifact not found" | Wrong ID or missing file | Check ID spelling and project directory |
| "Permission denied" | File system permissions | Check read permissions on .kodebase/ |
| "Invalid format" | Malformed YAML | Validate artifact file syntax |
| "Schema validation error" | Outdated artifact structure | Update artifact to current schema |

### Debug Steps

1. **Verify Artifact Exists**:
   ```bash
   kodebase list | grep A.1.5
   ls .kodebase/artifacts/A.*/A.1.*/*.yml
   ```

2. **Check File Permissions**:
   ```bash
   ls -la .kodebase/artifacts/A.*/A.1.*/A.1.5.*.yml
   ```

3. **Validate YAML Syntax**:
   ```bash
   yamllint .kodebase/artifacts/A.*/A.1.*/A.1.5.*.yml
   ```

4. **Use JSON Output for Debugging**:
   ```bash
   kodebase status A.1.5 --json | jq '.'
   ```

## Related Commands

- [`kodebase list`](list-command.md) - Find artifacts to check status of
- [`kodebase create`](create-command.md) - Create artifacts to track
- [`kodebase start`](start-command.md) - Begin work on ready artifacts

## Scripting and Automation

### Common Use Cases

```bash
# Check if artifact is ready to start
status=$(kodebase status A.1.5 --json | jq -r '.currentStatus')
if [ "$status" = "ready" ]; then
  kodebase start A.1.5
fi

# Get blocked artifacts
kodebase status A.1.5 --json | jq -r '.relationships.blocked_by[]'

# Extract completion time
kodebase status A.1.5 --json | jq -r '.duration'

# Check assignee
kodebase status A.1.5 --json | jq -r '.metadata.assignee'
```

### Integration Examples

```bash
# CI/CD Pipeline Integration
if kodebase status $ARTIFACT_ID --json | jq -e '.currentStatus == "completed"' > /dev/null; then
  echo "Artifact completed, proceeding with deployment"
else
  echo "Artifact not ready for deployment"
  exit 1
fi

# Slack Notifications
status_info=$(kodebase status A.1.5 --json)
curl -X POST $SLACK_WEBHOOK -d "$(echo $status_info | jq '{text: .metadata.title, status: .currentStatus}')"
```

## Best Practices

### Status Monitoring

- **Regular Checks**: Monitor artifact status during development
- **Dependency Tracking**: Check blocking relationships frequently
- **Progress Updates**: Use status to communicate progress to team
- **Bottleneck Identification**: Look for frequently blocked artifacts

### JSON Usage

- **Scripting**: Use JSON output for automation and scripting
- **Integration**: Feed data into monitoring and reporting systems
- **Analysis**: Extract metrics for process improvement
- **Alerting**: Set up notifications based on status changes

## Configuration

No additional configuration required. The command uses:
- Current working directory for artifact discovery
- Built-in display components for formatting
- Established schema validation rules
- Default timezone for timestamp display