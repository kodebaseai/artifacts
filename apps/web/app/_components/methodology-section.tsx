"use client";

import {
  AnimatePresence,
  type MotionValue,
  motion,
  useScroll,
  useTransform,
} from "motion/react";
import Image from "next/image";
import type { JSX } from "react";
import { useEffect, useId, useRef, useState } from "react";
import LaptopScreen from "@/components/device-screens/laptop";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Movement {
  background: string;
  title: string;
  subtitle: string;
  challenge: string;
  solution: string;
  paragraph: string;
}

const movements: Movement[] = [
  {
    background: "/assets/backgrounds/bg-1.png",
    title: "Define",
    subtitle: "Setting the Foundation",
    challenge:
      "Every project starts with scattered requirements, unclear scope, and missing context.",
    solution: "Structured Capture from Day One.",
    paragraph:
      "Transform vague ideas into precise, trackable artifacts. Issues, milestones, and initiatives become your source of truth—not afterthoughts in project management tools.",
  },
  {
    background: "/assets/backgrounds/bg-4.png",
    title: "Execute",
    subtitle: "Building with Context",
    challenge:
      "Development happens in isolation. Decisions get lost. Knowledge lives in people's heads.",
    solution: "Development with Perfect Memory.",
    paragraph:
      "Every commit, every decision, every architectural choice connects back to the original intent. Your repository becomes a living knowledge base that grows smarter with each change.",
  },
  {
    background: "/assets/backgrounds/bg-3.png",
    title: "Distill",
    subtitle: "Learning from Reality",
    challenge:
      "Projects end, but wisdom vanishes. Teams repeat the same mistakes. Knowledge dies with departing engineers.",
    solution: "Institutional Memory That Compounds.",
    paragraph:
      "Capture what worked, what didn't, and why. Transform project completion into organizational learning. Build a knowledge base that makes every future project faster and smarter.",
  },
];

export function MethodologySection(): JSX.Element {
  const containerRef = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState<number>(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Update index based on scroll progress
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      // Divide scroll into thirds for 3 movements
      if (latest < 0.333) {
        setIndex(0);
      } else if (latest < 0.666) {
        setIndex(1);
      } else {
        setIndex(2);
      }
    });

    return () => unsubscribe();
  }, [scrollYProgress]);

  return (
    <section id={useId()} ref={containerRef} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <MovementBackground progress={scrollYProgress} index={index} />

        <div className="relative z-3 h-full w-full  py-section-gap">
          <div className="container max-w-screen-xl px-base mx-auto flex flex-col gap-base h-full">
            <div>
              <h2 className="font-display text-4xl font-semibold mb-4">
                How Philosophy Becomes Practice
              </h2>
              <p className="text-md lg:text-lg font-light max-w-screen-md leading-relaxed">
                The Kodebase methodology in three movements: <b>Define</b>,{" "}
                <b>Execute</b>, <b>Distill</b>. Each step powered by
                purpose-built tools that work as one unified system.
              </p>
            </div>

            <div className="flex flex-col lg:flex-row lg:gap-base items-end flex-grow lg:w-[120vw]">
              <div className="flex flex-col gap-base lg:max-w-md self-start">
                <Pagination index={index} />
                <div className="relative lg:min-h-[400px] max-w-screen">
                  <AnimatePresence mode="wait">
                    <MovementContent key={index} index={index} />
                  </AnimatePresence>
                </div>
              </div>

              {/* Laptop Screen */}
              <div className="relative flex items-end w-full h-full -bottom-20">
                <LaptopScreen />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MovementBackground({
  index,
  progress,
}: {
  index: number;
  progress: MotionValue<number>;
}) {
  const bg1Opacity = useTransform(progress, [0, 0.3332, 0.3333], [1, 1, 0]);
  const bg2Opacity = useTransform(
    progress,
    [0.3332, 0.3333, 0.6665, 0.6666],
    [0, 1, 1, 0],
  );
  const bg3Opacity = useTransform(progress, [0.6665, 0.6666, 1], [0, 1, 1]);
  const opacities = [bg1Opacity, bg2Opacity, bg3Opacity];

  // Preload all images to prevent flashing
  useEffect(() => {
    movements.forEach((movement) => {
      const img = new window.Image();
      img.src = movement.background;
    });
  }, []);

  const movement = movements[index];
  if (!movement) {
    // this should never happen
    return <div>No Movement found</div>;
  }

  return (
    <motion.div
      className="absolute inset-0 z-2 top-0 left-0 w-screen h-screen overflow-hidden object-center"
      style={{ opacity: opacities[index] }}
    >
      <div className="absolute z-2 top-0 left-0 w-full h-[42vh] bg-gradient-to-b from-black/100 to-transparent pointer-events-none" />
      <Image
        src={movement.background}
        alt="Colorful dust cloud"
        width={1920}
        height={1080}
        className="object-cover h-screen w-screen"
        priority
        loading="eager"
      />
      <div className="absolute z-2 bottom-0 left-0 w-full h-[42vh] bg-gradient-to-t from-black/100 to-transparent pointer-events-none" />
    </motion.div>
  );
}

function Pagination({ index }: { index: number }) {
  const length = movements.length;
  return (
    <div className="hidden lg:flex gap-3 pt-20">
      {Array.from({ length }).map((_, i) => (
        <Button
          // biome-ignore lint/suspicious/noArrayIndexKey: not important
          key={i}
          variant="ghost"
          className="p-0 m-0 bg-transparent hover:bg-transparent"
        >
          <div
            className={cn(
              "h-2 rounded-full",
              index === i ? "w-[5rem] bg-white/42" : "w-8 bg-black/42",
            )}
          />
        </Button>
      ))}
    </div>
  );
}

function MovementContent({ index }: { index: number }) {
  const movement = movements[index];
  if (!movement) {
    // this should never happen
    return <div>No Movement found</div>;
  }

  const { title, subtitle, challenge, solution, paragraph } = movement;

  const colors = ["text-kb-purple", "text-kb-teal", "text-kb-lime"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="flex flex-col gap-4 md:gap-base">
        <div className="relative flex flex-col font-display leading-none">
          <h3 className={cn("text-5xl lg:text-6xl font-bold", colors[index])}>
            {title}
          </h3>
          <h4 className="text-xl lg:text-2xl font-normal">{subtitle}</h4>
        </div>
        <div className="flex flex-col gap-2 md:gap-4 text-sm lg:text-md">
          <div className="inline">
            <span className="font-bold mr-2">The Challenge:</span>
            <span className="font-light">{challenge}</span>
          </div>
          <div className="inline">
            <span className="font-bold mr-2">The Solution:</span>
            <span className="font-light">{solution}</span>
          </div>
        </div>
        <p className="text-md md:text-lg lg:text-xl font-light leading-relaxed">
          {paragraph}
        </p>
      </div>
    </motion.div>
  );
}
