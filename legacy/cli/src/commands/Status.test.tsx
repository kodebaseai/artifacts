import type { Dirent } from 'node:fs';
import { render } from 'ink-testing-library';
import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Status } from './Status.js';

// Mock fs module to use memfs
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

// Mock ValidationEngine from @kodebase/core
const mockValidateArtifact = vi.fn();

vi.mock('@kodebase/core', async () => {
  const original = await vi.importActual('@kodebase/core');
  return {
    ...original,
    ValidationEngine: vi.fn().mockImplementation(() => ({
      validateArtifact: mockValidateArtifact,
    })),
  };
});

// Mock ArtifactLoader
const mockLoadArtifact = vi.fn();
const mockGetArtifactPath = vi.fn();

vi.mock('../utils/artifact-loader.js', () => ({
  ArtifactLoader: vi.fn().mockImplementation(() => ({
    loadArtifact: mockLoadArtifact,
    getArtifactPath: mockGetArtifactPath,
  })),
}));

const mockFs = vi.mocked(await import('node:fs/promises'));

describe('Status Command', () => {
  beforeEach(() => {
    vol.reset();
    vi.clearAllMocks();

    // Reset all mocks to prevent interference between tests
    mockFs.readdir.mockReset();
    mockFs.readFile.mockReset();
    mockLoadArtifact.mockReset();
    mockGetArtifactPath.mockReset();

    // Set up default ValidationEngine mock response
    mockValidateArtifact.mockResolvedValue({
      isValid: true,
      errors: [],
      artifactId: 'D.1.3',
      artifactType: 'issue',
    });

    // Set up default ArtifactLoader mock response
    const sampleArtifactObject = {
      metadata: {
        title: 'Test Issue',
        priority: 'high',
        estimation: 'S',
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
            timestamp: '2025-01-01T10:00:00Z',
            actor: 'Test User (test@example.com)',
            trigger: 'artifact_created',
          },
          {
            event: 'ready',
            timestamp: '2025-01-01T11:00:00Z',
            actor: 'Test User (test@example.com)',
            trigger: 'dependencies_met',
          },
        ],
      },
      content: {
        summary: 'Test issue summary',
        problem_statement: 'Test problem statement',
        acceptance_criteria: ['Test criterion 1', 'Test criterion 2'],
        deliverables: ['Test deliverable 1'],
        technical_notes: 'Test technical notes',
        validation: ['Test validation 1'],
      },
      notes: 'Test implementation approach',
    };

    mockLoadArtifact.mockResolvedValue(sampleArtifactObject);
    mockGetArtifactPath.mockResolvedValue('/path/to/D.1.3.yml');
  });

  const sampleArtifact = `metadata:
  title: Test Issue
  priority: high
  estimation: S
  created_by: Test User (test@example.com)
  assignee: Test User (test@example.com)
  schema_version: 0.2.0
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event: draft
      timestamp: 2025-01-01T10:00:00Z
      actor: Test User (test@example.com)
      trigger: artifact_created
    - event: ready
      timestamp: 2025-01-01T11:00:00Z
      actor: Test User (test@example.com)
      trigger: dependencies_met

content:
  summary: Test issue summary
  problem_statement: Test problem statement
  acceptance_criteria:
    - Test criterion 1
    - Test criterion 2
  deliverables:
    - Test deliverable 1
  technical_notes: Test technical notes
  validation:
    - Test validation 1

notes: Test implementation approach`;

  it('should display artifact information in formatted output', async () => {
    // Mock file system structure
    mockFs.readdir
      .mockResolvedValueOnce(['D.alpha-cli-development'] as unknown as Dirent[]) // Root folders
      .mockResolvedValueOnce([
        'D.1.cli-foundation-and-core-commands',
      ] as unknown as Dirent[]) // Milestone folders
      .mockResolvedValueOnce([
        'D.1.3.implement-kodebase-status-command.yml',
      ] as unknown as Dirent[]); // Issue files

    mockFs.readFile.mockResolvedValueOnce(sampleArtifact);

    const { lastFrame } = render(
      <Status artifactId="D.1.3" format="formatted" />,
    );

    // Wait for async loading
    await new Promise((resolve) => setTimeout(resolve, 100));

    const output = lastFrame();

    expect(output).toContain('D.1.3: Test Issue');
    expect(output).toContain('Status:');
    expect(output).toContain('Ready');
    expect(output).toContain('Priority:');
    expect(output).toContain('high');
    expect(output).toContain('Size:');
    expect(output).toContain('S');
    expect(output).toContain('Assignee:');
    expect(output).toContain('Test User (test@example.com)');
    expect(output).toContain('Recent Events:');
  });

  it('should display JSON output when format is json', async () => {
    // Mock file system structure
    mockFs.readdir
      .mockResolvedValueOnce(['D.alpha-cli-development'] as unknown as Dirent[])
      .mockResolvedValueOnce([
        'D.1.cli-foundation-and-core-commands',
      ] as unknown as Dirent[])
      .mockResolvedValueOnce([
        'D.1.3.implement-kodebase-status-command.yml',
      ] as unknown as Dirent[]);

    mockFs.readFile.mockResolvedValueOnce(sampleArtifact);

    const { lastFrame } = render(<Status artifactId="D.1.3" format="json" />);

    // Wait for async loading
    await new Promise((resolve) => setTimeout(resolve, 100));

    const output = lastFrame();

    expect(output).toContain('"id": "D.1.3"');
    expect(output).toContain('"title": "Test Issue"');
    expect(output).toContain('"status": "ready"');
    expect(output).toContain('"priority": "high"');
    expect(output).toContain('"estimation": "S"');
  });

  it('should handle non-existent artifact gracefully', async () => {
    // Mock ArtifactLoader to throw an error for non-existent artifacts
    mockLoadArtifact.mockRejectedValueOnce(
      new Error('Initiative folder not found for ID: NONEXISTENT'),
    );

    const { lastFrame } = render(
      <Status artifactId="NONEXISTENT" format="formatted" />,
    );

    // Wait for async loading
    await new Promise((resolve) => setTimeout(resolve, 100));

    const output = lastFrame();

    expect(output).toContain('✗');
    expect(output).toContain('Initiative folder not found');
    expect(output).toContain('Make sure the artifact ID is correct');
  });

  it('should show loading state initially', () => {
    // Don't mock anything, so it stays in loading state
    const { lastFrame } = render(
      <Status artifactId="D.1.3" format="formatted" />,
    );

    const output = lastFrame();
    expect(output).toContain('Loading artifact D.1.3...');
  });

  // TODO: Fix relationships test - mocking issue with multiple calls
  it.skip('should handle relationships properly', async () => {
    const artifactWithRelationships = sampleArtifact.replace(
      'blocks: []\n    blocked_by: []',
      'blocks: [A.1.1, A.1.2]\n    blocked_by: [D.1.1]',
    );

    // Clear all mocks first
    vi.clearAllMocks();

    mockFs.readdir
      .mockResolvedValueOnce(['D.alpha-cli-development'] as unknown as Dirent[])
      .mockResolvedValueOnce([
        'D.1.cli-foundation-and-core-commands',
      ] as unknown as Dirent[])
      .mockResolvedValueOnce([
        'D.1.3.implement-kodebase-status-command.yml',
      ] as unknown as Dirent[]);

    mockFs.readFile.mockResolvedValueOnce(artifactWithRelationships);

    const { lastFrame } = render(
      <Status artifactId="D.1.3" format="formatted" />,
    );

    // Wait for async loading
    await new Promise((resolve) => setTimeout(resolve, 100));

    const output = lastFrame();

    expect(output).toContain('Blocks:');
    expect(output).toContain('A.1.1');
    expect(output).toContain('A.1.2');
    expect(output).toContain('Blocked by:');
    expect(output).toContain('D.1.1');
  });

  // I.1.5 Enhanced Features Tests
  describe('I.1.5 Enhanced Features', () => {
    it('should show validation results when checkParent is true', async () => {
      const { lastFrame } = render(
        <Status artifactId="D.1.3" format="formatted" checkParent={true} />,
      );

      // Wait for async loading
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame();

      expect(output).toContain('Validation:');
      expect(output).toContain('✓ Valid');
    });

    it('should show parent blocking warnings when checkParent is true and artifact is blocked', async () => {
      // Set up blocked artifact mock
      const blockedArtifactObject = {
        metadata: {
          title: 'Test Issue',
          priority: 'high',
          estimation: 'S',
          created_by: 'Test User (test@example.com)',
          assignee: 'Test User (test@example.com)',
          schema_version: '0.2.0',
          relationships: {
            blocks: [],
            blocked_by: ['A.1.1', 'A.1.2'],
          },
          events: [
            {
              event: 'draft',
              timestamp: '2025-01-01T10:00:00Z',
              actor: 'Test User (test@example.com)',
              trigger: 'artifact_created',
            },
          ],
        },
        content: {
          summary: 'Test issue summary',
          acceptance_criteria: ['Test criterion 1'],
        },
      };

      mockLoadArtifact.mockResolvedValueOnce(blockedArtifactObject);

      const { lastFrame } = render(
        <Status artifactId="D.1.3" format="formatted" checkParent={true} />,
      );

      // Wait for async loading
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame();

      expect(output).toContain('⚠️ Parent Blocking Warning');
      expect(output).toContain('blocked by: A.1.1, A.1.2');
    });

    it('should show experimental data when experimental flag is true', async () => {
      // Set up artifact with dependencies for experimental data
      const artifactWithDependencies = {
        metadata: {
          title: 'Test Issue',
          priority: 'high',
          estimation: 'S',
          created_by: 'Test User (test@example.com)',
          assignee: 'Test User (test@example.com)',
          schema_version: '0.2.0',
          relationships: {
            blocks: [],
            blocked_by: ['A.1.1', 'A.1.2'],
          },
          events: [
            {
              event: 'draft',
              timestamp: '2025-01-01T10:00:00Z',
              actor: 'Test User (test@example.com)',
              trigger: 'artifact_created',
            },
          ],
        },
        content: {
          summary: 'Test issue summary',
          acceptance_criteria: ['Test criterion 1'],
        },
      };

      mockLoadArtifact.mockResolvedValueOnce(artifactWithDependencies);

      const { lastFrame } = render(
        <Status artifactId="D.1.3" format="formatted" experimental={true} />,
      );

      // Wait for async loading
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame();

      expect(output).toContain('🧪 Experimental Data');
      expect(output).toContain('Dependencies (2)');
      expect(output).toContain('• A.1.1 (resolved)');
      expect(output).toContain('• A.1.2 (resolved)');
      expect(output).toContain('Cascade Preview:');
    });

    it('should include enhanced data in JSON output', async () => {
      // Set up artifact for JSON test
      const jsonTestArtifact = {
        metadata: {
          title: 'Test Issue',
          priority: 'high',
          estimation: 'S',
          created_by: 'Test User (test@example.com)',
          assignee: 'Test User (test@example.com)',
          schema_version: '0.2.0',
          relationships: {
            blocks: [],
            blocked_by: ['A.1.1', 'A.1.2'],
          },
          events: [
            {
              event: 'draft',
              timestamp: '2025-01-01T10:00:00Z',
              actor: 'Test User (test@example.com)',
              trigger: 'artifact_created',
            },
          ],
        },
        content: {
          summary: 'Test issue summary',
          acceptance_criteria: ['Test criterion 1'],
        },
      };

      mockLoadArtifact.mockResolvedValueOnce(jsonTestArtifact);

      const { lastFrame } = render(
        <Status
          artifactId="D.1.3"
          format="json"
          checkParent={true}
          experimental={true}
        />,
      );

      // Wait for async loading
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame();

      expect(output).toContain('"validation":');
      expect(output).toContain('"isValid": true');
      expect(output).toContain('"parentBlocking":');
      expect(output).toContain('"isBlocked": true');
      expect(output).toContain('"experimental":');
      expect(output).toContain('"dependencies":');
      expect(output).toContain('"cascadePreview":');
    });
  });
});
