/**
 * Error catalog with common error scenarios and their solutions
 */

import type { ErrorAction, StructuredError } from './types';

/**
 * Common error scenarios from the issue notes:
 * 1. GitHub CLI not installed or not authenticated
 * 2. Invalid artifact ID in branch name
 * 3. Artifact file not found or corrupted
 * 4. Permission issues with .git/hooks directory
 * 5. Network connectivity issues
 * 6. Artifact in invalid state for operation
 */

const DOCUMENTATION_BASE = 'https://docs.kodebase.ai/git-ops';

/**
 * Creates common error actions with documentation links
 */
function createActions(
  actions: Omit<ErrorAction, 'link'>[],
  category: string,
): ErrorAction[] {
  return actions.map((action) => ({
    ...action,
    link: `${DOCUMENTATION_BASE}/troubleshooting#${category}`,
  }));
}

/**
 * GitHub CLI not installed or not authenticated
 */
export const GITHUB_CLI_NOT_INSTALLED: StructuredError = {
  code: 'NETWORK_EXTERNAL_001',
  severity: 'error',
  category: 'network',
  type: 'external_dependency',
  message: 'GitHub CLI not installed',
  description:
    'The GitHub CLI (gh) is required for PR creation and GitHub operations',
  impact: 'Cannot create draft PRs or interact with GitHub repositories',
  actions: createActions(
    [
      {
        description: 'Install GitHub CLI on macOS using Homebrew',
        command: 'brew install gh',
      },
      {
        description: 'Install GitHub CLI on other systems',
        command: 'Visit https://cli.github.com/ for installation instructions',
      },
      {
        description: 'Verify installation',
        command: 'gh --version',
      },
    ],
    'github-cli',
  ),
};

export const GITHUB_AUTH_REQUIRED: StructuredError = {
  code: 'NETWORK_AUTH_001',
  severity: 'error',
  category: 'authentication',
  type: 'user_error',
  message: 'GitHub authentication required',
  description: 'GitHub CLI is not authenticated with your GitHub account',
  impact: 'Cannot create PRs or access GitHub repositories',
  actions: createActions(
    [
      {
        description: 'Authenticate with GitHub',
        command: 'gh auth login',
      },
      {
        description: 'Check authentication status',
        command: 'gh auth status',
      },
      {
        description: 'Use GitHub token if needed',
        command: 'gh auth login --with-token < token.txt',
      },
    ],
    'github-auth',
  ),
};

/**
 * Invalid artifact ID in branch name
 */
export const INVALID_ARTIFACT_ID: StructuredError = {
  code: 'ARTIFACT_VALIDATION_001',
  severity: 'error',
  category: 'validation',
  type: 'user_error',
  message: 'Invalid artifact ID format',
  description: 'Branch name does not follow the required artifact ID pattern',
  impact: 'Git operations cannot be linked to artifact lifecycle events',
  actions: createActions(
    [
      {
        description: 'Use valid artifact ID format (e.g., A.1.5, B.2.3)',
        command: 'git checkout -b A.1.5',
      },
      {
        description: 'Check existing artifacts for valid IDs',
        command: 'find .kodebase/artifacts -name "*.yml" | head -10',
      },
    ],
    'artifact-naming',
  ),
};

/**
 * Artifact file not found or corrupted
 */
export const ARTIFACT_NOT_FOUND: StructuredError = {
  code: 'ARTIFACT_FILE_001',
  severity: 'error',
  category: 'artifact',
  type: 'user_error',
  message: 'Artifact file not found',
  description:
    'The artifact YAML file could not be located in the expected directory',
  impact: 'Cannot update artifact status or validate transitions',
  actions: createActions(
    [
      {
        description: 'Check if artifact file exists',
        command: 'ls -la .kodebase/artifacts/**/*.yml',
      },
      {
        description: 'Create missing artifact file using template',
        command:
          'cp .kodebase/templates/issue.yml .kodebase/artifacts/path/to/your-artifact.yml',
      },
      {
        description: 'Verify artifact structure',
        command: 'cat .kodebase/artifacts/path/to/your-artifact.yml',
      },
    ],
    'artifact-files',
  ),
};

export const ARTIFACT_CORRUPTED: StructuredError = {
  code: 'ARTIFACT_FILE_002',
  severity: 'error',
  category: 'artifact',
  type: 'user_error',
  message: 'Artifact file corrupted or invalid',
  description: 'The artifact YAML file contains invalid syntax or structure',
  impact: 'Cannot parse artifact metadata or validate state transitions',
  actions: createActions(
    [
      {
        description: 'Validate YAML syntax',
        command: 'npx js-yaml .kodebase/artifacts/path/to/your-artifact.yml',
      },
      {
        description: 'Check for required fields',
        command:
          'cat .kodebase/artifacts/path/to/your-artifact.yml | grep -E "(metadata|content|events)"',
      },
      {
        description: 'Restore from git history',
        command:
          'git checkout HEAD~1 -- .kodebase/artifacts/path/to/your-artifact.yml',
      },
    ],
    'artifact-validation',
  ),
};

/**
 * Permission issues with .git/hooks directory
 */
