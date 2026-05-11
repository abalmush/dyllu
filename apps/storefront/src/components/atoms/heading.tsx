import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@lib/utils";

const headingVariants = cva("font-display tracking-tight text-foreground", {
  variants: {
    size: {
      h1: "text-display-md sm:text-display-lg",
      h2: "text-display-sm sm:text-display-md",
      h3: "text-2xl sm:text-3xl",
      h4: "text-xl sm:text-2xl",
      h5: "text-lg sm:text-xl",
      h6: "text-base sm:text-lg",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
      extrabold: "font-extrabold",
    },
  },
  defaultVariants: { size: "h3", weight: "bold" },
});

export type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> &
  VariantProps<typeof headingVariants> & {
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    level?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  };

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, size, weight, as, level, ...props }, ref) => {
    const tag = as ?? level ?? "h2";
    const Tag = tag as "h2";
    return (
      <Tag
        ref={ref}
        className={cn(headingVariants({ size, weight }), className)}
        {...props}
      />
    );
  }
);
Heading.displayName = "Heading";
