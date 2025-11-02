/**
 * Test fixtures and utilities for git-ops package
 */

import type {
  BranchInfo,
  HookContext,
  PostCheckoutContext,
  PRInfo,
  PreCommitContext,
} from '../types';
import { CGitHook, CPRState } from '../types';

/**
 * Create a mock hook context
 */
export function createMockHookContext(
  overrides: Partial<HookContext> = {},
): HookContext {
  return {
    hookType: CGitHook.POST_CHECKOUT,
    repoPath: '/tmp/test-repo',
    args: [],
    env: {},
    cwd: '/tmp/test-repo',
    ...overrides,
  };
}

/**
 * Create a mock post-checkout context
 */
export function createMockPostCheckoutContext(
  overrides: Partial<PostCheckoutContext> = {},
): PostCheckoutContext {
  return {
    ...createMockHookContext({ hookType: CGitHook.POST_CHECKOUT }),
    previousHead: '0000000000000000000000000000000000000000',
    newHead: 'abc123def456',
    isBranchCheckout: true,
    ...overrides,
  };
}

/**
 * Create a mock pre-commit context
 */
export function createMockPreCommitContext(
  overrides: Partial<PreCommitContext> = {},
): PreCommitContext {
  return {
    ...createMockHookContext({ hookType: CGitHook.PRE_COMMIT }),
    stagedFiles: [],
    commitMessagePath: '.git/COMMIT_EDITMSG',
    ...overrides,
  };
}

/**
 * Create a mock branch info
 */
export function createMockBranchInfo(
  overrides: Partial<BranchInfo> = {},
): BranchInfo {
  return {
    name: 'A.1.5',
    existsLocal: true,
    existsRemote: false,
    commitSha: 'abc123def456',
    artifactId: 'A.1.5',
    isProtected: false,
    protectionLevel: 'none',
    ...overrides,
  };
}

/**
 * Create a mock PR info
 */
export function createMockPRInfo(overrides: Partial<PRInfo> = {}): PRInfo {
  return {
    number: 42,
    state: CPRState.DRAFT,
    title: 'A.1.5: Work Started',
    body: 'Draft PR for issue A.1.5',
    sourceBranch: 'A.1.5',
    targetBranch: 'main',
    author: 'John Doe',
    createdAt: new Date('2025-01-07T10:00:00Z'),
    updatedAt: new Date('2025-01-07T10:00:00Z'),
    isDraft: true,
    labels: [],
    assignees: [],
    reviewers: [],
    approvals: 0,
    ...overrides,
  };
}

/**
 * Mock git command responses
 */
export const mockGitResponses = {
  branch: {
    list: '* main\n  A.1.5\n  A.1.6\n',
    current: 'A.1.5\n',
  },
  status: {
    clean: 'nothing to commit, working tree clean',
    staged: 'Changes to be committed:\n  modified:   src/index.ts',
  },
  log: {
    oneline: 'abc123 A.1.5: feat: Add feature\n456def Initial commit',
  },
  remote: {
    origin: 'origin\tgit@github.com:kodebaseai/kodebase.git (fetch)',
  },
};

/**
 * Sample artifact IDs for testing
 */
export const sampleArtifactIds = {
  valid: {
    issue: ['A.1.5', 'B.23.11', 'AB.11.3'],
    milestone: ['A.1', 'B.23', 'AB.11'],
    initiative: ['A', 'B', 'AB'],
    nested_artifact: ['A.1.5.6', 'AB.23.11.2', 'XY.1.2.3.4'], // nested artifacts beyond 3 levels
  },
  invalid: [
    'a.1.5', // lowercase
    'A-1-5', // wrong separator
    '1.2.3', // no letter prefix
    'A..5', // empty part
    'A.1.', // trailing dot
  ],
};

/**
 * Sample commit messages
 */
export const sampleCommitMessages = {
  valid: [
    'A.1.5: feat: Add email validation',
    'A.1.5: fix: Correct validation logic',
    'A.1.5: docs: Update API documentation',
    'A.1.5: test: Add unit tests for validator',
    'A.1.5: refactor: Extract validation helpers',
  ],
  invalid: [
    'Add email validation', // no artifact ID
    'A.1.5 Add feature', // missing colon after ID
    'A.1.5: added feature', // not conventional commit
    'a.1.5: feat: Add feature', // lowercase artifact ID
  ],
};
