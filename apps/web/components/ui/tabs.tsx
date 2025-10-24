"use client";

import { Tabs as TabsPrimitive } from "@base-ui-components/react/tabs";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      orientation={orientation}
      className={cn(
        "flex gap-2",
        orientation === "vertical" ? "flex-row" : "flex-col",
        className,
      )}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // 'bg-muted text-muted-foreground inline-flex w-fit items-center justify-center rounded-lg p-[3px]',
        // 'data-[orientation=horizontal]:h-9 data-[orientation=horizontal]:flex-row',
        // 'data-[orientation=vertical]:flex-col data-[orientation=vertical]:h-fit data-[orientation=vertical]:w-48',
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "text-foreground dark:text-muted-foreground inline-flex items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap transition-[color,box-shadow,background-color]",
        // 'data-[selected]:bg-background',
        "disabled:pointer-events-none disabled:opacity-50 data-[selected]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg]:text-current",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:outline-1",
        // 'dark:data-[selected]:border-input dark:data-[selected]:bg-input/30 dark:data-[selected]:text-foreground',
        "data-[orientation=horizontal]:h-[calc(100%-6px)] data-[orientation=horizontal]:flex-1",
        "data-[orientation=vertical]:w-full data-[orientation=vertical]:justify-start",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

function TabsIndicator({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Indicator>) {
  return (
    <TabsPrimitive.Indicator
      data-slot="tabs-indicator"
      className={cn(
        "absolute bg-primary rounded-md transition-all duration-200",
        "data-[orientation=horizontal]:h-0.5 data-[orientation=horizontal]:bottom-0",
        "data-[orientation=vertical]:w-0.5 data-[orientation=vertical]:left-0",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsIndicator };
