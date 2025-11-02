import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import { WelcomeStep } from './WelcomeStep.js';

describe('WelcomeStep', () => {
  it('should render welcome message', () => {
    const onNext = vi.fn();
    const { lastFrame } = render(<WelcomeStep onNext={onNext} />);

    const frame = lastFrame();
    expect(frame).toContain('Welcome to Kodebase!');
    expect(frame).toContain('setup wizard');
  });

  it('should display setup overview', () => {
    const onNext = vi.fn();
    const { lastFrame } = render(<WelcomeStep onNext={onNext} />);

    const frame = lastFrame();
    expect(frame).toContain('Git identity for artifact tracking');
    expect(frame).toContain('Shell completion for better CLI experience');
    expect(frame).toContain('Default preferences for your workflow');
    expect(frame).toContain('Optional interactive tutorial');
  });

  it('should call onNext when Enter is pressed', async () => {
    const onNext = vi.fn();
    const { stdin } = render(<WelcomeStep onNext={onNext} />);

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('\r'); // Press Enter

    await vi.waitFor(() => {
      expect(onNext).toHaveBeenCalledOnce();
    });
  });

  it('should display correct key prompt', () => {
    const onNext = vi.fn();
    const { lastFrame } = render(<WelcomeStep onNext={onNext} />);

    const frame = lastFrame();
    expect(frame).toContain('Press');
    expect(frame).toContain('Enter');
    expect(frame).toContain('to begin setup');
  });

  it('should handle multiple Enter presses gracefully', async () => {
    const onNext = vi.fn();
    const { stdin } = render(<WelcomeStep onNext={onNext} />);

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('\r'); // Press Enter

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(onNext).toHaveBeenCalledOnce();

    stdin.write('\r'); // Press Enter again
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should still only be called once
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('should ignore non-Enter key presses', () => {
    const onNext = vi.fn();
    const { stdin } = render(<WelcomeStep onNext={onNext} />);

    stdin.write('a'); // Press 'a'
    stdin.write('b'); // Press 'b'
    stdin.write(' '); // Press space

    expect(onNext).not.toHaveBeenCalled();
  });
});