export const HOOKS_PERMISSION_DENIED: StructuredError = {
  code: 'PERMISSIONS_FILE_001',
  severity: 'error',
  category: 'permissions',
  type: 'system_failure',
  message: 'Permission denied accessing git hooks',
  description: 'Insufficient permissions to read, write, or execute git hooks',
  impact: 'Cannot install or run git hooks for automated status updates',
  actions: createActions(
    [
      {
        description: 'Check current permissions',
        command: 'ls -la .git/hooks/',
      },
      {
        description: 'Fix hook permissions',
        command: 'chmod +x .git/hooks/*',
      },
      {
        description: 'Fix directory permissions (if needed)',
        command: 'chmod 755 .git/hooks',
      },
    ],
    'permissions',
  ),
};

/**
 * Network connectivity issues
 */
export const NETWORK_TIMEOUT: StructuredError = {
  code: 'NETWORK_CONNECTION_001',
  severity: 'warning',
  category: 'network',
  type: 'external_dependency',
  message: 'Network operation timed out',
  description: 'Network request exceeded timeout limit',
  impact: 'GitHub operations may fail, but git operations can continue',
  actions: createActions(
    [
      {
        description: 'Check internet connectivity',
        command: 'ping github.com',
      },
      {
        description: 'Check GitHub status',
        command: 'curl -s https://status.github.com/api/status.json',
      },
      {
        description: 'Retry operation',
        command: 'Try the git operation again',
      },
    ],
    'network',
  ),
};

/**
 * Artifact in invalid state for operation
 */
export const INVALID_STATE_TRANSITION: StructuredError = {
  code: 'ARTIFACT_STATE_001',
  severity: 'error',
  category: 'validation',
  type: 'user_error',
  message: 'Invalid state transition',
  description:
    'Artifact cannot transition to the requested state from its current state',
  impact: 'Git operation blocked to maintain artifact lifecycle integrity',
  actions: createActions(
    [
      {
        description: 'Check current artifact state',
        command:
          'grep -A 5 "events:" .kodebase/artifacts/path/to/your-artifact.yml | tail -5',
      },
      {
        description: 'Review valid state transitions',
        command: 'Visit documentation for artifact lifecycle',
      },
      {
        description: 'Complete prerequisite work first',
        command: 'Address any blocking dependencies or required work',
      },
    ],
    'state-transitions',
  ),
};

/**
 * Git configuration issues
 */
export const GIT_CONFIG_MISSING: StructuredError = {
  code: 'GIT_CONFIG_001',
  severity: 'error',
  category: 'git_config',
  type: 'user_error',
  message: 'Git configuration missing',
  description: 'Required git configuration (user.name, user.email) is not set',
  impact: 'Cannot create commits or track actor information in artifact events',
  actions: createActions(
    [
      {
        description: 'Set git user name',
        command: 'git config user.name "Your Name"',
      },
      {
        description: 'Set git user email',
        command: 'git config user.email "your@email.com"',
      },
      {
        description: 'Set globally (optional)',
        command:
          'git config --global user.name "Your Name" && git config --global user.email "your@email.com"',
      },
    ],
    'git-config',
  ),
};

export const NOT_GIT_REPOSITORY: StructuredError = {
  code: 'GIT_REPO_001',
  severity: 'error',
  category: 'git_repository',
  type: 'user_error',
  message: 'Not a git repository',
  description: 'Current directory is not inside a git repository',
  impact: 'Git operations and hooks cannot function outside a git repository',
  actions: createActions(
    [
      {
        description: 'Initialize git repository',
        command: 'git init',
      },
      {
        description: 'Navigate to git repository',
        command: 'cd /path/to/your/git/repo',
      },
      {
        description: 'Check if you are in correct directory',
        command: 'pwd && ls -la',
      },
    ],
    'git-repository',
  ),
};

/**
 * Error catalog lookup
 */
export const ERROR_CATALOG = new Map<string, StructuredError>([
  ['NETWORK_EXTERNAL_001', GITHUB_CLI_NOT_INSTALLED],
  ['NETWORK_AUTH_001', GITHUB_AUTH_REQUIRED],
  ['ARTIFACT_VALIDATION_001', INVALID_ARTIFACT_ID],
  ['ARTIFACT_FILE_001', ARTIFACT_NOT_FOUND],
  ['ARTIFACT_FILE_002', ARTIFACT_CORRUPTED],
  ['PERMISSIONS_FILE_001', HOOKS_PERMISSION_DENIED],
  ['NETWORK_CONNECTION_001', NETWORK_TIMEOUT],
  ['ARTIFACT_STATE_001', INVALID_STATE_TRANSITION],
  ['GIT_CONFIG_001', GIT_CONFIG_MISSING],
  ['GIT_REPO_001', NOT_GIT_REPOSITORY],
]);

/**
 * Get error by code
 */
export function getErrorByCode(code: string): StructuredError | undefined {
  return ERROR_CATALOG.get(code);
}

/**
 * Search errors by category
 */
export function getErrorsByCategory(category: string): StructuredError[] {
  return Array.from(ERROR_CATALOG.values()).filter(
    (error) => error.category === category,
  );
}
