"use client";

import {
  Blocks,
  BotMessageSquare,
  Brain,
  Microscope,
  ShieldUser,
} from "lucide-react";
import type { JSX } from "react";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const tabs = [
  {
    value: "context-decay",
    bg: "bg-kb-purple",
    color: "text-kb-purple",
    icon: <Brain size={32} strokeWidth={1} />,
    title: "Context Decay",
    description:
      "Over time, critical decisions, trade-offs, and project rules slip out of view - lost in Slack threads or forgotten by departed engineers. Kodebase preserves every piece of context alongside your code in a single, version-controlled source of truth.",
    asset: "/assets/videos/Context_Decay.mp4",
  },
  {
    value: "fragmented-workflows",
    bg: "bg-kb-teal",
    color: "text-kb-teal",
    icon: <Blocks size={32} strokeWidth={1} />,
    title: "Fragmented Workflows",
    description:
      "Specs in Documentation folders. Tickets in Project Managers. Decisions in Push Request comments. Discussions in Comms. Switching among tools wastes hours and breaks your focus. Kodebase unifies all artifacts - docs, code, decisions - into one AI-accessible repo.",
    asset: "/assets/videos/Fragmented_Workflows.mp4",
  },
  {
    value: "human-agent-collaboration",
    bg: "bg-kb-orange",
    color: "text-kb-orange",
    icon: <BotMessageSquare size={32} strokeWidth={1} />,
    title: "Human-Agent Collaboration",
    description:
      "Today AI helpers churn out code but cannot coordinate with humans or enforce your project rules. Kodebase provides a shared conductor podium: humans define intent and constraints; agents execute tasks with full, real-time context.",
    asset: "/assets/videos/Human-Agent_Collaboration.mp4",
  },
  {
    value: "knowledge-distillation",
    bg: "bg-kb-lime",
    color: "text-kb-lime",
    icon: <Microscope size={32} strokeWidth={1} />,
    title: "Knowledge Distillation",
    description:
      "Raw implementation details are noisy and hard to parse for strategic insights. Kodebase Task to Milestone to Plan hierarchy automatically rolls up granular data into progressively higher-level summaries for developers, architects, and executives.",
    asset: "/assets/videos/Knowledge_Distillation.mp4",
  },
  {
    value: "trust-and-governance",
    bg: "bg-kb-fuchsia",
    color: "text-kb-fuchsia",
    icon: <ShieldUser size={32} strokeWidth={1} />,
    title: "Trust and Governance",
    description:
      "As code and AI agents modify your repo, it is easy for subtle policy violations or architectural anti-patterns to creep in. Kodebase enforces compliance and governance rules on every human or automated change, preventing shadow decisions that drift your codebase off course.",
    asset: "/assets/videos/Trust_and_Governance.mp4",
  },
];

