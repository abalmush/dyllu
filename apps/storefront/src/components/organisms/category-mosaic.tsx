import * as React from "react";

import { Container } from "@/components/atoms/container";
import { CategoryCard } from "@/components/molecules/category-card";
import { categoriesTree } from "@lib/data/categories-tree";
import { getCategoryVisual } from "@lib/data/category-visuals";

const MOSAIC_SPANS: { className: string; emphasized: boolean }[] = [
  { className: "sm:col-span-5", emphasized: true },
  { className: "sm:col-span-4", emphasized: false },
  { className: "sm:col-span-3", emphasized: false },
  { className: "sm:col-span-4", emphasized: false },
  { className: "sm:col-span-3", emphasized: false },
  { className: "sm:col-span-5", emphasized: true },
];

export function CategoryMosaic() {
  return (
    <section className="py-16 small:py-24">
      <Container>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Categorii populare
            </span>
            <h2 className="mt-2 font-display text-display-sm font-extrabold tracking-tight text-foreground sm:text-display-md">
              Tot ce ai nevoie
              <span className="text-primary"> pentru următorul proiect.</span>
            </h2>
          </div>
          <p className="max-w-md text-sm text-muted-foreground sm:text-right">
            De la atelier la grădină — produse selectate de profesioniști pentru
            profesioniști.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:auto-rows-[300px] sm:grid-cols-12">
          {categoriesTree.map((cat, idx) => {
            const visual = getCategoryVisual(cat.handle);
            const productCount = cat.children.reduce(
              (acc, c) => acc + 1 + c.children.length,
              cat.children.length || 0
            );
            const span = MOSAIC_SPANS[idx % MOSAIC_SPANS.length];
            const emphasized = span.emphasized;
            return (
              <CategoryCard
                key={cat.handle}
                href={`/categories/${cat.handle}`}
                name={cat.name}
                description={visual.description}
                imageUrl={visual.image}
                accent={visual.accent}
                productCount={productCount}
                emphasized={emphasized}
                className={span.className}
              />
            );
          })}
        </div>
      </Container>
    </section>
  );
}
