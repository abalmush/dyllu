"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
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
    <div className="medium:hidden py-12">
      <Container>
        <span className="text-2xs text-primary font-semibold tracking-[0.18em] uppercase">
          Marquee
        </span>
        <h2 className="font-display text-display-sm mt-2 font-extrabold tracking-tight">
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
                className="clip-corner-cut-md relative flex h-72 w-72 shrink-0 flex-col justify-end overflow-hidden p-6"
                style={{
                  backgroundImage: `url(${visual.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <span
                  aria-hidden
                  className="from-foreground/85 via-foreground/30 absolute inset-0 bg-linear-to-t to-transparent"
                />
                <div className="relative z-1">
                  <span className="text-2xs text-primary font-semibold tracking-[0.18em] uppercase">
                    {visual.kicker}
                  </span>
                  <h3 className="font-display text-background mt-1 text-xl leading-tight font-bold">
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
      className="medium:block relative hidden"
    >
      <div className="bg-foreground text-background sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="content-container pt-12 pb-12">
          <span className="text-2xs text-primary font-semibold tracking-[0.18em] uppercase">
            Marquee
          </span>
          <h2 className="font-display text-display-md mt-2 font-extrabold tracking-tight">
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
                    "clip-corner-cut-lg group relative flex h-[60vh] w-[90vw] shrink-0 flex-col justify-end overflow-hidden p-12",
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
                    className="from-foreground/90 via-foreground/40 absolute inset-0 bg-linear-to-t to-transparent transition-opacity duration-300 group-hover:opacity-95"
                  />
                  <div className="relative z-1 flex flex-col gap-4">
                    <span className="bg-primary/20 text-2xs text-primary inline-flex w-fit rounded-full px-4 py-1 font-semibold tracking-[0.18em] uppercase">
                      {visual.kicker}
                    </span>
                    <h3 className="font-display text-display-sm text-background leading-tight font-extrabold">
                      {cat.name}
                    </h3>
                    <p className="text-background/75 max-w-md text-sm">
                      {visual.description}
                    </p>
                    <span className="bg-primary text-primary-foreground mt-4 inline-flex w-fit items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-transform group-hover:scale-[1.03]">
                      Vezi categoria
                      <ArrowRight className="size-4" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </motion.div>
        </div>
        <p className="content-container text-2xs text-background/50 pt-4 pb-12 text-center font-mono font-semibold tracking-[0.18em] uppercase">
          Glisează pentru următoarea categorie
        </p>
      </div>
    </div>
  );
}
