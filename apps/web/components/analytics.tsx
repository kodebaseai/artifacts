'use client';

import posthog from 'posthog-js';
import { useEffect } from 'react';

export type AnalyticsEvent = {
  name: string;
  properties?: Record<string, unknown>;
};

/**
 * Generic analytics tracking interface
 * Abstracts analytics providers to allow easy switching or multi-provider support
 */
export const analytics = {
  /**
   * Track a custom event
   */
  track: (eventName: string, properties?: Record<string, unknown>) => {
    // PostHog tracking
    if (typeof window !== 'undefined' && posthog) {
      posthog.capture(eventName, properties);
    }

    // Add other providers here as needed
    // e.g., Mixpanel, Amplitude, etc.
  },

  /**
   * Identify a user
   */
  identify: (userId: string, traits?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && posthog) {
      posthog.identify(userId, traits);
    }
  },

  /**
   * Track a page view
   */
  page: (_pageName?: string, properties?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && posthog) {
      posthog.capture('$pageview', {
        $current_url: window.location.href,
        ...properties,
      });
    }
  },

  /**
   * Set user properties
   */
  setUserProperties: (properties: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && posthog) {
      posthog.people.set(properties);
    }
  },

  /**
   * Reset/clear user session
   */
  reset: () => {
    if (typeof window !== 'undefined' && posthog) {
      posthog.reset();
    }
  },
};

/**
 * Hook to track page views automatically
 */
export function usePageView(pageName?: string) {
  useEffect(() => {
    analytics.page(pageName);
  }, [pageName]);
}

/**
 * Hook to track events
 */
export function useAnalytics() {
  return analytics;
}

/**
 * Common event names for consistency
 */
export const AnalyticsEvents = {
  // CTA Events
  CTA_CLICK: 'cta_click',
  CTA_SUBMIT: 'cta_submit',
  WAITLIST_SIGNUP_START: 'waitlist_signup_start',
  WAITLIST_SIGNUP_COMPLETE: 'waitlist_signup_complete',

  // Navigation Events
  NAV_CLICK: 'nav_click',
  SCROLL_TO_SECTION: 'scroll_to_section',

  // Engagement Events
  VIDEO_PLAY: 'video_play',
  VIDEO_COMPLETE: 'video_complete',
  DOCUMENTATION_CLICK: 'documentation_click',
  GITHUB_CLICK: 'github_click',

  // Form Events
  FORM_START: 'form_start',
  FORM_ABANDON: 'form_abandon',
  FORM_ERROR: 'form_error',
} as const;

/**
 * Common event properties for consistency
 */
export const AnalyticsCategories = {
  ENGAGEMENT: 'engagement',
  NAVIGATION: 'navigation',
  CONVERSION: 'conversion',
  ERROR: 'error',
} as const;
