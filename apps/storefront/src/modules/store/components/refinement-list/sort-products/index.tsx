"use client";

import { useTranslations } from "next-intl";
import {
  ArrowDownAZ,
  ArrowDownUp,
  ArrowUpAZ,
  Check,
  Sparkles,
} from "lucide-react";

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
  const t = useTranslations("SortProducts");
  const SORT_OPTIONS: {
    value: SortOptions;
    label: string;
    icon: typeof Sparkles;
  }[] = [
    { value: "created_at", label: t("newest"), icon: Sparkles },
    { value: "price_asc", label: t("priceAsc"), icon: ArrowDownAZ },
    { value: "price_desc", label: t("priceDesc"), icon: ArrowUpAZ },
  ];
  const active =
    SORT_OPTIONS.find((o) => o.value === sortBy) ?? SORT_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="default"
          className="rounded-full"
          data-testid={dataTestId}
        >
          <ArrowDownUp aria-hidden="true" className="size-5" />
          <span className="xsmall:inline hidden">{t("sortLabel")}</span>
          <span className="font-semibold">{active.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("order")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SORT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = opt.value === sortBy;
          return (
            <DropdownMenuItem
              key={opt.value}
              onSelect={() => setQueryParams("sortBy", opt.value)}
            >
              <Icon
                aria-hidden="true"
                className="text-muted-foreground size-5"
              />
              <span className="flex-1">{opt.label}</span>
              {selected && (
                <Check aria-hidden="true" className="text-brand-800 size-5" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
