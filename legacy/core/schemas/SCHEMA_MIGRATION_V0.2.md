# Schema Migration Guide: v0.1.0 → v0.2.0

## Overview

This guide helps you migrate Kodebase artifacts from schema v0.1.0 to v0.2.0, which adds the event identity system for cascade automation.

## What's Changing

### Added Fields

All events now require identity fields:

```yaml
# Before (v0.1.0)
events:
  - timestamp: 2025-01-01T00:00:00Z
    event: draft
    actor: John Doe (john@example.com)

# After (v0.2.0)
events:
  - timestamp: 2025-01-01T00:00:00Z
    event: draft
    actor: John Doe (john@example.com)
    event_id: evt_59ea287597bea469      # New: required
    metadata:                           # New: optional container
      correlation_id: evt_59ea287597bea469   # Required when metadata present
      parent_event_id: null                  # Nullable
```

## Migration Options

### Option 1: Automated Migration (Recommended)

Use the provided migration script:

```bash
# Install dependencies if needed
cd packages/core
pnpm install

# Migrate a single file
pnpm tsx schemas/scripts/migrate-v0.1-to-v0.2.ts /path/to/artifact.yml

# Migrate all artifacts
pnpm tsx schemas/scripts/migrate-v0.1-to-v0.2.ts --all ../../.kodebase/artifacts

# Preview changes without modifying files
pnpm tsx schemas/scripts/migrate-v0.1-to-v0.2.ts --dry-run artifact.yml
```

The script will:
- Generate unique event_ids for all events
- Add correlation_id (same as event_id for root events)
- Set parent_event_id to null (since existing events aren't cascades)
- Create backup files (`.v0.1.backup.yml`)
- Update schema_version to "0.2.0"

### Option 2: Manual Migration

If you prefer to migrate manually:

1. **Update schema version**:
   ```yaml
   metadata:
     schema_version: "0.2.0"  # was "0.1.0"
   ```

2. **Add event identity to each event**:
   ```yaml
   events:
     - timestamp: 2025-01-01T00:00:00Z
       event: draft
       actor: John Doe (john@example.com)
       event_id: evt_[generate_16_hex_chars]
       metadata:
         correlation_id: evt_[same_as_event_id_for_first_event]
         parent_event_id: null
   ```

3. **For multiple events in the same artifact**:
   - First event: correlation_id = event_id
   - Subsequent events: correlation_id = first event's event_id
   - All parent_event_id = null (they're not cascade events)

## Event ID Format

Event IDs follow the pattern: `evt_[16 hexadecimal characters]`

Examples:
- `evt_59ea287597bea469`
- `evt_1234567890abcdef`
- `evt_fedcba0987654321`

## Verification

After migration, verify your artifacts:

```bash
# Validate against new schema
pnpm tsx schemas/scripts/validate-schema.ts migrated-artifact.yml

# Or use the parser
pnpm test -- --run parser
```

## Common Issues

### Missing event_id
```
Error: events[0].event_id: Required
```
**Solution**: Ensure all events have an event_id field.

### Missing correlation_id
```
Error: events[0].metadata.correlation_id: Correlation ID is required
```
**Solution**: When metadata exists, correlation_id is required.

### Invalid event_id format
```
Error: Invalid event ID format
```
**Solution**: Use the format `evt_[16 hex chars]`.

## Rollback

If you need to rollback:
1. Restore from `.v0.1.backup.yml` files
2. Or manually remove the added fields and change schema_version back to "0.1.0"

## Future Considerations

These identity fields enable:
- Cascade automation (B.3 milestone)
- Event deduplication
- Complete audit trails
- Time savings of ~140 minutes per cascade operation

While they add complexity to the YAML, the EventBuilder in code ensures they're automatically populated correctly.

## Questions?

The migration preserves all existing data while adding the required identity fields. No information is lost, and the artifacts remain human-readable.