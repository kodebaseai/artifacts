'use client';

import type { ComponentProps, JSX, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { analytics } from './analytics';

interface AnalyticsButtonProps extends ComponentProps<typeof Button> {
  children: ReactNode;
  eventName: string;
  eventProperties?: Record<string, unknown>;
}

/**
 * A Button component that tracks analytics events on click
 * Keeps parent components as server components while adding client-side analytics
 */
export function AnalyticsButton({
  children,
  eventName,
  eventProperties,
  onClick,
  ...buttonProps
}: AnalyticsButtonProps): JSX.Element {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Track the analytics event
    analytics.track(eventName, eventProperties);

    // Call any existing onClick handler
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Button {...buttonProps} onClick={handleClick}>
      {children}
    </Button>
  );
}
