"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { categoriesTree } from "@lib/data/categories-tree";

import SortProducts, { type SortOptions } from "./sort-products";

type Props = {
  sortBy: SortOptions;
  activeCategoryHandle?: string;
  hideSort?: boolean;
  className?: string;
  "data-testid"?: string;
};

export default function RefinementList({
  sortBy,
  activeCategoryHandle,
  hideSort,
  className,
  "data-testid": dataTestId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setQueryParams = React.useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      params.set(name, value);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <aside
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 small:sticky small:top-28 small:max-h-[calc(100vh-9rem)] small:overflow-y-auto",
        className
      )}
      data-testid={dataTestId}
    >
      {!hideSort && (
        <div className="flex items-center justify-between gap-3 small:hidden">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Sortează
          </span>
          <SortProducts sortBy={sortBy} setQueryParams={(_, v) => setQueryParams("sortBy", v)} />
        </div>
      )}
      <Accordion type="multiple" defaultValue={["categorii", "disponibilitate"]}>
        <AccordionItem value="categorii">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Layers className="size-4 text-primary" /> Categorii
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ul className="flex flex-col gap-0.5 text-sm">
              <li>
                <Link
                  href="/store"
                  className={cn(
                    "flex items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
                    !activeCategoryHandle && "bg-muted text-foreground"
                  )}
                >
                  Toate produsele
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Link>
              </li>
              {categoriesTree.map((cat) => {
                const active = cat.handle === activeCategoryHandle;
                return (
                  <li key={cat.handle}>
                    <Link
                      href={`/categories/${cat.handle}`}
                      className={cn(
                        "flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-muted",
                        active
                          ? "bg-primary/10 font-semibold text-primary"
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
              <Tag className="size-4 text-primary" /> Disponibilitate
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex cursor-pointer items-center gap-2.5">
                <Checkbox id="filter-stock" />
                <Label htmlFor="filter-stock" className="cursor-pointer">
                  În stoc
                </Label>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5">
                <Checkbox id="filter-sale" />
                <Label htmlFor="filter-sale" className="cursor-pointer">
                  Cu reducere
                </Label>
              </label>
              <p className="text-xs text-muted-foreground">
                Filtre suplimentare disponibile în curând.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </aside>
  );
}
