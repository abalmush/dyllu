"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@lib/utils";
import { Button } from "@/components/atoms/button";

type Props = {
  page: number;
  totalPages: number;
  "data-testid"?: string;
};

export function Pagination({ page, totalPages, "data-testid": dataTestid }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goTo = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", next.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const range = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const buildPages = (): Array<number | "ellipsis"> => {
    if (totalPages <= 7) return range(1, totalPages);
    if (page <= 4) return [...range(1, 5), "ellipsis", totalPages];
    if (page >= totalPages - 3) return [1, "ellipsis", ...range(totalPages - 4, totalPages)];
    return [1, "ellipsis", ...range(page - 1, page + 1), "ellipsis", totalPages];
  };

  return (
    <nav
      aria-label="Paginare"
      className="flex w-full items-center justify-center gap-1.5"
      data-testid={dataTestid}
    >
      <Button
        variant="outline"
        size="icon"
        className="rounded-full"
        onClick={() => goTo(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label="Pagina anterioară"
      >
        <ChevronLeft className="size-4" />
      </Button>
      {buildPages().map((p, i) => {
        if (p === "ellipsis") {
          return (
            <span
              key={`ellipsis-${i}`}
              className="grid size-9 place-items-center text-muted-foreground"
            >
              <MoreHorizontal className="size-4" />
            </span>
          );
        }
        const isCurrent = p === page;
        return (
          <button
            key={p}
            type="button"
            onClick={() => goTo(p)}
            disabled={isCurrent}
            aria-current={isCurrent ? "page" : undefined}
            className={cn(
              "grid size-9 place-items-center rounded-full text-sm font-medium tracking-tight transition-colors",
              isCurrent
                ? "bg-foreground text-background"
                : "text-foreground hover:bg-muted"
            )}
          >
            {p}
          </button>
        );
      })}
      <Button
        variant="outline"
        size="icon"
        className="rounded-full"
        onClick={() => goTo(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        aria-label="Pagina următoare"
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}
