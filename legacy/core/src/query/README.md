# Artifact Query System

A simple, chainable API for filtering and searching Kodebase artifacts.

## Usage

```typescript
import { ArtifactQuery, query } from '@kodebase/core';

// Create a query instance
const artifactQuery = new ArtifactQuery(artifacts);

// Or use the factory function
const q = query(artifacts);

// Filter by status
const readyArtifacts = q.byStatus('ready').execute();

// Filter by milestone
const milestoneIssues = q.inMilestone('A.3').execute();

// Filter by type
const allIssues = q.ofType('issue').execute();

// Chain multiple filters
const readyIssuesInMilestone = q
  .byStatus('ready')
  .inMilestone('A.3')
  .ofType('issue')
  .execute();
```

## API Reference

### `ArtifactQuery`

The main query builder class.

#### Methods

- `byStatus(status: TArtifactEvent)` - Filter by artifact status (latest event)
- `inMilestone(milestoneId: string)` - Filter artifacts belonging to a milestone
- `ofType(type: ArtifactType)` - Filter by artifact type (initiative, milestone, issue)
- `execute()` - Execute the query and return matching artifacts

### Type Guards

- `isInitiative(artifact)` - Check if artifact is an Initiative
- `isMilestone(artifact)` - Check if artifact is a Milestone
- `isIssue(artifact)` - Check if artifact is an Issue

## Performance

The query system is designed for CLI usage with sub-100ms performance for typical queries. Tests demonstrate handling 1000+ artifacts efficiently.

## Note on Artifact IDs

Currently, artifacts don't store their own IDs internally. For the `inMilestone()` filter to work, artifacts need to have an `id` property attached. This is a known limitation that will be addressed in future versions.