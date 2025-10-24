"use-client";

import Image from "next/image";
import type { JSX, ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function LaptopScreen({
  className = "",
  children,
}: {
  className?: string;
  children?: ReactNode;
}): JSX.Element {
  return (
    <div className={cn("inline-block w-full", className)}>
      <div className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg">
        {children}
        <Image
          src="/assets/images/laptop-background-3x.png"
          alt="Laptop screen background"
          width={1920}
          height={1080}
        />
      </div>
    </div>
  );
}
