"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { cn } from "@lib/utils";
import { categoriesTree } from "@lib/data/categories-tree";
import { getCategoryVisual } from "@lib/data/category-visuals";

type Item = (typeof categoriesTree)[number];

const SLIDE_DURATION_MS = 6000;

export function CategoryCinematic() {
  return (
    <section
      className="bg-foreground text-background"
      aria-label="Categorii — variantă cinematic"
    >
      <CinematicMobile items={categoriesTree} />
      <CinematicDesktop items={categoriesTree} />
    </section>
  );
}

function CinematicMobile({ items }: { items: Item[] }) {
  return (
    <div className="medium:hidden">
      <div className="content-container py-12">
        <span className="text-2xs text-primary font-semibold tracking-[0.18em] uppercase">
          Cinematic
        </span>
        <h2 className="font-display text-display-sm mt-2 font-extrabold tracking-tight">
          Categorii populare
        </h2>
      </div>
      <div className="flex flex-col gap-4 px-4 pb-12">
        {items.map((cat) => {
          const visual = getCategoryVisual(cat.handle);
          return (
            <Link
              key={cat.handle}
              href={`/categories/${cat.handle}`}
              className="clip-corner-cut-md relative flex h-64 flex-col justify-end overflow-hidden p-6"
              style={{
                backgroundImage: `url(${visual.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <span
                aria-hidden
                className="from-foreground/85 via-foreground/40 absolute inset-0 bg-linear-to-t to-transparent"
              />
              <div className="relative z-1 flex items-end justify-between gap-4">
                <div>
                  <span className="text-2xs text-primary font-semibold tracking-[0.18em] uppercase">
                    {visual.kicker}
                  </span>
                  <h3 className="font-display mt-1 text-2xl leading-tight font-bold">
                    {cat.name}
                  </h3>
                </div>
                <span className="bg-primary text-primary-foreground grid size-9 shrink-0 place-items-center rounded-full">
                  <ArrowRight className="size-4" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CinematicDesktop({ items }: { items: Item[] }) {
  const total = items.length;
  const [active, setActive] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  React.useEffect(() => {
    if (isPaused || reducedMotion) return;
    const id = window.setTimeout(() => {
      setActive((prev) => (prev + 1) % total);
    }, SLIDE_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [active, isPaused, reducedMotion, total]);

  return (
    <div
      className="medium:block relative hidden h-screen w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {items.map((cat, idx) => {
        const visual = getCategoryVisual(cat.handle);
        const isActive = idx === active;
        return (
          <div
            key={cat.handle}
            aria-hidden={!isActive}
            className={cn(
              "absolute inset-0 transition-all duration-700 ease-out",
              isActive
                ? "scale-100 opacity-100"
                : "pointer-events-none scale-105 opacity-0"
            )}
            style={{
              backgroundImage: `url(${visual.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <span
              aria-hidden
              className="from-foreground/90 via-foreground/45 absolute inset-0 bg-linear-to-t to-transparent"
            />
            <div className="content-container relative z-1 flex h-full items-end pb-24">
              <div className="flex max-w-2xl flex-col gap-4">
                <span className="bg-primary/20 text-2xs text-primary inline-flex w-fit rounded-full px-4 py-1 font-semibold tracking-[0.18em] uppercase">
                  {visual.kicker}
                </span>
                <h2 className="font-display text-display-lg leading-[0.95] font-extrabold tracking-tight">
                  {cat.name}
                </h2>
                <p className="text-background/75 max-w-md text-base">
                  {visual.description}
                </p>
                <Link
                  href={`/categories/${cat.handle}`}
                  className="bg-primary text-primary-foreground mt-2 inline-flex w-fit items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02]"
                >
                  Vezi categoria
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      <div className="absolute bottom-8 left-1/2 z-2 flex -translate-x-1/2 items-center gap-2">
        {items.map((cat, idx) => {
          const isActive = idx === active;
          return (
            <button
              key={cat.handle}
              type="button"
              aria-label={`Sari la ${cat.name}`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => setActive(idx)}
              className={cn(
                "relative h-1.5 overflow-hidden rounded-full transition-all duration-500",
                isActive ? "bg-background/25 w-12" : "bg-background/30 w-5"
              )}
            >
              {isActive && !reducedMotion && (
                <motion.span
                  key={active}
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{
                    duration: SLIDE_DURATION_MS / 1000,
                    ease: "linear",
                  }}
                  className="bg-primary absolute inset-y-0 left-0"
                  style={{
                    animationPlayState: isPaused ? "paused" : "running",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
