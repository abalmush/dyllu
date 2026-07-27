"use client";

import * as React from "react";
import Image from "next/image";
import { useMotionValueEvent, useScroll } from "framer-motion";

import { cn } from "@lib/utils";
import { useShowcasePinned } from "@lib/stores/showcase-pinned";
import { Eyebrow } from "@/components/molecules/eyebrow";

export type AnatomyItem = {
  key: string;
  label: string;
  description: string;
  image: { src: string; alt: string };
};

export interface AnatomyShowcaseProps {
  eyebrow?: string;
  title: string;
  intro?: string;
  items: AnatomyItem[];
}

export function AnatomyShowcase({
  eyebrow,
  title,
  intro,
  items,
}: AnatomyShowcaseProps) {
  return (
    <section className="bg-foreground text-background" aria-label={title}>
      <MobileShowcase
        eyebrow={eyebrow}
        title={title}
        intro={intro}
        items={items}
      />
      <DesktopShowcase
        eyebrow={eyebrow}
        title={title}
        intro={intro}
        items={items}
      />
    </section>
  );
}

function ShowcaseHeader({
  eyebrow,
  title,
  intro,
}: Pick<AnatomyShowcaseProps, "eyebrow" | "title" | "intro">) {
  return (
    <header className="flex flex-col gap-4">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <div className="small:flex-row small:items-end small:justify-between flex flex-col gap-4">
        <h2 className="font-display text-display-sm text-background small:text-display-md font-extrabold tracking-tight">
          {title}
        </h2>
        {intro && (
          <p className="text-background/65 small:text-base max-w-md text-sm">
            {intro}
          </p>
        )}
      </div>
    </header>
  );
}

function MobileShowcase({
  eyebrow,
  title,
  intro,
  items,
}: AnatomyShowcaseProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const container = scrollerRef.current;
    if (!container) return;
    const cards = container.querySelectorAll<HTMLElement>(
      "[data-anatomy-card]"
    );

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIdx = -1;
        let bestRatio = 0;
        entries.forEach((entry) => {
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            const idx = Number(entry.target.getAttribute("data-anatomy-index"));
            if (!Number.isNaN(idx)) bestIdx = idx;
          }
        });
        if (bestIdx >= 0 && bestRatio > 0.6) setActive(bestIdx);
      },
      {
        root: container,
        threshold: [0.4, 0.6, 0.8, 1],
      }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [items]);

  const handleDotClick = (index: number) => {
    const container = scrollerRef.current;
    if (!container) return;
    const card = container.querySelector<HTMLElement>(
      `[data-anatomy-index="${index}"]`
    );
    if (!card) return;
    container.scrollTo({
      left: card.offsetLeft - container.offsetLeft,
      behavior: "smooth",
    });
  };

  return (
    <div className="content-container medium:hidden relative flex flex-col gap-6 py-12">
      <div
        aria-hidden
        className="bg-brand-radial pointer-events-none absolute inset-0 opacity-50"
      />
      <div className="relative z-1">
        <ShowcaseHeader eyebrow={eyebrow} title={title} intro={intro} />
      </div>

      <div
        ref={scrollerRef}
        className="no-scrollbar relative -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2"
        style={{ scrollPaddingInline: "1rem" }}
      >
        {items.map((item, idx) => (
          <article
            key={item.key}
            data-anatomy-card
            data-anatomy-index={idx}
            className="clip-corner-cut-md bg-secondary/40 relative w-[82vw] max-w-sm shrink-0 snap-center overflow-hidden"
          >
            <div className="relative aspect-4/5 w-full">
              <Image
                src={item.image.src}
                alt={item.image.alt}
                fill
                sizes="82vw"
                className="object-cover"
              />
              <div
                aria-hidden
                className="from-foreground/80 via-foreground/30 absolute inset-0 bg-linear-to-t to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <span className="text-2xs text-primary block font-semibold tracking-[0.22em] uppercase">
                  {String(idx + 1).padStart(2, "0")} /{" "}
                  {String(items.length).padStart(2, "0")}
                </span>
                <h3 className="font-display mt-1 text-xl font-bold tracking-tight">
                  {item.label}
                </h3>
              </div>
            </div>
            <p className="text-background/75 px-6 py-4 text-sm leading-relaxed">
              {item.description}
            </p>
          </article>
        ))}
      </div>

      <div className="relative z-1 flex items-center justify-center gap-2">
        {items.map((item, idx) => (
          <button
            key={item.key}
            type="button"
            onClick={() => handleDotClick(idx)}
            aria-label={`Vezi ${item.label}`}
            aria-current={idx === active ? "true" : undefined}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              idx === active
                ? "bg-primary w-8"
                : "bg-background/30 hover:bg-background/50 w-1.5"
            )}
          />
        ))}
      </div>

      <p className="text-2xs text-background/50 relative z-1 text-center font-mono font-semibold tracking-[0.18em] uppercase">
        Glisează pentru următoarea piesă
      </p>
    </div>
  );
}

