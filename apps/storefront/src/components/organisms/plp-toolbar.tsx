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
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{resultCount}</span>{" "}
        produse
      </p>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Sortează</span>
        <span className="clip-corner-cut-xs relative inline-flex items-center border border-border bg-card">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="appearance-none bg-transparent py-2 pl-3 pr-8 text-sm font-medium text-foreground focus:outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 size-4 text-muted-foreground" />
        </span>
      </label>
    </div>
  );
}
