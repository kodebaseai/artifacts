'use client';

import { type JSX, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AnalyticsCategories,
  AnalyticsEvents,
  analytics,
} from '../../components/analytics';

interface EmailCaptureFormProps {
  onSubmit: () => void;
}

export function EmailCaptureForm({
  onSubmit,
}: EmailCaptureFormProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Track analytics
    analytics.track(AnalyticsEvents.CTA_SUBMIT, {
      event_category: AnalyticsCategories.ENGAGEMENT,
      event_label: 'email_capture',
      method: 'internal_form',
    });

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 w-full max-w-md mx-auto"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email for early access"
        className="px-4 py-3 border border-white/20 bg-white/5 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-kb-purple"
        required
      />
      <Button
        type="submit"
        size="lg"
        variant="secondary"
        className="h-12 md:h-16 px-6 md:px-12 bg-linear-to-tr hover:bg-linear-to-br from-kb-purple to-kb-teal text-black will-change-transform transition-all hover:scale-105"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Join the Waitlist'}
      </Button>
    </form>
  );
}
