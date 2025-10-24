"use client";

import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { type JSX, useEffect, useRef } from "react";

interface ScreenData {
  text: string;
  image: {
    src: string;
    alt: string;
  };
}

const screens: ScreenData[] = [
  {
    text: "Every line of code tells a story—not just of what your software does, but of every problem solved, every decision made, every lesson learned.",
    image: {
      src: "/assets/images/stone-story.png",
      alt: "Your Codebase is Your Knowledge Base",
    },
  },
  {
    text: "Hidden within your commits, pull requests, and conversations lies the collective intelligence of your entire team: the reasoning behind architectural choices, the context of critical decisions, the hard-won insights from debugging sessions at 2 AM.",
    image: {
      src: "/assets/images/collective-intelligence.png",
      alt: "Git as Source of Truth",
    },
  },
  {
    text: "Yet most of this profound knowledge remains buried, inaccessible, forgotten. What if...",
    image: {
      src: "/assets/images/what-if.png",
      alt: "Structured Knowledge with Artifacts",
    },
  },
];

export function SolutionSection(): JSX.Element {
  const containerRef = useRef<HTMLElement>(null);

  // Preload all images to prevent flashing
  useEffect(() => {
    screens.forEach((screen) => {
      const img = new window.Image();
      img.src = screen.image.src;
    });
  }, []);

  // Set up scroll tracking - 4x viewport height for extended third screen
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 16px", "end start"], // Start when h2 becomes sticky (top-base)
  });

  // Create smooth transforms for each screen
  // Screen 1: visible from 0-25%
  const screen1Opacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.225],
    [1, 1, 0],
  );

  // Screen 2: visible from 25-50%
  const screen2Opacity = useTransform(
    scrollYProgress,
    [0.225, 0.25, 0.45, 0.475],
    [0, 1, 1, 0],
  );

  // Screen 3: visible from 50-100% (extended for floating text)
  const screen3Opacity = useTransform(
    scrollYProgress,
    [0.475, 0.5, 1],
    [0, 1, 1],
  );

  // Image translations - slide up from bottom
  const screen2Y = useTransform(scrollYProgress, [0.2, 0.25], ["42%", "0%"]);
  const screen3Y = useTransform(scrollYProgress, [0.45, 0.5], ["42%", "0%"]);

  // Floating text animations for screen 3
  const floatingText1Opacity = useTransform(
    scrollYProgress,
    [0.5, 0.55],
    [0, 1],
  );
  const floatingText2Opacity = useTransform(
    scrollYProgress,
    [0.55, 0.625],
    [0, 1],
  );
  const floatingText3Opacity = useTransform(
    scrollYProgress,
    [0.625, 0.7],
    [0, 1],
  );

  // H2 title movement - stays sticky until 72.5%, then moves up with the content
  const titleY = useTransform(
    scrollYProgress,
    [0, 0.725, 0.75, 1],
    ["0%", "0%", "-140%", "-140%"],
  );

  // Last image exit animation - accelerates out
  const exitY = useTransform(scrollYProgress, [0.99, 1], ["0%", "-150%"], {
    ease: (t) => t * t, // Quadratic easing for acceleration
  });

  return (
    <section
      ref={containerRef}
      id="solution"
      className="container max-w-screen-xl mx-auto px-base relative"
      style={{ height: "320vh" }} // 3.2x viewport height for scroll tracking
    >
      <motion.h2
        className="sticky top-base z-20 font-display text-4xl font-semibold mb-4 text-center py-4"
        style={{ y: titleY }}
      >
        Your Codebase is your Knowledge Base
      </motion.h2>

      <motion.div
        className="flex flex-col justify-center items-center gap-base max-w-screen-md mx-auto sticky top-32"
        style={{ y: exitY }}
      >
        {/* Text container with smooth transitions */}
        <div className="relative w-full h-24">
          {screens.map((screen, index) => (
            <motion.p
              key={screen.image.src}
              className="absolute inset-0 text-center text-md lg:text-lg font-thin leading-relaxed w-full mx-auto"
              style={{
                opacity:
                  index === 0
                    ? screen1Opacity
                    : index === 1
                      ? screen2Opacity
                      : screen3Opacity,
              }}
            >
              {screen.text}
            </motion.p>
          ))}
        </div>

        {/* Image container with transitions */}
        <div className="relative w-full max-w-[640px] h-[640px]">
          {/* Screen 1 - starts visible, fades out */}
          <motion.div
            className="absolute inset-0"
            style={{ opacity: screen1Opacity }}
          >
            <Image
              src={screens[0]?.image.src || ""}
              alt={screens[0]?.image.alt || ""}
              width={640}
              height={640}
              className="w-full h-full object-contain"
              priority
              loading="eager"
            />
            <div className="absolute z-2 bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/100 via-black/32 md:via-black/64 md:via-64% to-transparent pointer-events-none" />
          </motion.div>

          {/* Screen 2 - slides up and fades in */}
          <motion.div
            className="absolute inset-0"
            style={{
              opacity: screen2Opacity,
              y: screen2Y,
            }}
          >
            <Image
              src={screens[1]?.image.src || ""}
              alt={screens[1]?.image.alt || ""}
              width={640}
              height={640}
              className="w-full h-full object-contain"
              loading="eager"
            />
            <div className="absolute z-2 bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/100 via-black/32 md:via-black/64 md:via-64% to-transparent pointer-events-none" />
          </motion.div>

          {/* Screen 3 - slides up and fades in with floating text */}
          <motion.div
            className="absolute inset-0"
            style={{
              opacity: screen3Opacity,
              y: screen3Y,
            }}
          >
            <Image
              src={screens[2]?.image.src || ""}
              alt={screens[2]?.image.alt || ""}
              width={640}
              height={640}
              className="w-full h-full object-contain"
              loading="eager"
            />
            <div className="absolute z-2 bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/100 via-black/32 md:via-black/64 md:via-64% to-transparent pointer-events-none" />

            {/* Floating text elements */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Floating text 1 - Top right */}
              <motion.div
                className="absolute top-1/6 right-0 md:right-12 lg:-right-20 flex items-center gap-4"
                style={{ opacity: floatingText1Opacity }}
              >
                <div className="relative">
                  <div className="w-32 md:w-48 lg:w-72 h-px border-t border-dotted border-gray-400" />
                  <div className="w-32 md:w-20 h-px border-t border-dotted border-gray-400 rotate-90 absolute top-16 md:top-10 -left-16 md:-left-10" />
                </div>
                <p className="max-w-xs text-gray-300">You could unlock it?</p>
              </motion.div>

              {/* Floating text 2 - Middle right */}
              <motion.div
                className="absolute top-2/8 right-0 md:right-10 lg:-right-24 flex items-center gap-4"
                style={{ opacity: floatingText2Opacity }}
              >
                <div className="relative">
                  <div className="w-12 md:w-22 lg:w-48 h-px border-t border-dotted border-gray-400" />
                  <div className="w-32 md:w-20 h-px border-t border-dotted border-gray-400 rotate-90 absolute top-16 md:top-10 -left-16 md:-left-10" />
                </div>
                <p className="text-sm md:text-md max-w-xs text-gray-300">
                  Your codebase could remember
                  <br />
                  not just the solution, but the
                  <br />
                  why behind every solution?
                </p>
              </motion.div>

              {/* Floating text 3 - Bottom right */}
              <motion.div
                className="absolute top-4/10 right-0 md:right-8 lg:-right-20 flex items-center gap-4"
                style={{ opacity: floatingText3Opacity }}
              >
                <div className="relative">
                  <div className="w-6 md:w-8 lg:w-30 h-px border-t border-dotted border-gray-400" />
                  <div className="w-32 md:w-20 h-px border-t border-dotted border-gray-400 rotate-90 absolute top-16 md:top-10 -left-16 md:-left-10" />
                </div>
                <p className="text-sm md:text-md max-w-xs text-gray-300">
                  The very act of building software
                  <br />
                  became an act of building
                  <br />
                  institutional memory?
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Scroll progress indicator */}
        {/* <motion.div className="fixed right-8 top-1/2 -translate-y-1/2 w-1 h-32 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="w-full bg-white origin-top"
            style={{
              scaleY: scrollYProgress,
            }}
          />
        </motion.div> */}

        {/* Hidden preload images */}
        <div className="sr-only">
          {screens.map((screen, index) => (
            <Image
              key={`preload-${screen.image.src}`}
              src={screen.image.src}
              alt=""
              width={640}
              height={640}
              priority={index === 0}
              loading="eager"
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
