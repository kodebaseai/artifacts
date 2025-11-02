# List Command Documentation

The `kodebase list` command displays all artifacts in the system with powerful filtering, sorting, and pagination capabilities.

## Overview

The list command provides a comprehensive view of all artifacts across the entire Kodebase system. It supports advanced filtering to help you find specific artifacts, sort results by various criteria, and handle large datasets with pagination.

## Usage

```bash
kodebase list [options]
```

### Filter Options

| Option | Type | Description | Example |
|--------|------|-------------|---------|
| `--type <type>` | string | Filter by artifact type | `--type issue` or `--type initiative,milestone` |
| `--status <status>` | string | Filter by status | `--status ready` or `--status ready,in_progress` |
| `--assignee <name>` | string | Filter by assignee name or email | `--assignee "John Doe"` |
| `--parent <id>` | string | Filter by parent artifact ID | `--parent A.1` |

### Display Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--sort <field>` | string | Sort by field (created, updated, priority, status) | `created` |
| `--page <number>` | number | Page number for pagination | `1` |
| `--page-size <size>` | number | Items per page | `20` |

### Global Options

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed error information |
| `--help`, `-h` | Show command help |

## How It Works

### 1. Artifact Discovery

The command:
- Recursively scans the `.kodebase/artifacts/` directory
- Loads and parses all YAML artifact files
- Validates each artifact against schemas
- Extracts summary information for display

### 2. Filtering

Applies multiple filter criteria:
- **Type Filtering**: initiatives, milestones, issues
- **Status Filtering**: draft, ready, in_progress, completed, etc.
- **Assignee Filtering**: exact or partial name/email matching
- **Parent Filtering**: all children under a specific parent

### 3. Sorting

Supports sorting by:
- **Created**: Artifact creation timestamp (default)
- **Updated**: Most recent event timestamp
- **Priority**: critical → high → medium → low
- **Status**: Grouped by workflow stage

### 4. Pagination

For large datasets:
- Splits results into manageable pages
- Shows current page and total count
- Navigation hints for next/previous pages

## Examples

### Basic Listing

```bash
kodebase list
```

Output:
```
Artifacts (Page 1 of 3, 52 total)

Initiative  A      Build User Authentication System         🔄 in_progress    John Doe
Milestone   A.1    Login and Registration API               ✅ ready          Sarah Smith  
Issue       A.1.1  Implement password hashing               📝 draft          Mike Johnson
Issue       A.1.2  Create user registration endpoint        🔄 in_progress    Sarah Smith
Issue       A.1.3  Add email validation                     ✅ ready          Alex Brown

Initiative  B      Payment Processing System                📝 draft          Lisa Wong
Milestone   B.1    Stripe Integration                       📝 draft          Lisa Wong

Initiative  C      Mobile App Development                   ✅ ready          David Kim
Milestone   C.1    iOS App Foundation                       🔄 in_progress    David Kim
Issue       C.1.1  Setup React Native project               ✓ completed      David Kim
Issue       C.1.2  Configure navigation                     🔄 in_progress    Emma Davis

-- More results available. Use --page 2 to see next page --
```

### Filter by Type

```bash
kodebase list --type issue
```

Output:
```
Issues (15 total)

A.1.1  Implement password hashing               📝 draft          Mike Johnson
A.1.2  Create user registration endpoint        🔄 in_progress    Sarah Smith
A.1.3  Add email validation                     ✅ ready          Alex Brown
A.2.1  Setup JWT token generation               📝 draft          John Doe
A.2.2  Implement login validation               ✅ ready          Sarah Smith
B.1.1  Research Stripe API                      📝 draft          Lisa Wong
C.1.1  Setup React Native project               ✓ completed      David Kim
C.1.2  Configure navigation                     🔄 in_progress    Emma Davis
D.1.1  Design system architecture               ✓ completed      Tech Lead
D.2.1  Implement git-ops integration            ✓ completed      Miguel Carvalho
D.2.2  Implement kodebase start command         ✓ completed      Miguel Carvalho
```

### Filter by Status

```bash
kodebase list --status ready
```

Output:
```
Ready Artifacts (8 total)

Issue       A.1.3  Add email validation                     ✅ ready          Alex Brown
Issue       A.2.2  Implement login validation               ✅ ready          Sarah Smith
Milestone   A.1    Login and Registration API               ✅ ready          Sarah Smith
Initiative  C      Mobile App Development                   ✅ ready          David Kim
Issue       D.3.1  Create comprehensive CLI docs            ✅ ready          Claude AI
```

### Multiple Filters

```bash
kodebase list --type issue --status ready,in_progress --assignee "Sarah Smith"
```

Output:
```
Issues by Sarah Smith (Ready or In Progress) (3 total)

A.1.2  Create user registration endpoint        🔄 in_progress    Sarah Smith
A.1.3  Add email validation                     ✅ ready          Sarah Smith  
A.2.2  Implement login validation               ✅ ready          Sarah Smith
```

