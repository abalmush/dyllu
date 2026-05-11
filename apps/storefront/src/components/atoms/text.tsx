import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@lib/utils";

const textVariants = cva("text-foreground", {
  variants: {
    size: {
      xsmall: "text-[11px] leading-[1.5]",
      small: "text-xs leading-5",
      base: "text-sm leading-6",
      large: "text-base leading-7",
      xlarge: "text-lg leading-8",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      subtle: "text-muted-foreground/80",
      primary: "text-primary",
      success: "text-success",
      warning: "text-warning-foreground",
      destructive: "text-destructive",
      inverse: "text-background",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
  },
  defaultVariants: { size: "base", tone: "default", weight: "normal" },
});

export type TextProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof textVariants> & {
    as?: "p" | "span" | "div";
  };

export const Text = React.forwardRef<HTMLElement, TextProps>(
  ({ className, size, tone, weight, as = "p", ...props }, ref) => {
    const Tag = as as "p";
    return (
      <Tag
        ref={ref as React.Ref<HTMLParagraphElement>}
        className={cn(textVariants({ size, tone, weight }), className)}
        {...props}
      />
    );
  }
);
Text.displayName = "Text";
