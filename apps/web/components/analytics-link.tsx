"use client";

import Link from "next/link";
import React from "react";
import type { ComponentProps, JSX } from "react";
import { analytics } from "./analytics";

interface AnalyticsLinkProps extends ComponentProps<typeof Link> {
  eventName: string;
  eventProperties?: Record<string, unknown>;
}

/**
 * A Link component that tracks analytics events on click
 * Keeps parent components as server components while adding client-side analytics
 */
export function AnalyticsLink({
  children,
  eventName,
  eventProperties,
  onClick,
  ...linkProps
}: AnalyticsLinkProps): JSX.Element {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Track the analytics event
    analytics.track(eventName, eventProperties);

    // Call any existing onClick handler
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Link {...linkProps} onClick={handleClick}>
      {children}
    </Link>
  );
}
