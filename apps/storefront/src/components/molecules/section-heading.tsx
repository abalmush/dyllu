import * as React from "react";

import { cn } from "@lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  level?: "h1" | "h2" | "h3";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  level = "h2",
  className,
}: SectionHeadingProps) {
  const Tag = level;

  return (
    <header
      className={cn("flex items-end justify-between gap-6", className)}
    >
      <div>
        {eyebrow && (
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
            {eyebrow}
          </span>
        )}
        <Tag className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
          {title}
        </Tag>
        {description && (
          <p className="mt-2 max-w-xl text-sm text-foreground/70">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
