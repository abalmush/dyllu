"use client";

import * as React from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

import { Container } from "@/components/atoms/container";
import { CategoryCard } from "@/components/molecules/category-card";
import { categoriesTree } from "@lib/data/categories-tree";
import { getCategoryVisual } from "@lib/data/category-visuals";
import { useShowcasePinned } from "@lib/stores/showcase-pinned";

type Item = (typeof categoriesTree)[number];

const MOSAIC_SPANS: { className: string; emphasized: boolean }[] = [
  { className: "sm:col-span-5", emphasized: true },
  { className: "sm:col-span-4", emphasized: false },
  { className: "sm:col-span-3", emphasized: false },
  { className: "sm:col-span-4", emphasized: false },
  { className: "sm:col-span-3", emphasized: false },
  { className: "sm:col-span-5", emphasized: true },
];

export function CategoryMosaicReveal() {
  return (
    <>
      <RevealMobile items={categoriesTree} />
      <RevealDesktop items={categoriesTree} />
    </>
  );
}

function RevealHeader() {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Categorii populare — reveal
        </span>
        <h2 className="mt-2 font-display text-display-sm font-extrabold tracking-tight text-foreground sm:text-display-md">
          Tot ce ai nevoie
          <span className="text-primary"> pentru următorul proiect.</span>
        </h2>
      </div>
      <p className="max-w-md text-sm text-muted-foreground sm:text-right">
        Mosaicul existent — secțiunea rămâne pe loc, cardurile apar pe măsură ce
        derulezi.
      </p>
    </div>
  );
}

function RevealMobile({ items }: { items: Item[] }) {
  return (
    <section className="medium:hidden py-16 small:py-24">
      <Container>
        <RevealHeader />
        <div className="mt-10 grid gap-4 sm:auto-rows-[280px] sm:grid-cols-12">
          {items.map((cat, idx) => {
            const visual = getCategoryVisual(cat.handle);
            const productCount = cat.children.reduce(
              (acc, c) => acc + 1 + c.children.length,
              cat.children.length || 0
            );
            const span = MOSAIC_SPANS[idx % MOSAIC_SPANS.length];
            return (
              <motion.div
                key={cat.handle}
                className={span.className}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                  delay: idx * 0.06,
                }}
              >
                <CategoryCard
                  href={`/categories/${cat.handle}`}
                  name={cat.name}
                  description={visual.description}
                  imageUrl={visual.image}
                  accent={visual.accent}
                  productCount={productCount}
                  emphasized={span.emphasized}
                />
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

function RevealDesktop({ items }: { items: Item[] }) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  const enterPinned = useShowcasePinned((s) => s.enter);
  const exitPinned = useShowcasePinned((s) => s.exit);
  const isPinnedRef = React.useRef(false);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const isDesktopViewport =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1280px)").matches;
    const shouldPin = isDesktopViewport && v > 0 && v < 1;
    if (shouldPin && !isPinnedRef.current) {
      isPinnedRef.current = true;
      enterPinned();
    } else if (!shouldPin && isPinnedRef.current) {
      isPinnedRef.current = false;
      exitPinned();
    }
  });

  React.useEffect(() => {
    return () => {
      if (isPinnedRef.current) {
        exitPinned();
        isPinnedRef.current = false;
      }
    };
  }, [exitPinned]);

  return (
    <section
      ref={wrapperRef}
      style={{ height: "280vh" }}
      className="relative hidden medium:block"
      aria-label="Categorii populare — reveal"
    >
      <div className="sticky top-0 flex h-screen w-full flex-col justify-center overflow-hidden bg-background">
        <Container>
          <RevealHeader />
          <div className="mt-10 grid gap-4 sm:auto-rows-[clamp(220px,30vh,300px)] sm:grid-cols-12">
            {items.map((cat, idx) => (
              <RevealCard
                key={cat.handle}
                cat={cat}
                idx={idx}
                total={items.length}
                progress={scrollYProgress}
              />
            ))}
          </div>
        </Container>
      </div>
    </section>
  );
}

function RevealCard({
  cat,
  idx,
  total,
  progress,
}: {
  cat: Item;
  idx: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const visual = getCategoryVisual(cat.handle);
  const productCount = cat.children.reduce(
    (acc, c) => acc + 1 + c.children.length,
    cat.children.length || 0
  );
  const span = MOSAIC_SPANS[idx % MOSAIC_SPANS.length];

  const stride = 0.9 / total;
  const start = 0.05 + idx * stride;
  const end = start + stride * 0.85;

  const opacity = useTransform(progress, [start, end], [0, 1], {
    clamp: true,
  });
  const y = useTransform(progress, [start, end], [80, 0], { clamp: true });
  const scale = useTransform(progress, [start, end], [0.88, 1], {
    clamp: true,
  });

  return (
    <motion.div className={span.className} style={{ opacity, y, scale }}>
      <CategoryCard
        href={`/categories/${cat.handle}`}
        name={cat.name}
        description={visual.description}
        imageUrl={visual.image}
        accent={visual.accent}
        productCount={productCount}
        emphasized={span.emphasized}
      />
    </motion.div>
  );
}
