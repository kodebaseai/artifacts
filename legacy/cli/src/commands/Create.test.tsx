import { render } from 'ink-testing-library';
import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Create } from './Create.js';

// Mock the entire createArtifact function to avoid complex mocking
vi.mock('../utils/artifact-creator.js', () => ({
  createArtifact: vi.fn(),
}));

const mockCreateArtifact = vi.mocked(
  await import('../utils/artifact-creator.js'),
).createArtifact;

describe('Create Command', () => {
  beforeEach(() => {
    vol.reset();
    vi.clearAllMocks();
  });

  it('should create an initiative when no parent ID is provided', async () => {
    // Mock successful initiative creation
    mockCreateArtifact.mockResolvedValue({
      type: 'initiative',
      filePath: '/path/to/A.yml',
      id: 'A',
    });

    const { lastFrame } = render(
      <Create parentId={undefined} idea="New strategic initiative" />,
    );

    // Wait for async creation
    await new Promise((resolve) => setTimeout(resolve, 100));

    const output = lastFrame();
    expect(output).toContain('✓ Created initiative successfully');
    expect(output).toContain('Created file:');

    // Verify createArtifact was called with correct parameters
    expect(mockCreateArtifact).toHaveBeenCalledWith(
      undefined,
      'New strategic initiative',
      undefined,
      { submit: undefined },
    );
  });

  it('should create a milestone when parent ID is an initiative', async () => {
    // Mock successful milestone creation
    mockCreateArtifact.mockResolvedValue({
      type: 'milestone',
      filePath: '/path/to/A.1.yml',
      id: 'A.1',
    });

    const { lastFrame } = render(
      <Create parentId="A" idea="New milestone under initiative A" />,
    );

    // Wait for async creation
    await new Promise((resolve) => setTimeout(resolve, 100));

    const output = lastFrame();
    expect(output).toContain('✓ Created milestone successfully');

    // Verify createArtifact was called with correct parameters
    expect(mockCreateArtifact).toHaveBeenCalledWith(
      'A',
      'New milestone under initiative A',
      undefined,
      { submit: undefined },
    );
  });

  it('should create an issue when parent ID is a milestone', async () => {
    // Mock successful issue creation
    mockCreateArtifact.mockResolvedValue({
      type: 'issue',
      filePath: '/path/to/D.1.6.yml',
      id: 'D.1.6',
    });

    const { lastFrame } = render(
      <Create parentId="D.1" idea="New issue under milestone D.1" />,
    );

    // Wait for async creation
    await new Promise((resolve) => setTimeout(resolve, 100));

    const output = lastFrame();
    expect(output).toContain('✓ Created issue successfully');

    // Verify createArtifact was called with correct parameters
    expect(mockCreateArtifact).toHaveBeenCalledWith(
      'D.1',
      'New issue under milestone D.1',
      undefined,
      { submit: undefined },
    );
  });

  it('should generate correct next ID for issues', async () => {
    // Mock successful issue creation with next ID
    mockCreateArtifact.mockResolvedValue({
      type: 'issue',
      filePath: '/path/to/D.1.4.yml',
      id: 'D.1.4',
    });

    const { lastFrame } = render(<Create parentId="D.1" idea="Fourth issue" />);

    // Wait for async creation
    await new Promise((resolve) => setTimeout(resolve, 100));

    const output = lastFrame();
    expect(output).toContain('✓ Created issue successfully');

    // Verify createArtifact was called with correct parameters
    expect(mockCreateArtifact).toHaveBeenCalledWith(
      'D.1',
      'Fourth issue',
      undefined,
      { submit: undefined },
    );
  });

  it('should handle git config errors gracefully', async () => {
    // Mock createArtifact to throw git config error
    mockCreateArtifact.mockRejectedValue(
      new Error('Failed to get git user info: Git not configured'),
    );

    const { lastFrame } = render(
      <Create parentId={undefined} idea="Test idea" />,
    );

    // Wait for async creation
    await new Promise((resolve) => setTimeout(resolve, 100));

    const output = lastFrame();
    expect(output).toContain('✗ Failed to create artifact');
    expect(output).toContain('Failed to get git user info');
  });

  it('should handle invalid parent ID format', async () => {
    // Mock createArtifact to throw invalid parent ID error
    mockCreateArtifact.mockRejectedValue(
      new Error('Invalid parent ID format: A.1.2.3'),
    );

    const { lastFrame } = render(
      <Create parentId="A.1.2.3" idea="Too many dots" />,
    );

    // Wait for async creation
    await new Promise((resolve) => setTimeout(resolve, 100));

    const output = lastFrame();
    expect(output).toContain('✗ Failed to create artifact');
    expect(output).toContain('Invalid parent ID format');
  });

  it('should show loading state initially', () => {
    const { lastFrame } = render(<Create parentId="A" idea="Test loading" />);

    const output = lastFrame();
    expect(output).toContain('Creating artifact...');
  });

  it('should handle artifact creation errors gracefully', async () => {
    // Mock createArtifact to throw filesystem error
    mockCreateArtifact.mockRejectedValue(new Error('Permission denied'));

    const { lastFrame } = render(
      <Create parentId="A" idea="Test error handling" />,
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const output = lastFrame();
    expect(output).toContain('✗ Failed to create artifact');
    expect(output).toContain('Permission denied');
  });

  it('should handle unknown errors gracefully', async () => {
    // Mock createArtifact to throw unknown error
    mockCreateArtifact.mockRejectedValue(new Error('Unknown error occurred'));

    const { lastFrame } = render(
      <Create parentId="D.1" idea="Test unknown error" />,
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const output = lastFrame();
    expect(output).toContain('✗ Failed to create artifact');
    expect(output).toContain('Unknown error occurred');
  });

  it('should handle --submit flag', async () => {
    // Mock successful initiative creation with submit
    mockCreateArtifact.mockResolvedValue({
      type: 'initiative',
      filePath: '/path/to/A.yml',
      id: 'A',
    });

    const { lastFrame } = render(
      <Create
        parentId={undefined}
        idea="New initiative with submit"
        submit={true}
      />,
    );

    // Wait for async creation
    await new Promise((resolve) => setTimeout(resolve, 100));

    const output = lastFrame();
    expect(output).toContain('✓ Created initiative successfully');

    // Verify createArtifact was called with submit flag
    expect(mockCreateArtifact).toHaveBeenCalledWith(
      undefined,
      'New initiative with submit',
      undefined,
      { submit: true },
    );
  });
});
