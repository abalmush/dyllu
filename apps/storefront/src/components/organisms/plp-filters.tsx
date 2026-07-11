"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";

import { cn } from "@lib/utils";

export type FilterOption = { value: string; label: string; count?: number };
export type FilterGroup = {
  id: string;
  label: string;
  options: FilterOption[];
};

type Props = {
  groups: FilterGroup[];
  priceRange?: { min: number; max: number };
};

export function PlpFilters({ groups, priceRange }: Props) {
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <aside className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-foreground">
        <SlidersHorizontal className="size-4" />
        <span className="text-sm font-bold uppercase tracking-[0.16em]">
          Filtre
        </span>
      </div>

      {groups.map((group) => (
        <fieldset key={group.id} className="border-t border-border pt-5">
          <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {group.label}
          </legend>
          <ul className="space-y-2">
            {group.options.map((option) => {
              const key = `${group.id}:${option.value}`;
              return (
                <li key={key}>
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={!!selected[key]}
                      onChange={() => toggle(key)}
                      className="size-4 accent-primary"
                    />
                    <span className="flex-1">{option.label}</span>
                    {option.count != null && (
                      <span className="text-xs text-muted-foreground">
                        {option.count}
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}

      {priceRange && (
        <fieldset className="border-t border-border pt-5">
          <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Preț (MDL)
          </legend>
          <div className="flex items-center gap-2">
            <input
              type="number"
              defaultValue={priceRange.min}
              aria-label="Preț minim"
              className="clip-corner-cut-xs w-full border border-border bg-card px-3 py-2 text-sm text-foreground"
            />
            <span className="text-muted-foreground">—</span>
            <input
              type="number"
              defaultValue={priceRange.max}
              aria-label="Preț maxim"
              className="clip-corner-cut-xs w-full border border-border bg-card px-3 py-2 text-sm text-foreground"
            />
          </div>
        </fieldset>
      )}
    </aside>
  );
}

export function ActiveFilterChips({
  filters,
  onClear,
}: {
  filters: string[];
  onClear?: () => void;
}) {
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <span
          key={filter}
          className="clip-corner-cut-xs inline-flex items-center gap-1.5 bg-muted px-3 py-1 text-xs font-medium text-foreground"
        >
          {filter}
          <button
            type="button"
            aria-label={`Elimină filtrul ${filter}`}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            ×
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
      >
        Șterge tot
      </button>
    </div>
  );
}
