import type { JSX } from "react";
import { CTASection } from "./_components/cta-section";
import { HeroSection } from "./_components/hero-section";
import { HighlightsSection } from "./_components/highlights-section";
import { MethodologySection } from "./_components/methodology-section";
import { ProblemSection } from "./_components/problem-section";
import { SolutionSection } from "./_components/solution-section";
import { VisionSection } from "./_components/vision-section";

export default function Home(): JSX.Element {
  return (
    <main className="flex flex-col gap-section-gap">
      <HeroSection />
      <HighlightsSection />
      <ProblemSection />
      <SolutionSection />
      <MethodologySection />
      <VisionSection />
      <CTASection />
    </main>
  );
}
