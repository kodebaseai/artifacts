# Batch Operations

High-performance parallel processing for multiple Kodebase artifacts. Provides efficient batch validation, bulk status updates, and memory-optimized processing with error isolation and progress reporting.

## Features

✅ **Parallel Processing** - Utilizes available CPU cores for maximum throughput
✅ **Error Isolation** - Single failures don't stop entire batch operations
✅ **Progress Reporting** - Real-time progress callbacks for long-running operations
✅ **Memory Efficient** - Chunks large collections and manages memory usage
✅ **Bulk Status Updates** - Efficient state transitions for multiple artifacts
✅ **Performance Target** - Process 100+ artifacts in seconds

## Quick Start

```typescript
import { createBatchOperations } from '@kodebase/core';

// Create the batch operations suite
const { processor, validator, statusUpdater } = createBatchOperations();

// Process multiple artifacts in parallel
const result = await processor.processArtifacts(
  artifacts,
  async (artifact) => {
    // Your processing logic here
    return processArtifact(artifact);
  },
  {
    maxConcurrency: 4,
    progressCallback: (current, total, operation) => {
      console.log(`${operation}: ${current}/${total} (${Math.round(current/total*100)}%)`);
    }
  }
);

console.log(`Processed ${result.succeeded}/${result.totalItems} artifacts in ${result.processingTimeMs}ms`);
```

## Core Components

### BatchProcessor

Parallel processing engine for any artifact operation.

```typescript
import { BatchProcessor } from '@kodebase/core';

const processor = new BatchProcessor();

const result = await processor.processArtifacts(
  artifacts,
  async (artifact) => {
    // Your custom processing logic
    if (artifact.metadata.title.includes('urgent')) {
      await priorityHandler(artifact);
    }
    return validateAndTransform(artifact);
  },
  {
    maxConcurrency: 8,           // Use up to 8 CPU cores
    chunkSize: 50,               // Process 50 items per chunk
    memoryLimit: 512,            // 512MB memory limit
    progressCallback: (current, total, operation) => {
      updateProgressBar(current / total);
    }
  }
);
```

### BatchValidator

Parallel validation of multiple artifacts with detailed error reporting.

```typescript
import { createBatchValidator } from '@kodebase/core';

const validator = createBatchValidator();

// Validate array of unknown data
const result = await validator.validateArtifacts(
  unknownDataArray,
  {
    maxConcurrency: 4,
    progressCallback: (current, total) => {
      console.log(`Validating: ${current}/${total}`);
    }
  }
);

// Check results
console.log(`✅ ${result.succeeded} valid, ❌ ${result.failed} invalid`);
result.results.forEach(item => {
  if (!item.success) {
    console.error(`Validation failed for ${item.id}: ${item.error}`);
  }
});

// Validate files in parallel
const fileResult = await validator.validateArtifactPaths(
  ['.kodebase/artifacts/**/*.yml'],
  { maxConcurrency: 6 }
);
```

### BulkStatusUpdater

Efficient parallel status updates with transition validation.

```typescript
import { createBulkStatusUpdater } from '@kodebase/core';

const updater = createBulkStatusUpdater();

// Update multiple artifacts to 'ready' state
const result = await updater.updateStatuses(
  artifacts,
  'ready',
  {
    actor: 'John Doe (john@example.com)',
    maxConcurrency: 4,
    validateTransitions: true,  // Ensure valid state transitions
    metadata: {
      reason: 'Bulk preparation for sprint start',
      sprint: 'Sprint-23'
    },
    progressCallback: (current, total, operation) => {
      console.log(`${operation}: ${current}/${total}`);
    }
  }
);

// Update by IDs (loads artifacts as needed)
const idResult = await updater.updateStatusesByIds(
  ['A.1.1', 'A.1.2', 'A.1.3'],
  'in_progress',
  async (id) => loadArtifactFromFile(id), // Your loading logic
  {
    actor: 'System Automation',
    validateTransitions: false  // Skip validation for trusted operations
  }
);
```

## Configuration

### Default Configuration

