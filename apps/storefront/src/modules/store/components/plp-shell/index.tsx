"use client";

import * as React from "react";
import { Filter } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@lib/utils";
import { Button } from "@/components/atoms/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/atoms/sheet";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/molecules/breadcrumbs";
import RefinementList from "@modules/store/components/refinement-list";
import SortProducts, {
  type SortOptions,
} from "@modules/store/components/refinement-list/sort-products";

type Props = {
  title: string;
  description?: string;
  crumbs: BreadcrumbItem[];
  sortBy: SortOptions;
  activeCategoryHandle?: string;
  childrenLinks?: { name: string; handle: string }[];
  children: React.ReactNode;
};

export default function PlpShell({
  title,
  description,
  crumbs,
  sortBy,
  activeCategoryHandle,
  childrenLinks,
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = React.useState(false);

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
    <div className="content-container py-8 small:py-12">
      <div className="flex flex-col gap-3">
        <Breadcrumbs items={crumbs} />
        <div className="flex flex-col gap-3 small:flex-row small:items-end small:justify-between">
          <div>
            <h1
              className="font-display text-display-sm font-extrabold tracking-tight text-foreground small:text-display-md"
              data-testid={activeCategoryHandle ? "category-page-title" : "store-page-title"}
            >
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground small:text-base">
                {description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SortProducts sortBy={sortBy} setQueryParams={(_, v) => setQueryParams("sortBy", v)} />
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="rounded-full small:hidden">
                  <Filter className="size-4" /> Filtre
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-full max-w-sm flex-col gap-4 p-0">
                <SheetHeader className="border-b border-border px-6 py-5">
                  <SheetTitle>Filtre</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-6">
                  <RefinementList
                    sortBy={sortBy}
                    activeCategoryHandle={activeCategoryHandle}
                    className="static border-0 p-0 shadow-none"
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        {childrenLinks && childrenLinks.length > 0 && (
          <div className="-mx-1 mt-3 flex flex-wrap gap-1.5">
            {childrenLinks.map((c) => (
              <a
                key={c.handle}
                href={`/categories/${c.handle}`}
                className={cn(
                  "rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                )}
              >
                {c.name}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-8 small:grid-cols-[260px_minmax(0,1fr)] small:gap-10">
        <div className="hidden small:block">
          <RefinementList
            sortBy={sortBy}
            activeCategoryHandle={activeCategoryHandle}
            hideSort
          />
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
