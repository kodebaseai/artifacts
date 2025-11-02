/**
 * Error thrown when workflow coordination operations fail
 */
export class CoordinationError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CoordinationError';

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CoordinationError);
    }
  }
}

/**
 * Error thrown when state synchronization fails
 */
export class SynchronizationError extends CoordinationError {
  constructor(
    message: string,
    public readonly artifactState: string,
    public readonly gitState: string,
    cause?: Error,
  ) {
    super(message, cause, { artifactState, gitState });
    this.name = 'SynchronizationError';
  }
}

/**
 * Error thrown when conflict resolution fails
 */
export class ConflictResolutionError extends CoordinationError {
  constructor(
    message: string,
    public readonly conflictType: string,
    cause?: Error,
  ) {
    super(message, cause, { conflictType });
    this.name = 'ConflictResolutionError';
  }
}

/**
 * Error thrown when rollback operations fail
 */
export class RollbackError extends CoordinationError {
  constructor(
    message: string,
    public readonly rollbackPhase: string,
    cause?: Error,
  ) {
    super(message, cause, { rollbackPhase });
    this.name = 'RollbackError';
  }
}
