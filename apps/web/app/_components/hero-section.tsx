import type { JSX } from 'react';
import LaptopScreen from '@/components/device-screens/laptop';
import { Button } from '@/components/ui/button';
import {
  AnalyticsCategories,
  AnalyticsEvents,
} from '../../components/analytics';
import { AnalyticsLink } from '../../components/analytics-link';

export function HeroSection(): JSX.Element {
  return (
    <section
      id="hero"
      className="relative grid place-items-center pt-section-gap"
    >
      {/* Background Grid*/}
      <div className="absolute -top-20 left-0 w-screen h-full overflow-hidden">
        <div className="grid-background" />
      </div>

      <div className="w-full max-w-screen-xl mx-auto px-base">
        {/* Laptop Screen */}
        <div className="relative z-1 w-full h-full flex items-end">
          <div className="w-full h-full max-w-screen-xl mx-auto">
            <LaptopScreen />
          </div>
        </div>

        <div className="relative z-3 bottom-12 mb-12 flex flex-col md:flex-row items-center md:items-end justify-between gap-16 lg:gap-0 max-w-screen-xl mx-auto">
          {/* Title */}
          <h1 className="font-display text-center md:text-left leading-none flex flex-col gap-2 md:gap-0 pt-12 md:pt-2">
            <span className="text-lg lg:text-2xl text-white/42 font-normal">
              Stop explaining context.
            </span>
            <span className="text-[3rem] lg:text-[4rem] font-bold">
              Start Building.
            </span>
          </h1>

          {/* CTA */}
          <div className="flex flex-col md:flex-row items-center gap-8 lg:gap-base">
            <h2 className="text-sm font-light">Join our alpha</h2>
            <AnalyticsLink
              href="#cta"
              eventName={AnalyticsEvents.CTA_CLICK}
              eventProperties={{
                event_category: AnalyticsCategories.ENGAGEMENT,
                event_label: 'hero_cta',
                source: 'hero_section',
              }}
            >
              <Button size={'lg'} variant="secondary">
                Request early access
              </Button>
            </AnalyticsLink>
          </div>
        </div>
      </div>

      {/* Gradient Transition */}
      <div className="absolute z-2 bottom-0 left-0 w-screen h-[24rem] bg-gradient-to-t from-black/100 via-black/64 via-48% to-transparent pointer-events-none" />
    </section>
  );
}
