import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 shrink-0
  outline-none rounded-full cursor-pointer bg-black
  text-sm font-normal transition-all whitespace-nowrap
  disabled:pointer-events-none disabled:opacity-50
  [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0
  focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
  aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive`,
  {
    variants: {
      variant: {
        default: "bg-background text-primary-foreground hover:bg-primary/20",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20",
        outline: "border border-white/16 bg-background hover:bg-accent/8",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent/8",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-7 rounded-full gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-9 md:h-10 font-semibold rounded-full px-4 md:px-6 has-[>svg]:px-4",
        icon: "size-9 disabled:opacity-50 disabled:text-white/50",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
