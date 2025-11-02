import type { ArtifactSchema } from '@kodebase/core';
import { render } from 'ink-testing-library';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { Ready } from './Ready.js';

// Mock the artifact loader
vi.mock('../utils/artifact-loader.js', () => ({
  ArtifactLoader: vi.fn().mockImplementation(() => ({
    loadArtifact: vi.fn(),
  })),
}));

// Mock child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Mock fs operations
vi.mock('node:fs', () => ({
  writeFileSync: vi.fn(),
}));

// Mock fs promises
vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
}));

describe('Ready Command', () => {
  const mockArtifact: ArtifactSchema = {
    metadata: {
      title: 'Test Issue',
      priority: 'medium',
      estimation: 'XS',
      created_by: 'Test User (test@example.com)',
      assignee: 'Test User (test@example.com)',
      schema_version: '0.2.0',
      relationships: {
        blocks: [],
        blocked_by: [],
      },
      events: [
        {
          event: 'draft',
          timestamp: '2025-07-19T18:00:00Z',
          actor: 'Test User (test@example.com)',
          trigger: 'artifact_created',
        },
      ],
    },
    content: {
      summary: 'Test issue summary',
      acceptance_criteria: ['Test criteria 1', 'Test criteria 2'],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    const { lastFrame } = render(<Ready artifactId="T.1.1" />);

    expect(lastFrame()).toContain('Validating T.1.1...');
  });

  it('should validate artifact successfully and show confirmation', async () => {
    const { ArtifactLoader } = await import('../utils/artifact-loader.js');
    const mockLoader = ArtifactLoader as unknown as Mock;
    mockLoader.mockImplementation(() => ({
      loadArtifact: vi.fn().mockResolvedValue(mockArtifact),
    }));

    const { lastFrame } = render(<Ready artifactId="T.1.1" />);

    // Wait for async validation to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should show confirmation prompt
    expect(lastFrame()).toContain('Ready to mark artifact as ready?');
    expect(lastFrame()).toContain('Artifact: T.1.1');
    expect(lastFrame()).toContain('Title: Test Issue');
    expect(lastFrame()).toContain('Current status: draft');
  });

  it('should handle missing acceptance criteria for issues', async () => {
    const artifactWithoutCriteria = {
      ...mockArtifact,
      content: {
        ...mockArtifact.content,
        acceptance_criteria: [],
      },
    };

    const { ArtifactLoader } = await import('../utils/artifact-loader.js');
    const mockLoader = ArtifactLoader as unknown as Mock;
    mockLoader.mockImplementation(() => ({
      loadArtifact: vi.fn().mockResolvedValue(artifactWithoutCriteria),
    }));

    const { lastFrame } = render(<Ready artifactId="T.1.1" />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(lastFrame()).toContain('Failed to mark T.1.1 as ready');
    expect(lastFrame()).toContain(
      'missing required fields: acceptance_criteria',
    );
  });

  it('should handle wrong status', async () => {
    const artifactInProgress = {
      ...mockArtifact,
      metadata: {
        ...mockArtifact.metadata,
        events: [
          ...mockArtifact.metadata.events,
          {
            event: 'in_progress',
            timestamp: '2025-07-19T19:00:00Z',
            actor: 'Test User (test@example.com)',
            trigger: 'branch_created',
          },
        ],
      },
    };

    const { ArtifactLoader } = await import('../utils/artifact-loader.js');
    const mockLoader = ArtifactLoader as unknown as Mock;
    mockLoader.mockImplementation(() => ({
      loadArtifact: vi.fn().mockResolvedValue(artifactInProgress),
    }));

    const { lastFrame } = render(<Ready artifactId="T.1.1" />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(lastFrame()).toContain('Failed to mark T.1.1 as ready');
    expect(lastFrame()).toContain('not in draft status');
    expect(lastFrame()).toContain('Current status: in_progress');
  });

  it('should handle blocking dependencies', async () => {
    const blockedArtifact = {
      ...mockArtifact,
      metadata: {
        ...mockArtifact.metadata,
        relationships: {
          blocks: [],
          blocked_by: ['T.1.0', 'T.0.5'],
        },
      },
    };

    const { ArtifactLoader } = await import('../utils/artifact-loader.js');
    const mockLoader = ArtifactLoader as unknown as Mock;
    mockLoader.mockImplementation(() => ({
      loadArtifact: vi.fn().mockResolvedValue(blockedArtifact),
    }));

    const { lastFrame } = render(<Ready artifactId="T.1.1" />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(lastFrame()).toContain('Failed to mark T.1.1 as ready');
    expect(lastFrame()).toContain('blocking dependencies: T.1.0, T.0.5');
  });

  it('should handle missing title', async () => {
    const artifactWithoutTitle = {
      ...mockArtifact,
      metadata: {
        ...mockArtifact.metadata,
        title: '',
      },
    };

    const { ArtifactLoader } = await import('../utils/artifact-loader.js');
    const mockLoader = ArtifactLoader as unknown as Mock;
    mockLoader.mockImplementation(() => ({
      loadArtifact: vi.fn().mockResolvedValue(artifactWithoutTitle),
    }));

    const { lastFrame } = render(<Ready artifactId="T.1.1" />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(lastFrame()).toContain('Failed to mark T.1.1 as ready');
    expect(lastFrame()).toContain('missing required fields: title');
  });

  it('should handle artifact not found', async () => {
    const { ArtifactLoader } = await import('../utils/artifact-loader.js');
    const mockLoader = ArtifactLoader as unknown as Mock;
    mockLoader.mockImplementation(() => ({
      loadArtifact: vi
        .fn()
        .mockRejectedValue(new Error('Artifact not found: T.1.1')),
    }));

    const { lastFrame } = render(<Ready artifactId="T.1.1" />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(lastFrame()).toContain('Failed to mark T.1.1 as ready');
    expect(lastFrame()).toContain('Artifact not found: T.1.1');
  });

  it('should show verbose error information when verbose flag is used', async () => {
    const { ArtifactLoader } = await import('../utils/artifact-loader.js');
    const mockLoader = ArtifactLoader as unknown as Mock;
    mockLoader.mockImplementation(() => ({
      loadArtifact: vi
        .fn()
        .mockRejectedValue(new Error('Detailed error message')),
    }));

    const { lastFrame } = render(<Ready artifactId="T.1.1" verbose={true} />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(lastFrame()).toContain('Failed to mark T.1.1 as ready');
    expect(lastFrame()).toContain('Error details: Detailed error message');
  });
});
