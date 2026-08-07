import * as React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
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
    <section className="small:py-12 py-8">
      <Container>
        <div
          className={cn(
            "medium:auto-rows-[420px] grid grid-cols-1 gap-4",
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
        "group bg-foreground medium:h-auto relative block h-[340px] overflow-hidden",
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
        className="from-foreground/55 to-foreground/80 absolute inset-0 bg-linear-to-b via-transparent"
      />

      <div
        className={cn(
          "small:p-8 absolute inset-x-0 flex flex-col gap-4 p-6",
          isTopLeft ? "top-0 items-start" : "bottom-24 items-center text-center"
        )}
      >
        {tile.eyebrow && (
          <span className="bg-foreground/80 text-2xs text-background inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-semibold tracking-[0.18em] uppercase backdrop-blur-xs">
            {tile.eyebrow}
          </span>
        )}
        <h3
          className={cn(
            "font-display text-background leading-[1.05] font-extrabold tracking-tight uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]",
            isTopLeft
              ? "small:text-4xl medium:text-5xl text-3xl"
              : "small:text-3xl medium:text-4xl max-w-[18ch] text-2xl"
          )}
        >
          {tile.title}
        </h3>
      </div>

      <div className="small:inset-x-8 small:bottom-8 absolute inset-x-6 bottom-6">
        <span className="clip-corner-cut-md bg-primary text-primary-foreground group-hover:bg-primary/90 inline-flex w-full items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold transition-all duration-300">
          {tile.ctaLabel}
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
