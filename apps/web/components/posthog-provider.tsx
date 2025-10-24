'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { FeatureFlagsProvider } from './feature-flags';

export function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [_isPostHogReady, setIsPostHogReady] = useState(false);

  useEffect(() => {
    // Only initialize on the client side
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: '/ingest',
        ui_host: 'https://eu.posthog.com',
        capture_pageleave: false, // Disable automatic page leave tracking
        capture_exceptions: true,
        debug: process.env.NODE_ENV === 'development',
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('PostHog loaded', posthog);
            posthog.debug();
          }
          setIsPostHogReady(true);
        },
      });
    } else {
      // If no PostHog key, still mark as ready
      setIsPostHogReady(true);
    }
  }, []);

  // Always provide FeatureFlagsProvider to avoid context errors
  return (
    <PHProvider client={posthog}>
      <FeatureFlagsProvider>{children}</FeatureFlagsProvider>
    </PHProvider>
  );
}
