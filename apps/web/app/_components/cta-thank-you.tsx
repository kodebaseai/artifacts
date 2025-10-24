'use client';

import { BookOpen, CheckCircle, GitBranch } from 'lucide-react';
import type { JSX } from 'react';
import { Button } from '@/components/ui/button';
import {
  AnalyticsCategories,
  AnalyticsEvents,
  analytics,
} from '../../components/analytics';

export function CTAThankYou(): JSX.Element {
  return (
    <section id="cta" className="relative">
      <div className="absolute -bottom-20 left-0 w-screen h-full overflow-hidden">
        <div className="grid-background" />
      </div>

      <div className="max-w-screen-xl px-base mx-auto flex flex-col items-center min-h-screen justify-center gap-base">
        <div className="flex flex-col items-center gap-6 text-center max-w-2xl">
          <CheckCircle className="w-16 h-16 text-kb-teal" />
          <h2 className="z-1 font-display text-4xl md:text-5xl font-semibold">
            You're on the list!
          </h2>
          <p className="z-1 text-lg md:text-xl text-muted-foreground">
            Thank you for joining our early access program. We'll be in touch
            soon with updates and exclusive access to Kodebase.
          </p>

          {/* Secondary CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Button
              variant="outline"
              size="lg"
              className="z-1"
              onClick={() => {
                analytics.track(AnalyticsEvents.DOCUMENTATION_CLICK, {
                  event_category: AnalyticsCategories.ENGAGEMENT,
                  source: 'cta_thank_you',
                });
                window.open('https://docs.kodebase.ai', '_blank');
              }}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Read Documentation
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="z-1"
              onClick={() => {
                analytics.track(AnalyticsEvents.GITHUB_CLICK, {
                  event_category: AnalyticsCategories.ENGAGEMENT,
                  source: 'cta_thank_you',
                });
                window.open('https://github.com/kodebaseai', '_blank');
              }}
            >
              <GitBranch className="mr-2 h-4 w-4" />
              Follow us on GitHub
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
