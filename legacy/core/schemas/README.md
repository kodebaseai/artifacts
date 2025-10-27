# Kodebase Artifact Schemas

This directory contains the official schema definitions and templates for Kodebase artifacts.

## Directory Structure

```
schemas/
├── v1/                    # Legacy v1.0 schemas (deprecated)
│   ├── artifact-metadata.schema.yml
│   ├── initiative.schema.yml
│   ├── milestone.schema.yml
│   └── issue.schema.yml
├── v2/                    # Current v2.0 schemas (recommended)
│   ├── artifact-metadata.schema.yml
│   ├── initiative.schema.yml
│   ├── milestone.schema.yml
│   └── issue.schema.yml
├── templates/
│   ├── v1/               # Legacy templates
│   └── v2/               # Current templates
└── DEPRECATION_NOTICE.md  # Migration timeline
```

## Quick Start

For new artifacts, use the v2 schemas and templates:

```bash
# Copy a template for a new issue
cp packages/core/schemas/templates/v2/issue.template.yml .kodebase/artifacts/A.1.5.yml

# Edit and fill in the required fields
# Look for ## markers for required fields
```

## Schema Versions

### v2.0 (Current - Recommended)
- Simplified structure with fewer required fields
- Better developer experience with examples
- Backwards compatible with v1.0
- Located in `v2/` directory

### v1.0 (Legacy - Deprecated)
- Original comprehensive schema
- More required fields for complete tracking
- Located in `v1/` directory
- Will be phased out by 2025-10-01

## Key Differences in v2.0

1. **Fewer Required Fields**: Only essential fields are required
2. **Optional Relationships**: Can be omitted if empty
3. **Simplified Events**: No event_id, correlation_id, etc.
4. **Better Examples**: Throughout all schemas
5. **Cleaner Templates**: With inline help

## Migration

See [SCHEMA_MIGRATION_V2.md](../../.kodebase/docs/SCHEMA_MIGRATION_V2.md) for detailed migration instructions.

## Validation

Current scripts (TypeScript):
```bash
# Validate an artifact
pnpm tsx packages/core/schemas/scripts/validate-schema.ts path/to/artifact.yml

# Validate with specific version
pnpm tsx packages/core/schemas/scripts/validate-schema.ts --schema-version 2 path/to/artifact.yml

# Migrate from v1 to v2
pnpm tsx packages/core/schemas/scripts/migrate-v1-to-v2.ts path/to/artifact.yml

# Dry run migration
pnpm tsx packages/core/schemas/scripts/migrate-v1-to-v2.ts --dry-run path/to/artifact.yml
```

Future CLI commands:
```bash
# Validate against v2 schema
kodebase validate --schema-version 2 path/to/artifact.yml

# Auto-migrate from v1 to v2
kodebase migrate --to v2 path/to/artifact.yml
```

## TypeScript Integration

The schemas in this directory are used by the TypeScript definitions in `src/schemas/artifacts.ts`. Any changes to the YAML schemas should be reflected in the TypeScript types.

## Contributing

When updating schemas:
1. Update both YAML schema and TypeScript types
2. Add examples to help users
3. Document breaking changes
4. Provide migration path
5. Update templates to match