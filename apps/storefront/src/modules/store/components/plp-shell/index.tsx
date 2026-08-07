"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Filter } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

import { cn } from "@lib/utils";
import { type CategoryNode } from "@lib/data/categories";
import { Button } from "@/components/atoms/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/atoms/sheet";
import {
  Breadcrumbs,
  type BreadcrumbItem,
} from "@/components/molecules/breadcrumbs";
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
  categories: CategoryNode[];
  children: React.ReactNode;
};

export default function PlpShell({
  title,
  description,
  crumbs,
  sortBy,
  activeCategoryHandle,
  childrenLinks,
  categories,
  children,
}: Props) {
  const t = useTranslations("PlpShell");
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
    <div className="content-container small:py-12 py-8">
      <div className="flex flex-col gap-4">
        <Breadcrumbs items={crumbs} />
        <div className="small:flex-row small:items-end small:justify-between flex flex-col gap-4">
          <div>
            <h1
              className="font-display text-display-sm text-foreground small:text-display-md font-extrabold tracking-tight"
              data-testid={
                activeCategoryHandle
                  ? "category-page-title"
                  : "store-page-title"
              }
            >
              {title}
            </h1>
            {description && (
              <p className="text-muted-foreground small:text-base mt-2 max-w-2xl text-sm">
                {description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SortProducts
              sortBy={sortBy}
              setQueryParams={(_, v) => setQueryParams("sortBy", v)}
            />
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="small:hidden rounded-full">
                  <Filter className="size-4" /> {t("filters")}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex w-full max-w-sm flex-col gap-4 p-0"
              >
                <SheetHeader className="border-border border-b px-6 py-6">
                  <SheetTitle>{t("filters")}</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-6">
                  <RefinementList
                    sortBy={sortBy}
                    categories={categories}
                    activeCategoryHandle={activeCategoryHandle}
                    className="static border-0 p-0 shadow-none"
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        {childrenLinks && childrenLinks.length > 0 && (
          <div className="-mx-1 mt-4 flex flex-wrap gap-1.5">
            {childrenLinks.map((c) => (
              <Link
                key={c.handle}
                href={`/categories/${c.handle}`}
                className={cn(
                  "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:bg-muted hover:text-foreground rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors"
                )}
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="small:grid-cols-[260px_minmax(0,1fr)] small:gap-12 mt-8 grid gap-8">
        <div className="small:block hidden">
          <RefinementList
            sortBy={sortBy}
            categories={categories}
            activeCategoryHandle={activeCategoryHandle}
            hideSort
          />
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