function DesktopShowcase({
  eyebrow,
  title,
  intro,
  items,
}: AnatomyShowcaseProps) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  const [active, setActive] = React.useState(0);
  const [progress, setProgress] = React.useState(0);

  const enterPinned = useShowcasePinned((state) => state.enter);
  const exitPinned = useShowcasePinned((state) => state.exit);
  const isPinnedRef = React.useRef(false);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setProgress(v);
    const segments = items.length;
    const next = Math.min(segments - 1, Math.max(0, Math.floor(v * segments)));
    setActive((prev) => (prev === next ? prev : next));

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

  const total = items.length;
  const totalHeight = `${total * 100}vh`;

  const handleJumpTo = (index: number) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const start = window.scrollY + rect.top;
    const segmentHeight = wrapper.offsetHeight / total;
    const target = start + segmentHeight * index + segmentHeight / 2;
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <div
      ref={wrapperRef}
      style={{ height: totalHeight }}
      className="medium:block relative hidden"
    >
      <div className="sticky top-0 flex h-screen w-full flex-col overflow-hidden">
        <div
          aria-hidden
          className="bg-brand-radial pointer-events-none absolute inset-0 opacity-60"
        />
        <div
          aria-hidden
          className="ds-grid-bg pointer-events-none absolute inset-0 opacity-10"
        />

        <div className="content-container relative z-1 flex h-full flex-col gap-12 py-16">
          <ShowcaseHeader eyebrow={eyebrow} title={title} intro={intro} />

          <div className="grid flex-1 grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-12 overflow-hidden">
            <ol className="flex shrink-0 flex-col gap-1.5 self-center">
              {items.map((item, idx) => {
                const isActive = idx === active;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => handleJumpTo(idx)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "group relative flex w-full items-start gap-4 rounded-xl border border-transparent px-4 py-4 text-left transition-all duration-300",
                        isActive
                          ? "border-primary/40 bg-primary/10 text-background"
                          : "text-background/55 hover:bg-background/5 hover:text-background/80"
                      )}
                    >
                      <span
                        className={cn(
                          "text-2xs mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full font-mono font-semibold transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-background/10 text-background/60 group-hover:bg-background/20"
                        )}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-display block text-lg font-bold tracking-tight">
                          {item.label}
                        </span>
                        <span
                          className={cn(
                            "text-background/65 mt-1 block overflow-hidden text-xs leading-relaxed transition-[max-height,opacity] duration-300",
                            isActive
                              ? "max-h-32 opacity-100"
                              : "max-h-0 opacity-0"
                          )}
                        >
                          {item.description}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="clip-corner-cut-lg bg-secondary/40 relative isolate overflow-hidden">
              {items.map((item, idx) => {
                const isActive = idx === active;
                return (
                  <div
                    key={item.key}
                    aria-hidden={!isActive}
                    className={cn(
                      "absolute inset-0 transition-[opacity,transform] duration-700 ease-out",
                      isActive
                        ? "scale-100 opacity-100"
                        : "scale-[1.04] opacity-0"
                    )}
                  >
                    <Image
                      src={item.image.src}
                      alt={item.image.alt}
                      fill
                      sizes="60vw"
                      className="object-cover"
                      priority={idx === 0}
                    />
                    <div
                      aria-hidden
                      className="from-foreground/70 via-foreground/10 absolute inset-0 bg-linear-to-tr to-transparent"
                    />
                  </div>
                );
              })}
              <div className="absolute inset-x-0 bottom-0 z-2 flex items-end justify-between gap-4 p-8">
                <div className="max-w-md">
                  <span className="text-2xs text-primary block font-semibold tracking-[0.22em] uppercase">
                    {String(active + 1).padStart(2, "0")} /{" "}
                    {String(total).padStart(2, "0")}
                  </span>
                  <h3 className="font-display mt-2 text-3xl font-bold tracking-tight">
                    {items[active]?.label}
                  </h3>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-1 mt-auto flex items-center gap-4">
            <span className="text-background/55 font-mono text-xs font-semibold tracking-[0.2em] uppercase">
              Scroll pentru următoarea piesă
            </span>
            <div className="bg-background/15 relative h-px flex-1 overflow-hidden">
              <div
                className="bg-primary absolute inset-y-0 left-0"
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  transition: "width 0.1s linear",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