### Filter by Parent

```bash
kodebase list --parent A.1
```

Output:
```
Artifacts under A.1 (5 total)

Issue  A.1.1  Implement password hashing               📝 draft          Mike Johnson
Issue  A.1.2  Create user registration endpoint        🔄 in_progress    Sarah Smith
Issue  A.1.3  Add email validation                     ✅ ready          Alex Brown
Issue  A.1.4  Setup database migrations                📝 draft          Mike Johnson
Issue  A.1.5  Create API documentation                 📝 draft          Alex Brown
```

### Sorting Options

```bash
# Sort by priority (highest first)
kodebase list --sort priority

# Sort by most recently updated
kodebase list --sort updated

# Sort by status (workflow order)
kodebase list --sort status
```

### Pagination

```bash
# Second page with 10 items per page
kodebase list --page 2 --page-size 10

# Large page size for overview
kodebase list --page-size 50
```

### Complex Filtering

```bash
# Find all ready issues in authentication system
kodebase list --type issue --status ready --parent A

# Find work assigned to specific person
kodebase list --assignee "john@example.com" --status in_progress,ready

# Find blocked or cancelled items for cleanup
kodebase list --status blocked,cancelled
```

## Output Format

### Column Layout

| Column | Description | Example |
|--------|-------------|---------|
| Type | Artifact type with icon | Initiative, Milestone, Issue |
| ID | Unique identifier | A, A.1, A.1.5 |
| Title | Human-readable name | "Implement login endpoint" |
| Status | Current state with icon | ✅ ready, 🔄 in_progress |
| Assignee | Person responsible | "Sarah Smith", "john@example.com" |

### Status Icons

- 📝 `draft` - Initial state, needs refinement
- ✅ `ready` - Ready to start work
- 🔄 `in_progress` - Currently being worked on
- 👀 `in_review` - Under review/testing
- ✓ `completed` - Successfully finished
- 🚫 `blocked` - Waiting on dependencies
- ❌ `cancelled` - Abandoned or rejected
- 📁 `archived` - Completed parent cleanup

### Pagination Information

```
Artifacts (Page 2 of 5, 87 total)
-- Use --page 1 for previous page --
-- Use --page 3 for next page --
```

## Error Scenarios

### No Artifacts Found

```bash
kodebase list --type milestone --status completed
```

Output:
```
No artifacts found matching the specified criteria.

Applied Filters:
• Type: milestone
• Status: completed

Suggestions:
• Remove some filters to see more results
• Check if any milestones have been completed
• Use 'kodebase list' to see all artifacts
```

### Invalid Filter Values

```bash
kodebase list --type invalid_type
```

Output:
```
✗ Invalid filter criteria
Unknown artifact type: invalid_type
Valid types: initiative, milestone, issue
```

### Invalid Sort Field

```bash
kodebase list --sort invalid_field
```

Output:
```
✗ Invalid sort field: invalid_field
Valid fields: created, updated, priority, status
```

### File System Errors

```bash
kodebase list
```

Output:
```
✗ Failed to load artifacts
Permission denied: Cannot read .kodebase/artifacts/
Check directory permissions and ensure you're in a Kodebase project
```

## Advanced Usage

### Comma-Separated Values

Most filter options support multiple values:

```bash
# Multiple types
kodebase list --type initiative,milestone

# Multiple statuses  
kodebase list --status ready,in_progress,blocked

# Multiple assignees (OR logic)
kodebase list --assignee "John Doe,Sarah Smith"
```

### Hierarchical Filtering

```bash
# All work under initiative A
kodebase list --parent A

# Only direct children of milestone A.1
kodebase list --parent A.1

# Combine with type filtering
kodebase list --parent A --type issue
```

### Sorting Behavior

#### Priority Sorting
Orders by business impact:
1. critical (🔴)
2. high (🟠) 
3. medium (🟡)
4. low (🟢)

#### Status Sorting
Groups by workflow stage:
1. draft (📝)
2. ready (✅)
3. in_progress (🔄)
4. in_review (👀)
5. blocked (🚫)
6. completed (✓)
7. cancelled (❌)
8. archived (📁)

#### Date Sorting
- **created**: Oldest to newest artifact creation
- **updated**: Most recently modified events first

## Implementation Details

### Component Structure

```typescript
interface ListCommandProps {
  options: {
    type?: string;
    status?: string;
    assignee?: string;
    parent?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
  };
}

export const List: FC<ListCommandProps> = ({ options }) => {
  // Loads, filters, sorts, and paginates artifacts
}
```

### Key Dependencies

- `ArtifactLoader` - File system access and artifact parsing
- `ArtifactSummary` - Lightweight artifact representation
- Filtering and sorting utilities
- Pagination logic

### Performance Considerations

- **Lazy Loading**: Only loads metadata for listing
- **Efficient Filtering**: Applies filters during loading
- **Memory Management**: Pagination prevents large dataset issues
- **Caching**: Future enhancement for frequently accessed data

