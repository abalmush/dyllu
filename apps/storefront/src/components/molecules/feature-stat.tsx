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
        "clip-corner-cut-sm bg-card hover:bg-surface-subtle flex items-start gap-4 p-6 transition-colors",
        className
      )}
    >
      <div className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-full">
        {icon}
      </div>
      <div className="flex min-w-0 flex-col">
        <p className="text-foreground font-semibold tracking-tight">{title}</p>
        {description && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
