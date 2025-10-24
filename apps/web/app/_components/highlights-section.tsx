"use client";

import Image from "next/image";
import type { JSX } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

const class480 =
  "max-w-[calc(100vw-var(--spacing-base)*2)] md:max-w-[20rem] lg:max-w-[30rem]";
const class640 =
  "max-w-[calc(100vw-var(--spacing-base)*2)] md:max-w-[30rem] lg:max-w-[40rem]";

const highlights = [
  {
    title: "Instant git-powered project hub",
    description:
      "Connect your GitHub repo in seconds and watch Kodebase transform it into a living project workspace—no servers, no migrations.",
    width: class640,
    image: "/assets/images/640-480-highlight.png",
  },
  {
    title: "Always-up-to-date status visibility",
    description:
      "Every commit automatically updates Initiatives, Milestones, and Issues so you know what’s drafting, in progress, or ready for review at a glance.",
    width: class480,
    image: "/assets/images/480-480-highlight.png",
  },
  {
    title: "Automation that gives you time back",
    description:
      "One-command scripts and smart Git hooks handle branching, PR creation, status changes, and cleanup—freeing you to focus on shipping.",
    width: class640,
    image: "/assets/images/640-480-highlight.png",
  },
  {
    title: "Built-in guardrails for quality",
    description:
      "Schema validation and dependency tracking catch mis-steps early and keep work unblocked, reducing review churn and last-minute surprises.",
    width: class480,
    image: "/assets/images/480-480-highlight.png",
  },
  {
    title: "AI-accelerated productivity",
    description:
      "Kodebase’s context engine feeds the right artifacts, docs, and code snippets to your AI assistants, turning them into true pair-programmers.",
    width: class640,
    image: "/assets/images/640-480-highlight.png",
  },
  {
    title: "Real-time performance insights",
    description:
      "Velocity, throughput, and lead-time charts appear automatically—no plug-ins or config—helping teams improve sprint over sprint.",
    width: class640,
    image: "/assets/images/640-480-highlight.png",
  },
  {
    title: "Effortless collaboration workflow",
    description:
      "Event logs capture every decision with actor and timestamp details, creating a single source of truth that keeps everyone aligned.",
    width: class480,
    image: "/assets/images/480-480-highlight.png",
  },
  {
    title: "Developer happiness, baked-in",
    description:
      "Opinionated yet flexible Methodology v2.0 minimizes ceremony, embraces your existing Git habits, and scales with team size and complexity.",
    width: class640,
    image: "/assets/images/640-480-highlight.png",
  },
];

export function HighlightsSection(): JSX.Element {
  return (
    <section id="highlights" className="flex flex-col gap-16">
      <Carousel
        opts={{
          align: "center",
        }}
        className="w-full flex flex-col gap-base"
      >
        <div className="flex justify-between items-end w-full max-w-screen-xl mx-auto px-base">
          <div className="max-w-[90%] md:max-w-[820px]">
            <h2 className="text-teal-300 text-sm md:text-md font-semibold leading-none mb-2">
              Highlights
            </h2>
            <p className="text-lg md:text-2xl font-light leading-normal">
              Kodebase turns scattered documentation, endless context switching,
              and chaotic project management into structured artifacts, clear
              workflows, and a unified development experience—so teams can build
              faster, without losing track of what matters.
            </p>
          </div>
          <div className="hidden md:flex gap-4 items-center">
            <CarouselPrevious className="relative left-0" />
            <CarouselNext className="relative right-0" />
          </div>
        </div>

        <CarouselContent className="ml-[max(var(--spacing-base),calc(50vw-640px))] mr-[max(var(--spacing-base),calc(50vw-640px))]">
          {highlights.map(({ title, description, width, image }, index) => (
            <CarouselItem
              key={title}
              className={cn(
                "overflow-hidden flex flex-col gap-4",
                index === 0 && "pl-0 md:pl-base",
                index === highlights.length - 1 && "pr-0 md:pr-base",
              )}
            >
              <Card
                className={cn(
                  "aspect-square md:h-[20rem] lg:h-[30rem] w-full p-0 overflow-hidden",
                  width,
                )}
              >
                <CardContent
                  className={
                    "flex items-center justify-center w-full px-0 py-0 h-full md:h-auto "
                  }
                >
                  <Image
                    src={image}
                    alt={title}
                    width={640}
                    height={480}
                    className="object-cover border-none scale-105 h-full w-auto object-left md:object-center md:w-full md:h-atuo"
                  />
                </CardContent>
              </Card>
              <div className={cn("flex flex-col gap-2", width)}>
                <h3 className="text-lg md:text-xl font-normal text-white/64">
                  {title}
                </h3>
                <p className="text-xs md:text-sm font-light text-white/42">
                  {description}
                </p>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
