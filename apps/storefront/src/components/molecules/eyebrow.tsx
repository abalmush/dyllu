import * as React from "react";

import { cn } from "@lib/utils";

export type EyebrowVariant =
  | "corner-cut"
  | "dark"
  | "primary"
  | "outlined"
  | "tab"
  | "bare";

export interface EyebrowProps {
  variant?: EyebrowVariant;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const base =
  "text-[11px] font-semibold uppercase tracking-[0.18em] leading-none";

const variantStyles: Record<EyebrowVariant, string> = {
  "corner-cut":
    "inline-flex w-fit items-center gap-2 bg-foreground px-4 py-2 text-primary clip-corner-cut-sm",
  dark: "inline-flex w-fit items-center gap-2 rounded-full bg-foreground px-3 py-2 text-primary",
  primary:
    "inline-flex w-fit items-center gap-2 rounded-full bg-primary px-3 py-2 text-primary-foreground",
  outlined:
    "inline-flex w-fit items-center gap-2 rounded-full border border-foreground/25 px-3 py-2 text-foreground",
  tab: "inline-flex w-fit items-center gap-2 border-l-2 border-primary pl-3 py-1 text-foreground/85",
  bare: "text-primary",
};

export function Eyebrow({
  variant = "corner-cut",
  icon,
  className,
  children,
}: EyebrowProps) {
  return (
    <span className={cn(base, variantStyles[variant], className)}>
      {icon}
      {children}
    </span>
  );
}
