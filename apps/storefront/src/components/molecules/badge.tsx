import * as React from "react";

import { cn } from "@lib/utils";

type BadgeVariant = "lime" | "dark" | "destructive" | "warning" | "outline";

const VARIANT: Record<BadgeVariant, string> = {
  lime: "bg-brand-500 text-foreground",
  dark: "bg-foreground text-background",
  destructive: "bg-destructive text-destructive-foreground",
  warning: "bg-warning text-warning-foreground",
  outline: "border border-foreground/20 bg-transparent text-foreground",
};

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: "sm" | "md";
};

export function Badge({
  variant = "lime",
  size = "md",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "clip-corner-cut-sm inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider",
        size === "sm" ? "px-2.5 py-1 text-[10px]" : "px-3.5 py-1.5 text-xs",
        VARIANT[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
