"use client";

import * as React from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import { ArrowRight } from "lucide-react";

import { cn } from "@lib/utils";
import { Container } from "@/components/atoms/container";
import { categoriesTree } from "@lib/data/categories-tree";
import { getCategoryVisual } from "@lib/data/category-visuals";
import { useShowcasePinned } from "@lib/stores/showcase-pinned";

type Item = (typeof categoriesTree)[number];

export function CategoryMarquee() {
  return (
    <section
      className="bg-background"
      aria-label="Categorii — variantă marquee"
    >
      <MarqueeMobile items={categoriesTree} />
      <MarqueeDesktop items={categoriesTree} />
    </section>
  );
}

function MarqueeMobile({ items }: { items: Item[] }) {
  return (
    <div className="py-12 medium:hidden">
      <Container>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Marquee
        </span>
        <h2 className="mt-2 font-display text-display-sm font-extrabold tracking-tight">
          Categorii populare
        </h2>
      </Container>
      <div className="-mx-4 mt-6 overflow-x-auto px-4">
        <div className="flex gap-4">
          {items.map((cat) => {
            const visual = getCategoryVisual(cat.handle);
            return (
              <Link
                key={cat.handle}
                href={`/categories/${cat.handle}`}
                className="clip-corner-cut-md relative flex h-72 w-72 shrink-0 flex-col justify-end overflow-hidden p-5"
                style={{
                  backgroundImage: `url(${visual.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent"
                />
                <div className="relative z-[1]">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {visual.kicker}
                  </span>
                  <h3 className="mt-1 font-display text-xl font-bold leading-tight text-background">
                    {cat.name}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MarqueeDesktop({ items }: { items: Item[] }) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  const distanceRef = React.useRef(0);
  const x = useMotionValue(0);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const measure = () => {
      const d = track.scrollWidth - viewport.clientWidth;
      distanceRef.current = d > 0 ? d : 0;
      x.set(-scrollYProgress.get() * distanceRef.current);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(track);
    return () => observer.disconnect();
  }, [items.length, x, scrollYProgress]);

  const enterPinned = useShowcasePinned((s) => s.enter);
  const exitPinned = useShowcasePinned((s) => s.exit);
  const isPinnedRef = React.useRef(false);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    x.set(-v * distanceRef.current);

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
    <div
      ref={wrapperRef}
      style={{ height: `${items.length * 100}vh` }}
      className="relative hidden medium:block"
    >
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden bg-foreground text-background">
        <div className="content-container pb-10 pt-12">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Marquee
          </span>
          <h2 className="mt-2 font-display text-display-md font-extrabold tracking-tight">
            Categorii populare
          </h2>
        </div>
        <div ref={viewportRef} className="relative flex-1 overflow-hidden">
          <motion.div
            ref={trackRef}
            style={{ x }}
            className="flex h-full w-max gap-6 px-[5vw] will-change-transform"
          >
            {items.map((cat) => {
              const visual = getCategoryVisual(cat.handle);
              return (
                <Link
                  key={cat.handle}
                  href={`/categories/${cat.handle}`}
                  className={cn(
                    "clip-corner-cut-lg group relative flex h-[60vh] w-[90vw] shrink-0 flex-col justify-end overflow-hidden p-10",
                    "medium:w-[55vw] large:w-[45vw]"
                  )}
                  style={{
                    backgroundImage: `url(${visual.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/40 to-transparent transition-opacity duration-300 group-hover:opacity-95"
                  />
                  <div className="relative z-[1] flex flex-col gap-3">
                    <span className="inline-flex w-fit rounded-full bg-primary/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      {visual.kicker}
                    </span>
                    <h3 className="font-display text-display-sm font-extrabold leading-tight text-background">
                      {cat.name}
                    </h3>
                    <p className="max-w-md text-sm text-background/75">
                      {visual.description}
                    </p>
                    <span className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform group-hover:scale-[1.03]">
                      Vezi categoria
                      <ArrowRight className="size-4" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </motion.div>
        </div>
        <p className="content-container pb-10 pt-4 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-background/50">
          Glisează pentru următoarea categorie
        </p>
      </div>
    </div>
  );
}
