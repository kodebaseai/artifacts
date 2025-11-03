/**
 * Error thrown when an artifact file is not found.
 */
export class ArtifactNotFoundError extends Error {
  constructor(
    public readonly artifactId: string,
    public readonly filePath: string,
  ) {
    super(`Artifact "${artifactId}" not found at path: ${filePath}`);
    this.name = "ArtifactNotFoundError";
    Error.captureStackTrace(this, ArtifactNotFoundError);
  }
}

/**
 * Error thrown when operation is attempted outside of a Kodebase project.
 */
export class NotInKodebaseProjectError extends Error {
  constructor(public readonly directory: string) {
    super(
      `Not in a Kodebase project. No .kodebase/ directory found at: ${directory}`,
    );
    this.name = "NotInKodebaseProjectError";
    Error.captureStackTrace(this, NotInKodebaseProjectError);
  }
}
