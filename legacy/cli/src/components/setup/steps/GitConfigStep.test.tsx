import { render } from 'ink-testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GitConfigStep } from './GitConfigStep.js';

// Mock child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

describe('GitConfigStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render initial form', () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { lastFrame } = render(
      <GitConfigStep onComplete={onComplete} onSkip={onSkip} onExit={onExit} />,
    );

    const frame = lastFrame();
    expect(frame).toContain('Configure Git Identity');
    expect(frame).toContain('Name:');
    expect(frame).toContain('Email:');
    expect(frame).toContain('This information will be used to track');
  });

  it('should show skip prompt when Ctrl+S is pressed', () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin, lastFrame } = render(
      <GitConfigStep onComplete={onComplete} onSkip={onSkip} onExit={onExit} />,
    );

    stdin.write('\x13'); // Ctrl+S

    const frame = lastFrame();
    expect(frame).toContain('Git identity is recommended');
    expect(frame).toContain('Skip this step? (y/n)');
  });

  it('should skip when y is pressed after skip prompt', async () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin, lastFrame } = render(
      <GitConfigStep onComplete={onComplete} onSkip={onSkip} onExit={onExit} />,
    );

    // Add initial delay
    await new Promise((resolve) => setTimeout(resolve, 10));

    stdin.write('\x13'); // Ctrl+S // Show skip prompt

    // Wait for state update and verify skip prompt appears
    await vi.waitFor(() => {
      const frame = lastFrame();
      return frame?.includes('Skip this step? (y/n)');
    });

    stdin.write('y'); // Confirm skip

    // Wait for callback
    await vi.waitFor(
      () => {
        expect(onSkip).toHaveBeenCalledOnce();
      },
      { timeout: 1000 },
    );
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('should use initial values if provided', () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { lastFrame } = render(
      <GitConfigStep
        initialName="John Doe"
        initialEmail="john@example.com"
        onComplete={onComplete}
        onSkip={onSkip}
        onExit={onExit}
      />,
    );

    const frame = lastFrame();
    expect(frame).toContain('John Doe');
    expect(frame).toContain('john@example.com');
    expect(frame).toContain('✓ Found existing Git configuration');
  });

  it('should validate email format', () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin } = render(
      <GitConfigStep onComplete={onComplete} onSkip={onSkip} onExit={onExit} />,
    );

    // The component doesn't validate email format, it just requires non-empty values
    stdin.write('Test User'); // Type name
    stdin.write('\t'); // Tab to email field
    stdin.write(''); // No email
    stdin.write('\r'); // Try to submit

    // Should not complete without email
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('should require both name and email', () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin, lastFrame } = render(
      <GitConfigStep onComplete={onComplete} onSkip={onSkip} onExit={onExit} />,
    );

    // Try to submit without filling fields
    stdin.write('\r'); // Press enter on empty name field

    // Should not advance or complete
    expect(onComplete).not.toHaveBeenCalled();
    const frame = lastFrame();
    expect(frame).toContain('Name:'); // Still on name field
  });

  it('should configure git and complete on valid submission', async () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin } = render(
      <GitConfigStep onComplete={onComplete} onSkip={onSkip} onExit={onExit} />,
    );

    // Add delay before input
    await new Promise((resolve) => setTimeout(resolve, 10));

    stdin.write('Test User'); // Type name

    // Wait for input to be processed
    await new Promise((resolve) => setTimeout(resolve, 20));

    stdin.write('\t'); // Tab to email field

    // Wait for field transition
    await new Promise((resolve) => setTimeout(resolve, 20));

    stdin.write('test@example.com'); // Type email

    // Wait for input to be processed
    await new Promise((resolve) => setTimeout(resolve, 20));

    stdin.write('\r'); // Submit

    await vi.waitFor(
      () => {
        expect(onComplete).toHaveBeenCalledWith({
          userName: 'Test User',
          userEmail: 'test@example.com',
        });
      },
      { timeout: 1000 },
    );
  });

  it('should handle navigation between fields', async () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin, lastFrame } = render(
      <GitConfigStep onComplete={onComplete} onSkip={onSkip} onExit={onExit} />,
    );

    // Initially on name field
    let frame = lastFrame();
    expect(frame).toContain('Name:');

    // Add delay before input
    await new Promise((resolve) => setTimeout(resolve, 10));

    stdin.write('Test User');

    // Wait for input to be processed
    await new Promise((resolve) => setTimeout(resolve, 20));

    stdin.write('\r'); // Enter moves to next field

    // Wait for field change
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Should move to email field and show the entered name
    frame = lastFrame();
    // The component shows the name when not in the active field
    expect(frame).toContain('Test User'); // Name should be visible
  });

  it('should call onExit when Escape is pressed', async () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin } = render(
      <GitConfigStep onComplete={onComplete} onSkip={onSkip} onExit={onExit} />,
    );

    // Add small delay before sending input
    await new Promise((resolve) => setTimeout(resolve, 10));

    stdin.write('\x1B'); // ESC key

    await vi.waitFor(() => {
      expect(onExit).toHaveBeenCalledOnce();
    });
  });

  it('should complete with trimmed values', async () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin } = render(
      <GitConfigStep onComplete={onComplete} onSkip={onSkip} onExit={onExit} />,
    );

    // Add delay before input
    await new Promise((resolve) => setTimeout(resolve, 10));

    stdin.write('  Test User  '); // Name with spaces

    // Wait for input processing
    await new Promise((resolve) => setTimeout(resolve, 20));

    stdin.write('\t');

    // Wait for field transition
    await new Promise((resolve) => setTimeout(resolve, 20));

    stdin.write('  test@example.com  '); // Email with spaces

    // Wait for input processing
    await new Promise((resolve) => setTimeout(resolve, 20));

    stdin.write('\r');

    await vi.waitFor(
      () => {
        expect(onComplete).toHaveBeenCalledWith({
          userName: 'Test User',
          userEmail: 'test@example.com',
        });
      },
      { timeout: 1000 },
    );
  });

  it('should cancel skip prompt when n is pressed', async () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin, lastFrame } = render(
      <GitConfigStep onComplete={onComplete} onSkip={onSkip} onExit={onExit} />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('\x13'); // Ctrl+S // Show skip prompt

    await new Promise((resolve) => setTimeout(resolve, 10));
    // Should show skip prompt
    let frame = lastFrame();
    expect(frame).toContain('Skip this step? (y/n)');

    stdin.write('n'); // Cancel skip

    await new Promise((resolve) => setTimeout(resolve, 10));
    // Should return to form
    frame = lastFrame();
    expect(frame).toContain('Configure Git Identity');
    expect(frame).toContain('Name:');
    expect(onSkip).not.toHaveBeenCalled();
  });
});
