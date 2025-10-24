import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import Home from './page';

interface MockImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  [key: string]: unknown;
}

interface MockButtonProps {
  children: ReactNode;
  [key: string]: unknown;
}

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: MockImageProps) => {
    // biome-ignore lint/performance/noImgElement: This is a test mock for next/image
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock @kodebase/ui/button
vi.mock('@kodebase/ui/button', () => ({
  Button: ({ children, ...props }: MockButtonProps) => (
    <button {...props}>{children}</button>
  ),
}));

describe('Home page', () => {
  it('renders the first li with correct text about editing page.tsx', () => {
    render(<Home />);

    // Find all list items
    const listItems = screen.getAllByRole('listitem');

    // Check that we have at least one list item
    expect(listItems.length).toBeGreaterThan(0);

    // Check the first list item contains the expected text
    const firstListItem = listItems[0];
    expect(firstListItem).toBeDefined();

    if (firstListItem) {
      expect(firstListItem.textContent).toContain(
        'Get started by editing apps/docs/app/page.tsx',
      );

      // Also check that it contains the code element
      const codeElement = firstListItem.querySelector('code');
      expect(codeElement).toBeTruthy();
      expect(codeElement?.textContent).toBe('apps/docs/app/page.tsx');
    }
  });
});