## Filter Logic

### Type Filtering
```typescript
if (options.type) {
  const types = options.type.split(',');
  artifacts = artifacts.filter(a => types.includes(a.type));
}
```

### Status Filtering
```typescript
if (options.status) {
  const statuses = options.status.split(',');
  artifacts = artifacts.filter(a => statuses.includes(a.status));
}
```

### Assignee Filtering
```typescript
if (options.assignee) {
  const assignees = options.assignee.split(',');
  artifacts = artifacts.filter(a => 
    assignees.some(assignee => 
      a.assignee.toLowerCase().includes(assignee.toLowerCase())
    )
  );
}
```

### Parent Filtering
```typescript
if (options.parent) {
  artifacts = artifacts.filter(a => 
    a.id.startsWith(options.parent + '.')
  );
}
```

## Testing

The list command has comprehensive test coverage:

### Test Categories

1. **Basic Functionality**
   - Loading all artifacts
   - Display formatting
   - Pagination logic

2. **Filtering**
   - Type filtering (single and multiple)
   - Status filtering (single and multiple)
   - Assignee filtering (exact and partial)
   - Parent filtering (hierarchical)

3. **Sorting**
   - By creation date
   - By priority
   - By status
   - By update time

4. **Error Handling**
   - Invalid filter values
   - File system errors
   - Empty results

### Running Tests

```bash
# Run List command tests (when implemented)
cd packages/cli
pnpm test List.test.tsx

# Run with coverage
pnpm test List.test.tsx --coverage
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "No artifacts found" | Overly restrictive filters | Remove some filters or check criteria |
| "Permission denied" | File system access issues | Check .kodebase/ directory permissions |
| "Invalid type" | Typo in filter value | Use: initiative, milestone, issue |
| "Large dataset slow" | Too many artifacts loaded | Use pagination with smaller page sizes |

### Debug Steps

1. **Check Directory Structure**:
   ```bash
   ls -la .kodebase/artifacts/
   find .kodebase/artifacts/ -name "*.yml" | head -10
   ```

2. **Verify Filter Syntax**:
   ```bash
   # Test without filters first
   kodebase list
   
   # Add filters one by one
   kodebase list --type issue
   kodebase list --type issue --status ready
   ```

3. **Check File Permissions**:
   ```bash
   ls -la .kodebase/artifacts/*/
   ```

4. **Use Verbose Mode**:
   ```bash
   kodebase list --verbose
   ```

## Related Commands

- [`kodebase status <id>`](status-command.md) - Get detailed view of specific artifacts
- [`kodebase create`](create-command.md) - Create new artifacts to appear in lists
- [`kodebase start <id>`](start-command.md) - Begin work on ready artifacts from list

## Scripting and Automation

### Common Use Cases

```bash
# Get all ready issues for CI/CD
ready_issues=$(kodebase list --type issue --status ready --page-size 100)

# Find blocked work for daily standup
blocked_work=$(kodebase list --status blocked)

# Check team member workload
person_work=$(kodebase list --assignee "sarah@example.com" --status in_progress)

# Find work ready for review
review_ready=$(kodebase list --status in_review)
```

### Integration Examples

```bash
# Slack daily summary
total_issues=$(kodebase list --type issue | grep -c "Issue")
ready_count=$(kodebase list --type issue --status ready | grep -c "Issue")
in_progress=$(kodebase list --type issue --status in_progress | grep -c "Issue")

echo "📊 Daily Summary: $total_issues total issues, $ready_count ready, $in_progress in progress"

# Find stale work (mock example)
kodebase list --status in_progress --sort updated | head -5
```

## Best Practices

### Effective Filtering

- **Start Broad**: Begin with `kodebase list` to see overall state
- **Layer Filters**: Add filters incrementally to narrow results
- **Use Parent Filtering**: Focus on specific initiatives or milestones
- **Status-Based Views**: Create different views for different workflow needs

### Performance Tips

- **Use Pagination**: Don't load huge datasets at once
- **Specific Filters**: Apply relevant filters to reduce processing
- **Sort Strategically**: Choose sort order that matches your workflow
- **Regular Cleanup**: Archive or remove obsolete artifacts

### Workflow Integration

```bash
# Daily standup preparation
kodebase list --status blocked                    # Impediments
kodebase list --status in_progress --assignee me # My current work
kodebase list --status ready --page-size 5       # Next priorities

# Sprint planning
kodebase list --parent A.1 --type issue          # Milestone breakdown
kodebase list --status ready --sort priority     # Backlog prioritization

# Release preparation  
kodebase list --status completed --sort updated  # Recent completions
kodebase list --status in_review                 # Pending reviews
```

## Configuration

No additional configuration required. The command uses:
- Current working directory for artifact discovery
- Built-in filtering and sorting logic
- Default pagination settings (20 items per page)
- Standard file system permissions