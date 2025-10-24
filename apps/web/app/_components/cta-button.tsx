"use client";

import Script from "next/script";
import React, { type JSX, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AnalyticsCategories,
  AnalyticsEvents,
  analytics,
} from "../../components/analytics";

// Tally form configuration
const TALLY_FORM_ID = process.env.NEXT_PUBLIC_TALLY_FORM_ID || "wg6YBD";
const _TALLY_FORM_URL =
  process.env.NEXT_PUBLIC_TALLY_FORM_URL ||
  `https://tally.so/r/${TALLY_FORM_ID}`;

declare global {
  interface Window {
    Tally?: {
      openPopup: (
        formId: string,
        options?: {
          width?: number;
          autoClose?: number;
          onSubmit?: () => void;
          onClose?: () => void;
        },
      ) => void;
      closePopup: (formId: string) => void;
    };
  }
}

interface CTAButtonProps {
  onSubmit: () => void;
  onShowOverlay?: (show: boolean) => void;
}

export function CTAButton({
  onSubmit,
  onShowOverlay,
}: CTAButtonProps): JSX.Element {
  const [tallyLoaded, setTallyLoaded] = useState(false);

  const openTallyModal = useCallback(() => {
    // Track analytics event
    analytics.track(AnalyticsEvents.CTA_CLICK, {
      event_category: AnalyticsCategories.ENGAGEMENT,
      event_label: "waitlist_signup_start",
      method: "tally_modal",
    });

    // Show overlay
    onShowOverlay?.(true);

    // Use Tally's native popup
    if (window.Tally && tallyLoaded) {
      window.Tally.openPopup(TALLY_FORM_ID, {
        width: 600,
        autoClose: 3000, // Auto close 3 seconds after submission
        onSubmit: () => {
          onSubmit();
          onShowOverlay?.(false);

          // Track completion
          analytics.track(AnalyticsEvents.CTA_SUBMIT, {
            event_category: AnalyticsCategories.ENGAGEMENT,
            event_label: "waitlist_signup_complete",
            method: "tally_modal",
          });
        },
        onClose: () => {
          onShowOverlay?.(false);
        },
      });
    }
  }, [tallyLoaded, onSubmit, onShowOverlay]);

  return (
    <>
      <Script
        src="https://tally.so/widgets/embed.js"
        strategy="lazyOnload"
        onLoad={() => setTallyLoaded(true)}
      />
      <Button
        size="lg"
        variant="secondary"
        className="z-1 h-12 md:h-16 px-6 md:px-12 bg-linear-to-tr hover:bg-linear-to-br from-kb-purple to-kb-teal text-black will-change-transform transition-all hover:scale-105"
        onClick={openTallyModal}
        disabled={!tallyLoaded}
      >
        {!tallyLoaded ? "Loading..." : "Join the Waitlist"}
      </Button>
    </>
  );
}
