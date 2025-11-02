/**
 * CLI Bridge Types
 */

/**
 * Environment configuration for CLI execution
 */
export interface EnvironmentConfig {
  /** Working directory for command execution */
  cwd: string;
  /** Environment variables to set */
  env: Record<string, string>;
  /** Timeout for command execution in milliseconds */
  timeout: number;
}

/**
 * Path resolution result
 */
export interface PathResolution {
  /** Absolute path to the script */
  scriptPath: string;
  /** Repository root path */
  repoRoot: string;
  /** Scripts directory path */
  scriptsDir: string;
}

/**
 * Command execution result
 */
export interface CommandResult {
  /** Exit code from the command */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Whether the command was successful */
  success: boolean;
  /** Execution time in milliseconds */
  executionTime: number;
}

/**
 * Git context information
 */
export interface GitContext {
  /** Current branch name */
  branch: string;
  /** Current commit hash */
  commit: string;
  /** Repository root path */
  repoRoot: string;
  /** Git user information */
  user: {
    name: string;
    email: string;
  };
}

/**
 * CLI command configuration
 */
export interface CommandConfig {
  /** Command name (e.g., 'ictx', 'cpr', 'complete') */
  name: string;
  /** Command arguments */
  args: string[];
  /** Git context to pass to command */
  gitContext?: GitContext;
  /** Environment overrides */
  envOverrides?: Record<string, string>;
  /** Custom timeout */
  timeout?: number;
}

/**
 * Context aggregation options
 */
export interface ContextAggregationOptions {
  /** Artifact ID to aggregate context for */
  artifactId: string;
  /** Type of aggregation */
  type: 'milestone' | 'initiative';
  /** Repository root path */
  repoRoot: string;
  /** Include completion analysis */
  includeCompletionAnalysis?: boolean;
  /** Include development process */
  includeDevelopmentProcess?: boolean;
}

/**
 * Context aggregation result
 */
export interface ContextAggregationResult {
  /** Aggregated context content */
  content: string;
  /** Number of artifacts included */
  artifactCount: number;
  /** Artifacts that were included */
  includedArtifacts: string[];
  /** Artifacts that were skipped */
  skippedArtifacts: string[];
}

/**
 * CLI Bridge configuration
 */
export interface CLIBridgeConfig {
  /** Repository root path */
  repoRoot: string;
  /** Scripts directory path (relative to repo root) */
  scriptsDir: string;
  /** Default timeout for commands */
  defaultTimeout: number;
  /** Environment setup options */
  environment: {
    /** Additional paths to add to PATH */
    additionalPaths: string[];
    /** Environment variables to set */
    envVars: Record<string, string>;
  };
}

/**
 * Error types for CLI bridge operations
 */
export enum CLIBridgeErrorType {
  ENVIRONMENT_SETUP_FAILED = 'ENVIRONMENT_SETUP_FAILED',
  PATH_RESOLUTION_FAILED = 'PATH_RESOLUTION_FAILED',
  COMMAND_EXECUTION_FAILED = 'COMMAND_EXECUTION_FAILED',
  CONTEXT_AGGREGATION_FAILED = 'CONTEXT_AGGREGATION_FAILED',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
}

/**
 * CLI Bridge error
 */
export class CLIBridgeError extends Error {
  constructor(
    public type: CLIBridgeErrorType,
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = 'CLIBridgeError';
  }
}
