import * as React from "react";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

import { cn } from "@lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "no-scrollbar flex items-center gap-1 overflow-x-auto text-sm whitespace-nowrap",
        className
      )}
    >
      {items.map((item, idx) => {
        const last = idx === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${idx}`}>
            {item.href && !last ? (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "font-medium",
                  last ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            )}
            {!last && (
              <ChevronRight
                className="text-muted-foreground/60 size-3.5"
                aria-hidden
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
