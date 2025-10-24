import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroSection } from './hero-section';

describe('HeroSection', () => {
  it('renders the H1 heading with correct text', () => {
    render(<HeroSection />);

    // Find the H1 element
    const heading = screen.getByRole('heading', { level: 1 });

    // Check that the heading exists
    expect(heading).toBeTruthy();

    // Check the heading text content
    expect(heading.textContent).toBe('Stop explaining context.Start Building.');
  });
});
