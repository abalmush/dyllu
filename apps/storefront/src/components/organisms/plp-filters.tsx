"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";

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
      <div className="text-foreground flex items-center gap-2">
        <SlidersHorizontal aria-hidden="true" className="size-5" />
        <span className="text-base font-bold tracking-wide">Filtre</span>
      </div>

      {groups.map((group) => (
        <fieldset key={group.id} className="border-border border-t pt-6">
          <legend className="text-muted-foreground mb-4 text-xs font-semibold tracking-[0.16em] uppercase">
            {group.label}
          </legend>
          <ul className="space-y-2">
            {group.options.map((option) => {
              const key = `${group.id}:${option.value}`;
              return (
                <li key={key}>
                  <label className="text-foreground flex min-h-11 cursor-pointer items-center gap-4 text-base">
                    <input
                      name={key}
                      type="checkbox"
                      checked={!!selected[key]}
                      onChange={() => toggle(key)}
                      className="accent-primary size-5"
                    />
                    <span className="flex-1">{option.label}</span>
                    {option.count != null && (
                      <span className="text-muted-foreground text-xs">
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
        <fieldset className="border-border border-t pt-6">
          <legend className="text-muted-foreground mb-4 text-xs font-semibold tracking-[0.16em] uppercase">
            Preț (MDL)
          </legend>
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="price_min"
              inputMode="numeric"
              min={0}
              defaultValue={priceRange.min}
              aria-label="Preț minim"
              className="clip-corner-cut-xs border-border bg-card text-foreground w-full border px-4 py-2 text-sm"
            />
            <span className="text-muted-foreground">—</span>
            <input
              type="number"
              name="price_max"
              inputMode="numeric"
              min={0}
              defaultValue={priceRange.max}
              aria-label="Preț maxim"
              className="clip-corner-cut-xs border-border bg-card text-foreground w-full border px-4 py-2 text-sm"
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
          className="clip-corner-cut-xs bg-muted text-foreground inline-flex items-center gap-1.5 px-4 py-1 text-xs font-medium"
        >
          {filter}
          <button
            type="button"
            aria-label={`Elimină filtrul ${filter}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ×
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="text-brand-800 px-2 text-sm font-semibold underline-offset-2 hover:underline"
      >
        Șterge tot
      </button>
    </div>
  );
}
