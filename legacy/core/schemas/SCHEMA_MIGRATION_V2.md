# Schema Migration Guide: v1.0 to v2.0

This guide helps you migrate existing artifacts from schema v1.0 to v2.0. The changes prioritize developer experience while maintaining backwards compatibility.

## Overview of Changes

### 🎯 Philosophy Shift
- **v1.0**: Process-focused, comprehensive tracking
- **v2.0**: Value-focused, minimal friction

### ✅ What's Preserved (No Action Needed)
- Core structure (metadata/content split)
- Required fields that provide value
- Event state machine
- Artifact ID patterns
- Git integration patterns

### 🚮 What's Removed (Fields You Can Delete)
- `event_id` - Unnecessary complexity for manual workflow
- `correlation_id` - Will be auto-generated when CLI implements cascades  
- `parent_event_id` - Rarely used, adds confusion
- `commit_hash` - Git already tracks this
- `technical_approach` - Deprecated in favor of `completion_analysis.implementation_approach`
- `issue_breakdown_rationale` - Never used in practice

### 🎉 What's Improved
- Relationships now optional with empty defaults
- Completion sections optional (only fill if valuable)
- Better examples throughout
- Clearer field descriptions
- Simplified validation patterns

## Migration Steps

### 1. Update Schema Version

In all artifacts, change:
```yaml
schema_version: 0.1.0
```

To:
```yaml
schema_version: 2.0.0
```

### 2. Clean Up Event Fields

Remove these fields from all events:
```yaml
events:
  - event_id: evt_abc123...      # DELETE THIS
    correlation_id: corr_xyz...   # DELETE THIS  
    parent_event_id: evt_parent... # DELETE THIS
    commit_hash: a1b2c3d4...      # DELETE THIS
    timestamp: 2025-01-01T00:00:00Z
    event: ready
    actor: Jane Doe (jane@example.com)
```

Becomes:
```yaml
events:
  - timestamp: 2025-01-01T00:00:00Z
    event: ready
    actor: Jane Doe (jane@example.com)
```

### 3. Update Relationships (If Empty)

If your relationships are empty, you can now omit them entirely or use the cleaner format:

Before:
```yaml
relationships:
  blocks: []
  blocked_by: []
```

After (option 1 - omit entirely):
```yaml
# relationships section removed if empty
```

After (option 2 - keep for clarity):
```yaml
relationships:
  blocks: []
  blocked_by: []
```

### 4. Issue-Specific Updates

For issues, the `technical_approach` field is deprecated:

Before:
```yaml
technical_approach: "Using factory pattern with dependency injection..."
```

After:
```yaml
completion_analysis:
  implementation_approach: "Using factory pattern with dependency injection..."
```

### 5. Make Optional Sections Actually Optional

You can now DELETE these sections if they're empty:
- `development_process` (issues)
- `completion_analysis` (issues) 
- `completion_summary` (milestones/initiatives)
- `notes` (all artifact types)
- `review_details` (issues)

## Validation

### Manual Validation
1. Check that required fields are present
2. Ensure schema_version is "2.0.0"
3. Verify no deprecated fields remain
4. Confirm event states follow valid transitions

### Automated Validation (Coming Soon)
```bash
# Future CLI command
kodebase migrate --from v1 --to v2 .kodebase/artifacts/

# Validate migrated files
kodebase validate --schema-version 2.0.0
```

## Backwards Compatibility

### Reading v1.0 Artifacts
- v2.0 tools will ignore extra fields from v1.0
- All v1.0 required fields still exist in v2.0
- State machine remains unchanged

### Gradual Migration
- You don't need to migrate all artifacts at once
- v1.0 and v2.0 artifacts can coexist
- New artifacts should use v2.0
- Migrate old artifacts when you update them

## Quick Reference: Field Mapping

| v1.0 Field | v2.0 Status | Action |
|------------|-------------|---------|
| `metadata.*` | ✅ Kept | No change |
| `content.*` | ✅ Kept | No change |
| `event.event_id` | ❌ Removed | Delete |
| `event.correlation_id` | ❌ Removed | Delete |
| `event.parent_event_id` | ❌ Removed | Delete |
| `event.commit_hash` | ❌ Removed | Delete |
| `technical_approach` | ⚠️ Deprecated | Move to `completion_analysis.implementation_approach` |
| `issue_breakdown_rationale` | ❌ Removed | Delete |
| Empty optional sections | 🎉 Optional | Delete if empty |

## Example Migration

### Before (v1.0):
```yaml
metadata:
  title: Implement User Authentication
  priority: high
  estimation: M
  created_by: Jane Doe (jane@example.com)
  assignee: Jane Doe (jane@example.com)
  schema_version: 0.1.0
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event_id: evt_1234567890abcdef
      timestamp: 2025-01-01T00:00:00Z
      event: in_progress
      actor: Jane Doe (jane@example.com)
      correlation_id: corr_abc123
      commit_hash: a1b2c3d4e5f6

content:
  summary: Add user authentication
  acceptance_criteria:
    - Login form works
    - Sessions persist

technical_approach: "Using JWT tokens"

development_process:

completion_analysis:

notes:
```

### After (v2.0):
```yaml
metadata:
  title: Implement User Authentication
  priority: high
  estimation: M
  created_by: Jane Doe (jane@example.com)
  assignee: Jane Doe (jane@example.com)
  schema_version: 2.0.0
  events:
    - timestamp: 2025-01-01T00:00:00Z
      event: in_progress
      actor: Jane Doe (jane@example.com)

content:
  summary: Add user authentication
  acceptance_criteria:
    - Login form works
    - Sessions persist

# Moved technical_approach to completion_analysis (when filled)
# Removed empty optional sections
# Removed unused event fields
```

## Getting Help

- Check the new templates in `.kodebase/config/schemas/templates/*.v2.yml`
- Reference the schemas in `.kodebase/config/schemas/*.v2.yml`
- Ask in discussions if you hit any issues
- Report bugs in schema validation

## Rollback Procedures

If you need to rollback a migration:

### Manual Rollback
1. The migration script creates a `.v1.backup` file
2. To rollback: `mv artifact.yml.v1.backup artifact.yml`
3. Update any references to v2.0 features

### Rollback Checklist
- [ ] Restore backup file
- [ ] Re-add removed fields if needed (event_id, etc.)
- [ ] Change schema_version back to "0.1.0"
- [ ] Update any code expecting v2.0 structure

### Version Detection
The validation script can detect schema versions:
```bash
# Auto-detect version
node validate-schema.js artifact.yml

# Force specific version validation
node validate-schema.js --schema-version 1 artifact.yml
```

## Timeline

- **Now**: Start using v2.0 for new artifacts
- **Next Sprint**: Migrate active artifacts to v2.0
- **Future**: CLI tools will auto-migrate remaining v1.0 artifacts