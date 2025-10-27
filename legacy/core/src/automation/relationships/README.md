# Bidirectional Relationship Management

This module provides utilities for managing bidirectional relationships between Kodebase artifacts, ensuring data consistency and referential integrity.

## Overview

The relationship management system addresses friction point FP-007, which showed that maintaining bidirectional relationships manually takes 5-10 minutes per relationship update. This module provides atomic operations that update both sides of a relationship simultaneously.

## Key Features

- **Atomic Updates**: All relationship operations update both artifacts in a single operation
- **Validation**: Prevents adding non-existent artifact IDs and circular dependencies
- **Referential Integrity**: Ensures relationships are always consistent between artifacts
- **TypeScript Support**: Full type safety with no `any` types

## API

### `addBlocks(blockerId: string, blockedId: string, artifacts: Map<string, Artifact>)`

Adds a blocking relationship where artifact A blocks artifact B. Updates both artifacts:
- Adds `blockedId` to `blockerId`'s `blocks` array
- Adds `blockerId` to `blockedId`'s `blocked_by` array

### `removeBlocks(blockerId: string, blockedId: string, artifacts: Map<string, Artifact>)`

Removes a blocking relationship between two artifacts. Updates both artifacts:
- Removes `blockedId` from `blockerId`'s `blocks` array
- Removes `blockerId` from `blockedId`'s `blocked_by` array

### `addBlockedBy(blockedId: string, blockerId: string, artifacts: Map<string, Artifact>)`

Adds a blocked-by relationship (inverse of addBlocks). Updates both artifacts:
- Adds `blockerId` to `blockedId`'s `blocked_by` array
- Adds `blockedId` to `blockerId`'s `blocks` array

### `removeBlockedBy(blockedId: string, blockerId: string, artifacts: Map<string, Artifact>)`

Removes a blocked-by relationship (inverse of removeBlocks). Updates both artifacts:
- Removes `blockerId` from `blockedId`'s `blocked_by` array
- Removes `blockedId` from `blockerId`'s `blocks` array

## Usage Example

```typescript
import { addBlocks, removeBlocks } from '@kodebase/core';

// Load artifacts from storage
const artifacts = new Map([
  ['A.1', artifactA],
  ['A.2', artifactB]
]);

// Add relationship: A.1 blocks A.2
const result = addBlocks('A.1', 'A.2', artifacts);

if (result.success) {
  // Save updated artifacts back to storage
  for (const [id, artifact] of result.updatedArtifacts) {
    await saveArtifact(id, artifact);
  }
} else {
  console.error(result.error);
}
```

## Error Handling

All functions return a `RelationshipOperationResult`:

```typescript
interface RelationshipOperationResult {
  success: boolean;
  updatedArtifacts: Map<string, Artifact>;
  error?: string;
}
```

Common errors:
- "Artifact X does not exist" - When trying to create relationships with non-existent artifacts
- "Adding this relationship would create a circular dependency" - When the relationship would create a cycle

## Design Decisions

1. **Immutability**: All operations create new artifact objects rather than mutating existing ones
2. **Validation First**: All validations are performed before any updates
3. **Atomic Operations**: Both artifacts are updated together to maintain consistency
4. **Simple API**: Only four functions needed to handle all relationship scenarios