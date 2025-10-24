import { ArrowRight, BookOpen, Users } from "lucide-react";
import { type JSX, useId } from "react";
import { CTAContent } from "./cta-content";

export function CTASection(): JSX.Element {
  return (
    <section id={useId()} className="relative">
      {/* Background Grid*/}
      <div className="absolute -bottom-20 left-0 w-screen h-full overflow-hidden">
        <div className="grid-background" />
      </div>

      <div className="max-w-screen-xl px-base mx-auto flex flex-col items-center min-h-screen justify-center gap-base">
        <div className="flex flex-col items-center gap-6 text-center max-w-3xl">
          {/* Main headline */}
          <h2 className="z-1 font-display text-4xl md:text-5xl lg:text-6xl font-semibold">
            Your Codebase is Your Knowledge Base
          </h2>

          {/* Value proposition */}
          <p className="z-1 text-lg md:text-xl text-muted-foreground max-w-2xl">
            Join thousands of developers who are transforming their development
            workflow with Kodebase. Get early access and shape the future of
            software development.
          </p>

          {/* Benefit statements */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 mb-12 w-full max-w-2xl">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-kb-purple/10 flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-kb-purple" />
              </div>
              <p className="text-sm font-medium">Structured Development</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-kb-teal/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-kb-teal" />
              </div>
              <p className="text-sm font-medium">AI-Human Collaboration</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-kb-yellow/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-kb-yellow" />
              </div>
              <p className="text-sm font-medium">Living Documentation</p>
            </div>
          </div>

          {/* Social proof */}
          <p className="z-1 text-sm text-muted-foreground">
            <span className="font-semibold">500+</span> developers already
            signed up for early access
          </p>
        </div>

        {/* Primary CTA - Client Component */}
        <CTAContent />

        {/* Secondary CTAs */}
        <div className="flex gap-6 mt-8 text-sm">
          <a
            href="https://docs.kodebase.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="z-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            Documentation
          </a>
          <a
            href="https://blog.kodebase.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="z-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            Blog
          </a>
          <a
            href="https://twitter.com/kodebaseai"
            target="_blank"
            rel="noopener noreferrer"
            className="z-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            Twitter
          </a>
        </div>
      </div>
    </section>
  );
}
