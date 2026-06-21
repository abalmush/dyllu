import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@lib/utils";
import { Container } from "@/components/atoms/container";

export type SystemTileBackground =
  | { type: "image"; src: string; alt: string }
  | { type: "video"; src: string; poster?: string; alt: string };

export type SystemTileData = {
  background: SystemTileBackground;
  headline: React.ReactNode;
  subtitle?: string;
  ctaLabel: string;
  href: string;
};

export interface SystemsGridProps {
  title?: string;
  tiles: SystemTileData[];
  hoverEffect?: "image" | "tile";
}

function getLayout(count: number): string[] {
  switch (count) {
    case 1:
      return ["medium:col-span-6 medium:row-span-5"];
    case 2:
      return [
        "medium:col-span-3 medium:row-span-5",
        "medium:col-span-3 medium:row-span-5",
      ];
    case 3:
      return [
        "medium:col-span-2 medium:row-span-5",
        "medium:col-span-2 medium:row-span-5",
        "medium:col-span-2 medium:row-span-5",
      ];
    case 4:
      return [
        "medium:col-span-2 medium:row-span-5",
        "medium:col-span-2 medium:row-span-5",
        "medium:col-span-1 medium:row-span-5",
        "medium:col-span-1 medium:row-span-5",
      ];
    default:
      return [
        "medium:col-span-2 medium:row-span-5",
        "medium:col-span-2 medium:row-span-5",
        "medium:col-span-2 medium:row-span-2",
        "medium:col-span-1 medium:row-span-3",
        "medium:col-span-1 medium:row-span-3",
      ];
  }
}

export function SystemsGrid({
  title,
  tiles,
  hoverEffect = "image",
}: SystemsGridProps) {
  const visible = tiles.slice(0, 5);
  if (visible.length === 0) return null;

  const spans = getLayout(visible.length);

  return (
    <section className="py-12 small:py-20">
      <Container>
        {title && (
          <h2 className="mb-8 text-center font-display text-2xl font-extrabold uppercase tracking-tight text-foreground small:mb-12 small:text-3xl medium:text-4xl">
            {title}
          </h2>
        )}
        <div className="grid grid-cols-1 gap-3 medium:auto-rows-[120px] medium:grid-cols-6 medium:gap-4">
          {visible.map((tile, i) => (
            <SystemTile
              key={i}
              tile={tile}
              spanClass={spans[i] ?? ""}
              hoverEffect={hoverEffect}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}

function SystemTile({
  tile,
  spanClass,
  hoverEffect,
}: {
  tile: SystemTileData;
  spanClass: string;
  hoverEffect: "image" | "tile";
}) {
  return (
    <Link
      href={tile.href}
      aria-label={`${tile.subtitle ?? ""} ${tile.ctaLabel}`.trim()}
      className={cn(
        "group relative block h-[320px] overflow-hidden bg-foreground medium:h-auto",
        spanClass,
        hoverEffect === "tile" &&
          "transition-all duration-500 ease-out hover:z-10 hover:scale-[1.03] hover:shadow-[0_30px_80px_-20px_rgba(15,23,42,0.6)]"
      )}
    >
      <TileBackground background={tile.background} hoverEffect={hoverEffect} />

      <span aria-hidden className="absolute inset-0 bg-foreground/55" />

      <div className="absolute inset-x-0 top-1/2 flex -translate-y-[58%] flex-col items-center gap-3 px-6 text-center">
        <div className="font-display font-extrabold uppercase leading-[1.05] tracking-tight text-background drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
          {tile.headline}
        </div>
        {tile.subtitle && (
          <p className="max-w-[26ch] text-xs font-semibold uppercase tracking-[0.18em] text-background/80 small:text-sm">
            {tile.subtitle}
          </p>
        )}
      </div>

      <div className="absolute inset-x-5 bottom-5 small:inset-x-6 small:bottom-6">
        <span className="clip-corner-cut-md inline-flex w-full items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all duration-300 group-hover:bg-primary/90">
          {tile.ctaLabel}
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

function TileBackground({
  background,
  hoverEffect,
}: {
  background: SystemTileBackground;
  hoverEffect: "image" | "tile";
}) {
  const scaleClass =
    hoverEffect === "image"
      ? "transition-transform duration-700 ease-out group-hover:scale-110"
      : "";

  if (background.type === "image") {
    return (
      <Image
        src={background.src}
        alt={background.alt}
        fill
        sizes="(min-width: 1024px) 33vw, 100vw"
        className={cn("object-cover object-center", scaleClass)}
      />
    );
  }

  return (
    <video
      src={background.src}
      poster={background.poster}
      autoPlay
      loop
      muted
      playsInline
      aria-label={background.alt}
      className={cn("absolute inset-0 size-full object-cover", scaleClass)}
    />
  );
}
