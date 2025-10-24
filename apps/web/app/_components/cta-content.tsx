'use client';

import { type JSX, useState } from 'react';
import { FeatureFlags, useFeatureFlags } from '../../components/feature-flags';
import { CTAButton } from './cta-button';
import { CTAThankYou } from './cta-thank-you';
import { EmailCaptureForm } from './email-capture-form';

export function CTAContent(): JSX.Element {
  const [showOverlay, setShowOverlay] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { isEnabled } = useFeatureFlags();
  const useTally = isEnabled(FeatureFlags.USE_TALLY);

  // Show thank you state if submitted
  if (isSubmitted) {
    return <CTAThankYou />;
  }

  return (
    <>
      {/* Blur Overlay for modal mode (only shown when Tally is enabled) */}
      {showOverlay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 transition-all duration-300"></div>
      )}

      {/* Primary CTA - Shows Tally button when enabled, Email capture form when disabled */}
      {useTally ? (
        <CTAButton
          onSubmit={() => setIsSubmitted(true)}
          onShowOverlay={setShowOverlay}
        />
      ) : (
        <EmailCaptureForm onSubmit={() => setIsSubmitted(true)} />
      )}
    </>
  );
}
