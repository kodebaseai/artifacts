# Schema Deprecation Notice

## Status: v1.0 Schemas Deprecated (as of 2025-07-10)

The v1.0 schemas (`*.schema.yml`) are now deprecated in favor of v2.0 schemas (`*.schema.v2.yml`).

### Timeline

- **2025-07-10**: v2.0 schemas released, v1.0 deprecated
- **2025-08-01**: CLI tools will start warning about v1.0 usage
- **2025-09-01**: v1.0 schemas moved to `deprecated/` folder
- **2025-10-01**: v1.0 support removed from new tools

### What You Should Do

1. **New artifacts**: Use v2.0 schemas and templates
2. **Existing artifacts**: Migrate when you next update them
3. **Automation**: Update any scripts to use v2.0 schemas

### Quick Migration

```bash
# Future CLI command (coming soon)
kodebase migrate --from v1 --to v2 path/to/artifact.yml

# Manual migration - see SCHEMA_MIGRATION_V2.md
```

### Key Differences

v2.0 schemas are:
- Simpler (fewer required fields)
- More flexible (optional sections can be omitted)
- Better documented (examples throughout)
- Backwards compatible (v1.0 files still work)

### Getting Help

- Migration guide: [SCHEMA_MIGRATION_V2.md](../../docs/SCHEMA_MIGRATION_V2.md)
- Changelog: [SCHEMA_CHANGELOG.md](../../docs/SCHEMA_CHANGELOG.md)
- Questions: Open an issue

### File Mapping

| v1.0 File | v2.0 File | Status |
|-----------|-----------|---------|
| artifact-metadata.schema.yml | artifact-metadata.schema.v2.yml | ⚠️ Deprecated |
| initiative.schema.yml | initiative.schema.v2.yml | ⚠️ Deprecated |
| milestone.schema.yml | milestone.schema.v2.yml | ⚠️ Deprecated |
| issue.schema.yml | issue.schema.v2.yml | ⚠️ Deprecated |
| templates/*.template.yml | templates/*.template.v2.yml | ⚠️ Deprecated |