export function ProblemSection(): JSX.Element {
  const [activeTab, setActiveTab] = useState(tabs[0]?.value);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);

  const updateBackgroundPosition = useCallback(
    (skipViewTransition = false) => {
      if (!tabsListRef.current || !backgroundRef.current) return;

      const activeTabElement = tabsListRef.current.querySelector(
        `[data-value="${activeTab}"]`,
      ) as HTMLElement;
      if (!activeTabElement) return;

      const tabsListRect = tabsListRef.current.getBoundingClientRect();
      const activeTabRect = activeTabElement.getBoundingClientRect();

      const activeTabIndex = tabs.findIndex((tab) => tab.value === activeTab);
      const activeColor = tabs[activeTabIndex]?.bg || "bg-kb-purple";

      // Check if we're in mobile mode (horizontal layout) or desktop mode (vertical layout)
      const isHorizontal = window.innerWidth < 1024; // lg breakpoint is 1024px

      // Calculate offset based on orientation
      let offsetTop = 0;
      let offsetLeft = 0;

      if (activeTabIndex > 0) {
        // Use index-based calculation as fallback for reliability
        const tabSize = 56; // 14 * 4 = 56px (w-14 h-14)
        const gapSize = 16; // gap-4 = 16px

        if (isHorizontal) {
          // Horizontal layout (mobile): calculate left offset
          offsetLeft = (tabSize + gapSize) * activeTabIndex;

          // Try to use actual DOM measurements if available and reasonable
          const calculatedOffset = activeTabRect.left - tabsListRect.left - 12;

          if (
            calculatedOffset >= 0 &&
            calculatedOffset < (tabSize + gapSize) * tabs.length
          ) {
            offsetLeft = calculatedOffset;
          }
        } else {
          // Vertical layout (desktop): calculate top offset
          offsetTop = (tabSize + gapSize) * activeTabIndex;

          // Try to use actual DOM measurements if available and reasonable
          const calculatedOffset = activeTabRect.top - tabsListRect.top - 12;

          if (
            calculatedOffset >= 0 &&
            calculatedOffset < (tabSize + gapSize) * tabs.length
          ) {
            offsetTop = calculatedOffset;
          }
        }
      }

      // Update background position and color
      // Only use View Transition for tab changes, not for resize
      const transform = isHorizontal
        ? `translateX(${offsetLeft}px)`
        : `translateY(${offsetTop}px)`;
      const positionClass = isHorizontal
        ? "absolute top-[13px]"
        : "absolute left-[13px]";

      if (!skipViewTransition && "startViewTransition" in document) {
        (
          document as Document & {
            startViewTransition: (callback: () => void) => void;
          }
        ).startViewTransition(() => {
          if (backgroundRef.current) {
            backgroundRef.current.style.transform = transform;
            backgroundRef.current.className = `${positionClass} w-12 md:w-14 h-12 md:h-14 rounded-full transition-all duration-300 ease-in-out text-black ${activeColor}`;
          }
        });
      } else {
        if (backgroundRef.current) {
          backgroundRef.current.style.transform = transform;
          backgroundRef.current.className = `${positionClass} w-12 md:w-14 h-12 md:h-14 rounded-full transition-all duration-300 ease-in-out text-black ${activeColor}`;
        }
      }
    },
    [activeTab],
  );

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  useEffect(() => {
    updateBackgroundPosition();
  }, [updateBackgroundPosition]);

  useEffect(() => {
    // Debounce resize handler to prevent flashing
    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Skip view transition on resize to prevent flashing
        updateBackgroundPosition(true);
      }, 100);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [updateBackgroundPosition]);

  return (
    <section
      id={useId()}
      className="container max-w-screen-xl mx-auto px-base my-32"
    >
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex flex-col lg:flex-row gap-12 md:gap-base"
      >
        <TabsList
          ref={tabsListRef}
          className="mx-auto lg:my-auto flex shrink flex-row lg:flex-col gap-2 md:gap-4 border border-white/16 rounded-full p-3 relative"
        >
          {/* Moving background */}
          <div
            ref={backgroundRef}
            className="transition-all duration-300 ease-in-out text-black bg-kb-purple"
            style={{
              viewTransitionName: "tab-background",
            }}
          />

          {tabs.map(({ value, icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              data-value={value}
              className="[&_svg:not([class*='size-'])]:size-8 py-2 md:py-3 px-2 md:px-3 rounded-full text-black dark:text-white relative z-10 data-[selected]:text-black"
            >
              {icon}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(({ value, title, description, asset, color }) => (
          <TabsContent
            key={value}
            value={value}
            className="lg:h-[514px] flex flex-col lg:flex-row items-center gap-base"
          >
            <div className="w-full flex flex-col self-start justify-start gap-base basis-1/2 lg:pt-32 lg:h-full text-center lg:text-left">
              <div>
                <h4 className={cn("text-sm lg:text-md font-normal", color)}>
                  We're solving
                </h4>
                <h3 className="text-2xl lg:text-3xl font-bold">{title}</h3>
              </div>
              <p className="text-md lg:text-lg font-thin leading-relaxed w-full mx-auto max-w-lg">
                {description}
              </p>
            </div>
            <div className="basis-1/2">
              <div className="relative flex justify-center items-center h-full md:max-h-[40vh] lg:max-h-[514px]">
                <video
                  src={asset}
                  poster="/assets/images/koba.png"
                  autoPlay
                  muted
                  className="w-full h-auto max-h-[60vw] md:max-h-[40vh] lg:max-h-[514px] object-contain rounded-lg"
                />
                <div className="absolute z-2 bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/100 via-black/32 md:via-black/64 md:via-64% to-transparent pointer-events-none" />
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
