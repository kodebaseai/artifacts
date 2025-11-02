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
