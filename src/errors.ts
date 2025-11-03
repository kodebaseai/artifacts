/**
 * Error thrown when an artifact file is not found.
 */
export class ArtifactNotFoundError extends Error {
  /** The ID of the artifact that was not found */
  public readonly artifactId: string;

  /** The file path where the artifact was expected to be */
  public readonly filePath: string;

  constructor(artifactId: string, filePath: string) {
    super(`Artifact "${artifactId}" not found at path: ${filePath}`);
    this.artifactId = artifactId;
    this.filePath = filePath;
    this.name = "ArtifactNotFoundError";
    Error.captureStackTrace(this, ArtifactNotFoundError);
  }
}

/**
 * Error thrown when operation is attempted outside of a Kodebase project.
 */
export class NotInKodebaseProjectError extends Error {
  /** The directory where the Kodebase project was expected but not found */
  public readonly directory: string;

  constructor(directory: string) {
    super(
      `Not in a Kodebase project. No .kodebase/ directory found at: ${directory}`,
    );
    this.directory = directory;
    this.name = "NotInKodebaseProjectError";
    Error.captureStackTrace(this, NotInKodebaseProjectError);
  }
}
