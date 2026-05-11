"use client";

import { ArrowDownAZ, ArrowDownUp, ArrowUpAZ, Check, Sparkles } from "lucide-react";

import { Button } from "@/components/atoms/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";

export type SortOptions = "price_asc" | "price_desc" | "created_at";

const SORT_OPTIONS: {
  value: SortOptions;
  label: string;
  icon: typeof Sparkles;
}[] = [
  { value: "created_at", label: "Cele mai noi", icon: Sparkles },
  { value: "price_asc", label: "Preț crescător", icon: ArrowDownAZ },
  { value: "price_desc", label: "Preț descrescător", icon: ArrowUpAZ },
];

type Props = {
  sortBy: SortOptions;
  setQueryParams: (name: string, value: SortOptions) => void;
  "data-testid"?: string;
};

export default function SortProducts({
  sortBy,
  setQueryParams,
  "data-testid": dataTestId,
}: Props) {
  const active = SORT_OPTIONS.find((o) => o.value === sortBy) ?? SORT_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="default"
          className="rounded-full"
          data-testid={dataTestId}
        >
          <ArrowDownUp className="size-4" />
          <span className="hidden xsmall:inline">Sortează:</span>
          <span className="font-semibold">{active.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Ordinea produselor</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SORT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = opt.value === sortBy;
          return (
            <DropdownMenuItem
              key={opt.value}
              onSelect={() => setQueryParams("sortBy", opt.value)}
            >
              <Icon className="size-4 text-muted-foreground" />
              <span className="flex-1">{opt.label}</span>
              {selected && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