```typescript
const DEFAULT_BATCH_CONFIG = {
  maxConcurrency: Math.min(os.cpus().length, 8), // Use available cores, max 8
  chunkSize: 50,                                 // 50 items per memory chunk
  progressCallback: () => {},                    // No-op progress reporting
  memoryLimit: 512,                             // 512MB memory limit
};
```

### Custom Configuration

```typescript
// High-performance configuration for powerful machines
const highPerformanceConfig = {
  maxConcurrency: 16,
  chunkSize: 100,
  memoryLimit: 2048, // 2GB
  progressCallback: (current, total, operation) => {
    const percent = Math.round((current / total) * 100);
    process.stdout.write(`\r${operation}: ${percent}%`);
  }
};

// Memory-constrained configuration for limited environments
const lowMemoryConfig = {
  maxConcurrency: 2,
  chunkSize: 10,
  memoryLimit: 128, // 128MB
};
```

## Performance Guidelines

### Target Performance
- **100+ artifacts in seconds** - The system is designed to process large collections quickly
- **15+ artifacts/second** - Minimum throughput for typical operations
- **Memory efficiency** - Processes large collections without memory exhaustion

### Optimization Tips

1. **Concurrency Tuning**
   ```typescript
   // For CPU-intensive operations
   maxConcurrency: Math.min(os.cpus().length, 8)

   // For I/O-intensive operations
   maxConcurrency: os.cpus().length * 2
   ```

2. **Memory Management**
   ```typescript
   // For large collections (1000+ items)
   chunkSize: 25
   memoryLimit: 1024

   // For memory-constrained environments
   chunkSize: 10
   memoryLimit: 256
   ```

3. **Progress Reporting**
   ```typescript
   // Throttled progress updates (every 100ms)
   let lastUpdate = 0;
   progressCallback: (current, total, operation) => {
     const now = Date.now();
     if (now - lastUpdate > 100) {
       updateUI(current, total, operation);
       lastUpdate = now;
     }
   }
   ```

## Error Handling

### Error Isolation
Each artifact is processed independently. Failures in individual items don't affect the rest of the batch.

```typescript
const result = await processor.processArtifacts(artifacts, async (artifact) => {
  if (artifact.metadata.title === 'problematic-item') {
    throw new Error('Simulated failure');
  }
  return 'success';
});

// Results contain both successes and failures
console.log(`${result.succeeded} succeeded, ${result.failed} failed`);

// Access individual results
result.results.forEach(item => {
  if (item.success) {
    console.log(`✅ ${item.id}: ${item.result}`);
  } else {
    console.error(`❌ ${item.id}: ${item.error}`);
  }
});
```

### Memory Limit Protection
```typescript
try {
  await processor.processArtifacts(veryLargeCollection, processor, {
    memoryLimit: 256  // 256MB limit
  });
} catch (error) {
  if (error.message.includes('memory usage')) {
    console.error('Collection too large for memory limit');
    // Reduce chunk size or increase memory limit
  }
}
```

## Real-World Examples

### Milestone Completion Processing
```typescript
// Process all issues in a milestone for completion
const milestoneIssues = await loadMilestoneIssues('A.1');

const completionResult = await processor.processArtifacts(
  milestoneIssues,
  async (issue) => {
    // Check if all acceptance criteria are met
    const isComplete = await checkAcceptanceCriteria(issue);

    if (isComplete) {
      // Transition to completed
      performTransition(issue, 'completed', 'system@kodebase.ai');
      return { action: 'completed', issue: issue.metadata.title };
    } else {
      return { action: 'skipped', reason: 'Incomplete criteria' };
    }
  },
  {
    maxConcurrency: 4,
    progressCallback: (current, total) => {
      console.log(`Processing milestone A.1: ${current}/${total} issues`);
    }
  }
);

console.log(`Milestone processing complete: ${completionResult.succeeded} issues processed`);
```

