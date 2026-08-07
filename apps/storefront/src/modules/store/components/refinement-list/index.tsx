"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { ChevronRight, Layers, Tag } from "lucide-react";

import { cn } from "@lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion";
import { Checkbox } from "@/components/atoms/checkbox";
import { Label } from "@/components/atoms/label";
import { type CategoryNode } from "@lib/data/categories";

import SortProducts, { type SortOptions } from "./sort-products";

type Props = {
  sortBy: SortOptions;
  activeCategoryHandle?: string;
  hideSort?: boolean;
  className?: string;
  categories: CategoryNode[];
  "data-testid"?: string;
};

export default function RefinementList({
  sortBy,
  activeCategoryHandle,
  hideSort,
  className,
  categories,
  "data-testid": dataTestId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setQueryParams = React.useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      params.set(name, value);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <aside
      className={cn(
        "border-border bg-card small:sticky small:top-28 small:max-h-[calc(100vh-9rem)] small:overflow-y-auto flex flex-col gap-4 rounded-2xl border p-6",
        className
      )}
      data-testid={dataTestId}
    >
      {!hideSort && (
        <div className="small:hidden flex items-center justify-between gap-4">
          <span className="text-foreground text-sm font-semibold tracking-tight">
            Sortează
          </span>
          <SortProducts
            sortBy={sortBy}
            setQueryParams={(_, v) => setQueryParams("sortBy", v)}
          />
        </div>
      )}
      <Accordion
        type="multiple"
        defaultValue={["categorii", "disponibilitate"]}
      >
        <AccordionItem value="categorii">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Layers aria-hidden="true" className="text-brand-800 size-5" />{" "}
              Categorii
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ul className="flex flex-col gap-0.5 text-sm">
              <li>
                <Link
                  href="/store"
                  className={cn(
                    "hover:bg-muted flex items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                    !activeCategoryHandle && "bg-muted text-foreground"
                  )}
                >
                  Toate produsele
                  <ChevronRight className="text-muted-foreground size-3.5" />
                </Link>
              </li>
              {categories.map((cat) => {
                const active = cat.handle === activeCategoryHandle;
                return (
                  <li key={cat.handle}>
                    <Link
                      href={`/categories/${cat.handle}`}
                      className={cn(
                        "hover:bg-muted flex items-center justify-between rounded-md px-2 py-1.5 transition-colors",
                        active
                          ? "bg-primary/15 text-brand-900 font-semibold"
                          : "text-muted-foreground"
                      )}
                    >
                      <span>{cat.name}</span>
                      <ChevronRight className="size-3.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="disponibilitate">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Tag aria-hidden="true" className="text-brand-800 size-5" />{" "}
              Disponibilitate
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex min-h-11 cursor-pointer items-center gap-4">
                <Checkbox id="filter-stock" />
                <Label htmlFor="filter-stock" className="cursor-pointer">
                  În stoc
                </Label>
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-4">
                <Checkbox id="filter-sale" />
                <Label htmlFor="filter-sale" className="cursor-pointer">
                  Cu reducere
                </Label>
              </label>
              <p className="text-muted-foreground text-xs">
                Filtre suplimentare disponibile în curând.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </aside>
  );
}
