import { render } from 'ink-testing-library';
import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Start } from './Start.js';

// Mock git-ops integration
vi.mock('../integrations/git-ops.js', () => ({
  ensureGitRepository: vi.fn(),
  withGitOpsErrorHandling: vi.fn((fn) => fn()),
}));

// Mock simple-git
vi.mock('simple-git', () => ({
  default: vi.fn(() => mockGit),
}));

// Mock git-ops BranchCreator
vi.mock('@kodebase/git-ops', () => ({
  BranchCreator: vi.fn(() => mockBranchCreator),
}));

// Mock ArtifactLoader
vi.mock('../utils/artifact-loader.js', () => ({
  ArtifactLoader: vi.fn(() => mockArtifactLoader),
}));

const mockGit = {
  // Mock simple-git instance if needed
};

const mockBranchCreator = {
  create: vi.fn(),
};

const mockArtifactLoader = {
  loadArtifact: vi.fn(),
};

const mockEnsureGitRepository = vi.mocked(
  await import('../integrations/git-ops.js'),
).ensureGitRepository;

const mockWithGitOpsErrorHandling = vi.mocked(
  await import('../integrations/git-ops.js'),
).withGitOpsErrorHandling;

describe('Start Command', () => {
  beforeEach(() => {
    vol.reset();
    vi.clearAllMocks();

    // Reset default mock implementations
    mockEnsureGitRepository.mockImplementation(() => {});
    mockWithGitOpsErrorHandling.mockImplementation((fn) => fn());
  });

  describe('successful branch creation', () => {
    it('should start work on a ready artifact successfully', async () => {
      // Mock ready artifact
      mockArtifactLoader.loadArtifact.mockResolvedValue({
        metadata: {
          events: [
            {
              timestamp: '2025-01-01T00:00:00Z',
              event: 'ready',
            },
          ],
        },
      });

      // Mock successful branch creation
      mockBranchCreator.create.mockResolvedValue({
        name: 'D.2.2',
        existsLocal: false,
        existsRemote: false,
        commitSha: 'abc123',
        isProtected: false,
        protectionLevel: 'none',
      });

      const { lastFrame } = render(<Start artifactId="D.2.2" />);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame();
      expect(output).toContain('✓ Started work on D.2.2');
      expect(output).toContain('Created and switched to branch: D.2.2');
      expect(output).toContain('Next steps:');
      expect(output).toContain('1. Make your changes');
      expect(output).toContain('2. Commit with message: "D.2.2: feat: ..."');
      expect(output).toContain('3. Push when ready: git push -u origin D.2.2');

      // Verify interactions
      expect(mockEnsureGitRepository).toHaveBeenCalled();
      expect(mockArtifactLoader.loadArtifact).toHaveBeenCalledWith('D.2.2');
      expect(mockBranchCreator.create).toHaveBeenCalledWith({
        artifactId: 'D.2.2',
        checkout: true,
        push: false,
        track: false,
      });
    });

    it('should handle verbose mode correctly', async () => {
      // Mock ready artifact
      mockArtifactLoader.loadArtifact.mockResolvedValue({
        metadata: {
          events: [
            {
              timestamp: '2025-01-01T00:00:00Z',
              event: 'ready',
            },
          ],
        },
      });

      // Mock successful branch creation
      mockBranchCreator.create.mockResolvedValue({
        name: 'A.1.5',
        existsLocal: false,
        existsRemote: false,
        commitSha: 'def456',
        isProtected: false,
        protectionLevel: 'none',
      });

      const { lastFrame } = render(<Start artifactId="A.1.5" verbose={true} />);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame();
      expect(output).toContain('✓ Started work on A.1.5');
      expect(output).toContain('Created and switched to branch: A.1.5');
    });
  });

  describe('artifact validation', () => {
    it('should reject artifact with non-ready status', async () => {
      // Mock artifact with draft status
      mockArtifactLoader.loadArtifact.mockResolvedValue({
        metadata: {
          events: [
            {
              timestamp: '2025-01-01T00:00:00Z',
              event: 'draft',
            },
          ],
        },
      });

      const { lastFrame } = render(<Start artifactId="D.2.2" />);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame();
      expect(output).toContain('✗ Failed to start work on D.2.2');
      expect(output).toContain(
        'Artifact D.2.2 is not ready. Current status: draft',
      );
      expect(output).toContain('started.');

      // Verify loadArtifact was called but branch creation was not
      expect(mockArtifactLoader.loadArtifact).toHaveBeenCalledWith('D.2.2');
      expect(mockBranchCreator.create).not.toHaveBeenCalled();
    });

    it('should handle artifact with no events', async () => {
      // Mock artifact with empty events array
      mockArtifactLoader.loadArtifact.mockResolvedValue({
        metadata: {
          events: [],
        },
      });

      const { lastFrame } = render(<Start artifactId="D.2.2" />);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame();
      expect(output).toContain('✗ Failed to start work on D.2.2');
      expect(output).toContain('Current status: unknown');
    });

    it('should handle artifact not found', async () => {
      // Mock artifact loader throwing error
      mockArtifactLoader.loadArtifact.mockRejectedValue(
        new Error('Artifact not found: D.2.2'),
      );

      const { lastFrame } = render(<Start artifactId="D.2.2" />);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame();
      expect(output).toContain('✗ Failed to start work on D.2.2');
      expect(output).toContain('Artifact not found: D.2.2');
    });
  });

  describe('git repository validation', () => {
    it('should handle not being in a git repository', async () => {
      // Mock ensureGitRepository throwing error
      mockEnsureGitRepository.mockImplementation(() => {
        throw new Error(
          'Not in a git repository. Please run this command from within a git repository.',
        );
      });

      const { lastFrame } = render(<Start artifactId="D.2.2" />);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame();
      expect(output).toContain('✗ Failed to start work on D.2.2');
      expect(output).toContain('Not in a git repository');

      // Verify ensureGitRepository was called but loadArtifact was not
      expect(mockEnsureGitRepository).toHaveBeenCalled();
      expect(mockArtifactLoader.loadArtifact).not.toHaveBeenCalled();
    });
  });

  describe('branch creation errors', () => {
    it('should handle git-ops branch creation errors', async () => {
      // Mock ready artifact
      mockArtifactLoader.loadArtifact.mockResolvedValue({
        metadata: {
          events: [
            {
              timestamp: '2025-01-01T00:00:00Z',
              event: 'ready',
            },
          ],
        },
      });

      // Mock branch creation error
      mockBranchCreator.create.mockRejectedValue(
        new Error('Branch D.2.2 already exists'),
      );

      const { lastFrame } = render(<Start artifactId="D.2.2" />);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame();
      expect(output).toContain('✗ Failed to start work on D.2.2');
      expect(output).toContain('Branch D.2.2 already exists');

      // Verify all steps were attempted
      expect(mockEnsureGitRepository).toHaveBeenCalled();
      expect(mockArtifactLoader.loadArtifact).toHaveBeenCalledWith('D.2.2');
      expect(mockBranchCreator.create).toHaveBeenCalled();
    });

    it('should show error details in verbose mode', async () => {
      // Mock ready artifact
      mockArtifactLoader.loadArtifact.mockResolvedValue({
        metadata: {
          events: [
            {
              timestamp: '2025-01-01T00:00:00Z',
              event: 'ready',
            },
          ],
        },
      });

      // Mock branch creation error
      mockBranchCreator.create.mockRejectedValue(
        new Error('Git operation failed'),
      );

      const { lastFrame } = render(<Start artifactId="D.2.2" verbose={true} />);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame();
      expect(output).toContain('✗ Failed to start work on D.2.2');
      expect(output).toContain('Git operation failed');
      expect(output).toContain('Error details: Git operation failed');
    });
  });

  describe('loading states', () => {
    it('should show loading message while processing', async () => {
      // Mock artifact loading with delay
      mockArtifactLoader.loadArtifact.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  metadata: {
                    events: [
                      {
                        timestamp: '2025-01-01T00:00:00Z',
                        event: 'ready',
                      },
                    ],
                  },
                }),
              50,
            ),
          ),
      );

      mockBranchCreator.create.mockResolvedValue({
        name: 'D.2.2',
        existsLocal: false,
        existsRemote: false,
        commitSha: 'abc123',
        isProtected: false,
        protectionLevel: 'none',
      });

      const { lastFrame } = render(<Start artifactId="D.2.2" />);

      // Check loading state
      const loadingOutput = lastFrame();
      expect(loadingOutput).toContain('Starting work on D.2.2...');

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 100));

      const finalOutput = lastFrame();
      expect(finalOutput).toContain('✓ Started work on D.2.2');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined error objects', async () => {
      // Mock ready artifact
      mockArtifactLoader.loadArtifact.mockResolvedValue({
        metadata: {
          events: [
            {
              timestamp: '2025-01-01T00:00:00Z',
              event: 'ready',
            },
          ],
        },
      });

      // Mock non-Error object rejection
      mockBranchCreator.create.mockRejectedValue('String error');

      const { lastFrame } = render(<Start artifactId="D.2.2" />);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame();
      expect(output).toContain('✗ Failed to start work on D.2.2');
      expect(output).toContain('Unknown error');
    });

    it('should sort events by timestamp correctly', async () => {
      // Mock artifact with events in wrong chronological order
      mockArtifactLoader.loadArtifact.mockResolvedValue({
        metadata: {
          events: [
            {
              timestamp: '2025-01-01T00:00:00Z',
              event: 'draft',
            },
            {
              timestamp: '2025-01-02T00:00:00Z',
              event: 'ready',
            },
            {
              timestamp: '2025-01-01T12:00:00Z',
              event: 'blocked',
            },
          ],
        },
      });

      mockBranchCreator.create.mockResolvedValue({
        name: 'D.2.2',
        existsLocal: false,
        existsRemote: false,
        commitSha: 'abc123',
        isProtected: false,
        protectionLevel: 'none',
      });

      const { lastFrame } = render(<Start artifactId="D.2.2" />);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame();
      // Should pick the latest event (ready) despite array order
      expect(output).toContain('✓ Started work on D.2.2');
    });
  });
});
