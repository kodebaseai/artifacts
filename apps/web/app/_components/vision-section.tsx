"use client";

import { motion, useInView, type Variants } from "motion/react";
import Image from "next/image";
import React, { type JSX, useId, useRef } from "react";
import { cn } from "@/lib/utils";

export function VisionSection(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  const slideVariants: Variants = {
    hidden: { y: 100, opacity: 0 },
    visible: (custom: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: custom * 0.1,
        duration: 0.6,
        ease: "easeOut",
      },
    }),
  };

  return (
    <section
      id={useId()}
      className="container max-w-screen-xl px-base mx-auto flex flex-col gap-16"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-display text-4xl font-semibold">
          Three Tools, One Vision
        </h2>
        <h3 className="font-display text-[1.75rem] font-thin">
          CLI for speed. MCP for intelligence. Web UI for insight.
        </h3>
      </div>
      <p className="max-w-2xl mx-auto text-xl font-light text-center">
        Together, they transform your Git repository from a code storage system
        into a <b>methodology-driven knowledge</b> base where context is never
        lost and wisdom accumulates over time.
      </p>
      <div
        ref={containerRef}
        className="relative w-full h-full grid place-items-center"
      >
        <Image
          src="/assets/images/three-tools.png"
          alt="Vision Section"
          width={640}
          height={640}
          className="relative left-[25%] md:left-0"
        />
        <div className="absolute flex flex-col justify-center gap-base w-full h-full top-0 right-0">
          {/* Sliding divs positioned around the image */}
          <motion.div
            className="relative md:absolute md:top-[25%] md:right-0 w-[60%] md:w-[35%]"
            variants={slideVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            custom={0}
          >
            <ToolCard
              title="Zero Context Loss"
              description="Every decision is traceable to its origin"
              side="right"
            />
          </motion.div>

          <motion.div
            className="relative md:absolute md:top-[35%] md:left-0 w-[60%] md:w-[35%]"
            variants={slideVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            custom={1}
          >
            <ToolCard
              title="Accelerated Onboarding"
              description="Your assistant knows not just what the code does, but why it exists"
              side="left"
            />
          </motion.div>

          <motion.div
            className="relative md:absolute md:bottom-[35%] md:right-0 w-[60%] md:w-[35%]"
            variants={slideVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            custom={2}
          >
            <ToolCard
              title="Ai That Understands"
              description="Your assistant knows not just what the code does, but why it exists"
              side="right"
            />
          </motion.div>

          <motion.div
            className="relative md:absolute md:bottom-[25%] md:left-0 w-[60%] md:w-[35%]"
            variants={slideVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            custom={3}
          >
            <ToolCard
              title="Compounding Wisdom"
              description="Each project makes the next one faster and better"
              side="left"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ToolCard({
  title,
  description,
  side,
}: {
  title: string;
  description: string;
  side?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        side === "left" && "items-start lg:items-end",
        side === "right" && "items-start md:items-end lg:items-start",
      )}
    >
      <h4
        className={cn(
          "text-lg md:text-xl lg:text-2xl font-display font-normal md:font-semibold",
          side === "left" && "text-start lg:text-end",
          side === "right" && "text-start md:text-end lg:text-start",
        )}
      >
        {title}
      </h4>
      <p
        className={cn(
          "text-xs md:text-sm max-w-[90%] md:max-w-[75% font-light",
          side === "left" && "text-start lg:text-end",
          side === "right" && "text-start md:text-end lg:text-start",
        )}
      >
        {description}
      </p>
    </div>
  );
}
