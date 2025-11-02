import { render } from 'ink-testing-library';
import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PR } from './PR.js';

// Mock git-ops integration
vi.mock('../integrations/git-ops.js', () => ({
  ensureGitRepository: vi.fn(),
}));

// Mock simple-git
vi.mock('simple-git', () => ({
  default: vi.fn(() => mockGit),
}));

// Mock git-ops PRManager
vi.mock('@kodebase/git-ops', () => ({
  PRManager: vi.fn(() => mockPRManager),
}));

// Mock ArtifactLoader
vi.mock('../utils/artifact-loader.js', () => ({
  ArtifactLoader: vi.fn(() => mockArtifactLoader),
}));

const mockGit = {
  branchLocal: vi.fn(),
};

const mockPRManager = {
  listPRs: vi.fn(),
  createDraftPR: vi.fn(),
  updatePR: vi.fn(),
};

const mockArtifactLoader = {
  loadArtifact: vi.fn(),
};

const _mockEnsureGitRepository = vi.mocked(
  await import('../integrations/git-ops.js'),
).ensureGitRepository;

describe('PR Command', () => {
  beforeEach(() => {
    vol.reset();
    vi.clearAllMocks();
  });

  const mockIssueArtifact = {
    metadata: {
      title: 'Test Issue',
      events: [
        {
          timestamp: '2025-01-01T00:00:00Z',
          event: 'ready',
          actor: 'Test User (test@example.com)',
        },
      ],
    },
    content: {
      summary: 'This is a test issue summary',
      acceptance_criteria: [
        'First acceptance criterion',
        'Second acceptance criterion',
      ],
    },
    notes: {
      technical_notes: 'Some technical notes about implementation',
    },
  };

  it('should detect current branch and create new PR successfully', async () => {
    // Setup mocks
    mockGit.branchLocal.mockResolvedValue({
      current: 'D.2.4',
    });
    mockArtifactLoader.loadArtifact.mockResolvedValue(mockIssueArtifact);
    mockPRManager.listPRs.mockResolvedValue([]); // No existing PRs
    mockPRManager.createDraftPR.mockResolvedValue({
      success: true,
      prUrl: 'https://github.com/test/repo/pull/123',
      prNumber: 123,
    });

    const { lastFrame } = render(<PR ready={false} />);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockGit.branchLocal).toHaveBeenCalled();
    expect(mockArtifactLoader.loadArtifact).toHaveBeenCalledWith('D.2.4');
    expect(mockPRManager.listPRs).toHaveBeenCalledWith(process.cwd(), {
      branch: 'D.2.4',
      state: 'open',
    });
    expect(mockPRManager.createDraftPR).toHaveBeenCalledWith({
      title: 'D.2.4: Test Issue',
      body: expect.stringContaining('This is a test issue summary'),
      draft: true,
      repoPath: process.cwd(),
      branch: 'D.2.4',
    });

    expect(lastFrame()).toContain('✓ PR created successfully');
    expect(lastFrame()).toContain('D.2.4');
    expect(lastFrame()).toContain('Created new PR');
    expect(lastFrame()).toContain('Draft');
    expect(lastFrame()).toContain('https://github.com/test/repo/pull/123');
  });

  it('should update existing PR when one already exists', async () => {
    // Setup mocks
    mockGit.branchLocal.mockResolvedValue({
      current: 'D.2.4',
    });
    mockArtifactLoader.loadArtifact.mockResolvedValue(mockIssueArtifact);
    mockPRManager.listPRs.mockResolvedValue([
      {
        number: 123,
        url: 'https://github.com/test/repo/pull/123',
        title: 'Existing PR',
      },
    ]);
    mockPRManager.updatePR.mockResolvedValue({
      success: true,
    });

    const { lastFrame } = render(<PR ready={false} />);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockPRManager.updatePR).toHaveBeenCalledWith({
      prNumber: 123,
      title: 'D.2.4: Test Issue',
      body: expect.stringContaining('This is a test issue summary'),
      ready: false,
      repoPath: process.cwd(),
    });

    expect(lastFrame()).toContain('✓ PR updated successfully');
    expect(lastFrame()).toContain('Updated existing PR');
  });

  it('should create ready PR when --ready flag is used', async () => {
    // Setup mocks
    mockGit.branchLocal.mockResolvedValue({
      current: 'D.2.4',
    });
    mockArtifactLoader.loadArtifact.mockResolvedValue(mockIssueArtifact);
    mockPRManager.listPRs.mockResolvedValue([]);
    mockPRManager.createDraftPR.mockResolvedValue({
      success: true,
      prUrl: 'https://github.com/test/repo/pull/123',
      prNumber: 123,
    });
    mockPRManager.updatePR.mockResolvedValue({
      success: true,
    });

    const { lastFrame } = render(<PR ready={true} />);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockPRManager.createDraftPR).toHaveBeenCalledWith({
      title: 'D.2.4: Test Issue',
      body: expect.stringContaining('This is a test issue summary'),
      draft: false,
      repoPath: process.cwd(),
      branch: 'D.2.4',
    });

    expect(lastFrame()).toContain('Ready for review');
  });

  it('should generate correct PR description with acceptance criteria', async () => {
    // Setup mocks
    mockGit.branchLocal.mockResolvedValue({
      current: 'D.2.4',
    });
    mockArtifactLoader.loadArtifact.mockResolvedValue(mockIssueArtifact);
    mockPRManager.listPRs.mockResolvedValue([]);
    mockPRManager.createDraftPR.mockResolvedValue({
      success: true,
      prUrl: 'https://github.com/test/repo/pull/123',
      prNumber: 123,
    });

    render(<PR ready={false} />);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    const createCall = mockPRManager.createDraftPR.mock.calls[0]?.[0];
    expect(createCall?.body).toContain('## Summary');
    expect(createCall?.body).toContain('This is a test issue summary');
    expect(createCall?.body).toContain('## Acceptance Criteria');
    expect(createCall?.body).toContain('- [ ] First acceptance criterion');
    expect(createCall?.body).toContain('- [ ] Second acceptance criterion');
    expect(createCall?.body).toContain('## Technical Notes');
    expect(createCall?.body).toContain(
      'Some technical notes about implementation',
    );
    expect(createCall?.body).toContain(
      'generated automatically by the kodebase CLI',
    );
  });

  it('should handle branch without artifact ID pattern', async () => {
    // Setup mocks
    mockGit.branchLocal.mockResolvedValue({
      current: 'feature-branch',
    });

    const { lastFrame } = render(<PR ready={false} />);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(lastFrame()).toContain('✗ PR operation failed');
    expect(lastFrame()).toContain(
      "Current branch 'feature-branch' does not match artifact ID pattern",
    );
    expect(mockArtifactLoader.loadArtifact).not.toHaveBeenCalled();
  });

  it('should handle missing current branch', async () => {
    // Setup mocks
    mockGit.branchLocal.mockResolvedValue({
      current: null,
    });

    const { lastFrame } = render(<PR ready={false} />);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(lastFrame()).toContain('✗ PR operation failed');
    expect(lastFrame()).toContain(
      'Could not determine current branch. Make sure you are on a feature branch.',
    );
    expect(mockArtifactLoader.loadArtifact).not.toHaveBeenCalled();
  });

  it('should handle PR creation failure', async () => {
    // Setup mocks
    mockGit.branchLocal.mockResolvedValue({
      current: 'D.2.4',
    });
    mockArtifactLoader.loadArtifact.mockResolvedValue(mockIssueArtifact);
    mockPRManager.listPRs.mockResolvedValue([]);
    mockPRManager.createDraftPR.mockResolvedValue({
      success: false,
      error: 'GitHub API error',
    });

    const { lastFrame } = render(<PR ready={false} />);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(lastFrame()).toContain('✗ PR operation failed');
    expect(lastFrame()).toContain('GitHub API error');
  });

  it('should handle PR update failure', async () => {
    // Setup mocks
    mockGit.branchLocal.mockResolvedValue({
      current: 'D.2.4',
    });
    mockArtifactLoader.loadArtifact.mockResolvedValue(mockIssueArtifact);
    mockPRManager.listPRs.mockResolvedValue([
      {
        number: 123,
        url: 'https://github.com/test/repo/pull/123',
        title: 'Existing PR',
      },
    ]);
    mockPRManager.updatePR.mockResolvedValue({
      success: false,
      error: 'Update failed',
    });

    const { lastFrame } = render(<PR ready={false} />);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(lastFrame()).toContain('✗ PR operation failed');
    expect(lastFrame()).toContain('Update failed');
  });

  it('should handle different artifact types correctly', async () => {
    const mockInitiativeArtifact = {
      metadata: {
        title: 'Test Initiative',
        events: [],
      },
      content: {
        vision: 'This is the initiative vision',
        scope: 'Initiative scope',
        success_criteria: ['Criterion 1', 'Criterion 2'],
      },
    };

    // Setup mocks
    mockGit.branchLocal.mockResolvedValue({
      current: 'A.1',
    });
    mockArtifactLoader.loadArtifact.mockResolvedValue(mockInitiativeArtifact);
    mockPRManager.listPRs.mockResolvedValue([]);
    mockPRManager.createDraftPR.mockResolvedValue({
      success: true,
      prUrl: 'https://github.com/test/repo/pull/123',
      prNumber: 123,
    });

    render(<PR ready={false} />);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    const createCall = mockPRManager.createDraftPR.mock.calls[0]?.[0];
    expect(createCall?.title).toBe('A.1: Test Initiative');
    expect(createCall?.body).toContain('This is the initiative vision');
    expect(createCall?.body).toContain('No acceptance criteria defined');
  });

  it('should show loading state initially', async () => {
    // Setup mocks with delay
    mockGit.branchLocal.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ current: 'D.2.4' }), 100),
        ),
    );
    mockArtifactLoader.loadArtifact.mockResolvedValue(mockIssueArtifact);
    mockPRManager.listPRs.mockResolvedValue([]);
    mockPRManager.createDraftPR.mockResolvedValue({
      success: true,
      prUrl: 'https://github.com/test/repo/pull/123',
      prNumber: 123,
    });

    const { lastFrame } = render(<PR ready={false} />);

    // Check loading state
    expect(lastFrame()).toContain('🔄 Processing PR operation...');
    expect(lastFrame()).toContain('Detecting current branch and artifact ID');
    expect(lastFrame()).toContain('Creating/updating draft PR');

    // Wait for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 150));
  });

  it('should show verbose debug information when enabled', async () => {
    // Setup mocks for error case
    mockGit.branchLocal.mockRejectedValue(new Error('Git error'));

    const { lastFrame } = render(<PR ready={false} verbose={true} />);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(lastFrame()).toContain('✗ PR operation failed');
    expect(lastFrame()).toContain('Debugging information:');
    expect(lastFrame()).toContain('Branch detection and artifact ID mapping');
  });
});
