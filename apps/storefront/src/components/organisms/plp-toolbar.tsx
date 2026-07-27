"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevanță" },
  { value: "price-asc", label: "Preț crescător" },
  { value: "price-desc", label: "Preț descrescător" },
  { value: "newest", label: "Cele mai noi" },
] as const;

export function PlpToolbar({ resultCount }: { resultCount: number }) {
  const [sort, setSort] = React.useState<string>("relevance");

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-muted-foreground text-sm">
        <span className="text-foreground font-semibold">{resultCount}</span>{" "}
        produse
      </p>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Sortează</span>
        <span className="clip-corner-cut-xs border-border bg-card relative inline-flex items-center border">
          <select
            name="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-foreground appearance-none bg-transparent py-2 pr-8 pl-4 text-sm font-medium focus:outline-hidden"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute right-2 size-5"
          />
        </span>
      </label>
    </div>
  );
}