### Large-Scale Validation
```typescript
// Validate all artifacts in the repository
const allArtifactPaths = await glob('.kodebase/artifacts/**/*.yml');

const validationResult = await validator.validateArtifactPaths(
  allArtifactPaths,
  {
    maxConcurrency: 8,
    chunkSize: 25,
    progressCallback: (current, total, operation) => {
      const percent = Math.round((current / total) * 100);
      console.log(`${operation}: ${percent}% (${current}/${total})`);
    }
  }
);

// Generate validation report
const report = {
  totalFiles: validationResult.totalItems,
  valid: validationResult.succeeded,
  invalid: validationResult.failed,
  processingTime: `${validationResult.processingTimeMs}ms`,
  throughput: `${(validationResult.totalItems / (validationResult.processingTimeMs / 1000)).toFixed(1)} files/sec`,
  errors: validationResult.results
    .filter(r => !r.success)
    .map(r => ({ file: r.id, error: r.error }))
};

console.table(report.errors);
```

### Sprint Preparation
```typescript
// Bulk update all ready issues to in_progress for sprint start
const readyIssues = await query(allArtifacts)
  .byStatus('ready')
  .inMilestone('A.2')
  .execute();

const sprintStartResult = await updater.updateStatuses(
  readyIssues,
  'in_progress',
  {
    actor: 'Sprint Automation',
    metadata: {
      sprint: 'Sprint-24',
      reason: 'Sprint start automation',
      startDate: new Date().toISOString()
    },
    maxConcurrency: 6,
    validateTransitions: true,
    progressCallback: (current, total) => {
      console.log(`Starting sprint: ${current}/${total} issues updated`);
    }
  }
);

console.log(`Sprint started: ${sprintStartResult.succeeded} issues now in progress`);
```

## API Reference

### Interfaces

```typescript
interface BatchResult<T> {
  totalItems: number;
  succeeded: number;
  failed: number;
  results: BatchItemResult<T>[];
  processingTimeMs: number;
  memoryUsageMB: number;
  coresUtilized: number;
}

interface BatchItemResult<T> {
  id: string;
  success: boolean;
  result?: T;
  error?: string;
  processingTimeMs: number;
}

interface BatchValidationConfig {
  maxConcurrency?: number;
  chunkSize?: number;
  progressCallback?: ProgressCallback;
  memoryLimit?: number; // MB
}

interface BulkStatusUpdateConfig {
  maxConcurrency?: number;
  actor: string;
  metadata?: Record<string, unknown>;
  progressCallback?: ProgressCallback;
  validateTransitions?: boolean;
}
```

### Utility Functions

```typescript
// Estimate memory usage for planning
const estimatedMB = estimateMemoryUsage(1000, 8); // 1000 items, 8KB each

// Chunk arrays for processing
const chunks = chunkArray(largeArray, 50); // Split into chunks of 50

// Create complete batch operations suite
const operations = createBatchOperations();
```

## Integration with Existing Systems

### With ArtifactQuery
```typescript
import { query, createBatchOperations } from '@kodebase/core';

const { processor } = createBatchOperations();

// Process all issues in milestone A.3
const issues = query(artifacts).inMilestone('A.3').ofType('issue').execute();

const result = await processor.processArtifacts(issues, async (issue) => {
  return analyzeIssueComplexity(issue);
});
```

### With CascadeEngine
```typescript
import { CascadeEngine, createBulkStatusUpdater } from '@kodebase/core';

const engine = new CascadeEngine();
const updater = createBulkStatusUpdater();

// Process milestone completion cascades
const milestones = query(artifacts).ofType('milestone').byStatus('in_review').execute();

await processor.processArtifacts(milestones, async (milestone) => {
  const children = findChildren(milestone);
  const shouldCascade = engine.shouldCascadeToParent(children);

  if (shouldCascade.shouldCascade) {
    await updater.updateStatuses([milestone], shouldCascade.newState!, {
      actor: 'Cascade Automation'
    });
  }
});
```

## Best Practices

1. **Start with defaults** - The default configuration works well for most use cases
2. **Monitor memory usage** - Use `estimateMemoryUsage()` for large operations
3. **Implement progress reporting** - Keep users informed during long operations
4. **Handle errors gracefully** - Check both individual and batch-level results
5. **Tune for your workload** - Adjust concurrency based on CPU vs I/O intensity
6. **Use error isolation** - Let successful items proceed even if others fail
7. **Test with realistic data** - Validate performance with actual artifact collections
