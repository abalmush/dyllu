import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@lib/utils";
import { Container } from "@/components/atoms/container";

export type PromoTileData = {
  title: string;
  ctaLabel: string;
  href: string;
  image: { src: string; alt: string };
  eyebrow?: string;
  titlePosition?: "top-left" | "bottom-center";
};

export interface PromoTileBandProps {
  tiles: PromoTileData[];
  hoverEffect?: "image" | "tile";
}

type GridConfig = { gridClass: string; spans: string[] };

function getGrid(count: number): GridConfig {
  if (count === 1) {
    return {
      gridClass: "medium:grid-cols-4",
      spans: ["medium:col-span-4"],
    };
  }
  if (count === 2) {
    return {
      gridClass: "medium:grid-cols-2",
      spans: ["", ""],
    };
  }
  if (count === 3) {
    return {
      gridClass: "medium:grid-cols-4",
      spans: ["medium:col-span-2", "", ""],
    };
  }
  return {
    gridClass: "medium:grid-cols-5",
    spans: ["medium:col-span-2", "", "", ""],
  };
}

export function PromoTileBand({
  tiles,
  hoverEffect = "image",
}: PromoTileBandProps) {
  const visible = tiles.slice(0, 4);
  if (visible.length === 0) return null;

  const { gridClass, spans } = getGrid(visible.length);

  return (
    <section className="py-8 small:py-12">
      <Container>
        <div
          className={cn(
            "grid grid-cols-1 gap-4 medium:auto-rows-[420px]",
            gridClass
          )}
        >
          {visible.map((tile, i) => (
            <PromoTile
              key={`${tile.title}-${i}`}
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

function PromoTile({
  tile,
  spanClass,
  hoverEffect,
}: {
  tile: PromoTileData;
  spanClass: string;
  hoverEffect: "image" | "tile";
}) {
  const isTopLeft = tile.titlePosition === "top-left";
  return (
    <Link
      href={tile.href}
      aria-label={`${tile.title} — ${tile.ctaLabel}`}
      className={cn(
        "group relative block h-[340px] overflow-hidden bg-foreground medium:h-auto",
        spanClass,
        hoverEffect === "tile" &&
          "transition-all duration-500 ease-out hover:z-10 hover:scale-[1.03] hover:shadow-[0_30px_80px_-20px_rgba(15,23,42,0.6)]"
      )}
    >
      <Image
        src={tile.image.src}
        alt={tile.image.alt}
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className={cn(
          "object-cover object-center transition-transform duration-700 ease-out",
          hoverEffect === "image" && "group-hover:scale-110"
        )}
      />
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-foreground/55 via-transparent to-foreground/80"
      />

      <div
        className={cn(
          "absolute inset-x-0 flex flex-col gap-3 p-6 small:p-8",
          isTopLeft ? "top-0 items-start" : "bottom-24 items-center text-center"
        )}
      >
        {tile.eyebrow && (
          <span className="inline-flex items-center gap-2 rounded-full bg-foreground/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-background backdrop-blur-sm">
            {tile.eyebrow}
          </span>
        )}
        <h3
          className={cn(
            "font-display font-extrabold uppercase leading-[1.05] tracking-tight text-background drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]",
            isTopLeft
              ? "text-3xl small:text-4xl medium:text-5xl"
              : "max-w-[18ch] text-2xl small:text-3xl medium:text-4xl"
          )}
        >
          {tile.title}
        </h3>
      </div>

      <div className="absolute inset-x-6 bottom-6 small:inset-x-8 small:bottom-8">
        <span className="clip-corner-cut-md inline-flex w-full items-center justify-center gap-2 bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all duration-300 group-hover:bg-primary/90">
          {tile.ctaLabel}
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
