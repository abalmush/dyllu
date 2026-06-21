import * as React from "react";

import { cn } from "@lib/utils";

export interface FeatureStatProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export function FeatureStat({
  icon,
  title,
  description,
  className,
}: FeatureStatProps) {
  return (
    <div
      className={cn(
        "clip-corner-cut-sm flex items-start gap-4 bg-card p-5 transition-colors hover:bg-surface-subtle",
        className
      )}
    >
      <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="flex min-w-0 flex-col">
        <p className="font-semibold tracking-tight text-foreground">{title}</p>
        {description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
