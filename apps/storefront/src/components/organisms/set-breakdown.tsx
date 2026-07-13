import * as React from "react";
import Image from "next/image";
import { Layers } from "lucide-react";

import { cn } from "@lib/utils";
import { IMAGE_BG_NEUTRALIZE } from "@/components/organisms/pdp-hero-variants";

export type SetPiece = {
  id: string;
  label: string;
  image?: string;
  qty?: number;
};

type Props = {
  pieceCount: number;
  pieces: SetPiece[];
  tone?: "light" | "dark";
  className?: string;
};

export function SetBreakdown({
  pieceCount,
  pieces,
  tone = "light",
  className,
}: Props) {
  const visualPieces = pieces.filter((piece) => piece.image);
  const textPieces = pieces.filter((piece) => !piece.image);

  if (pieces.length === 0) return null;

  return (
    <div
      className={cn(
        "space-y-4",
        tone === "dark" &&
          "clip-corner-cut-lg bg-foreground p-5 text-background ring-1 ring-background/15 small:p-6",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span
          className={cn(
            "flex items-center gap-2 font-display text-xl font-bold tracking-tight",
            tone === "dark" ? "text-background" : "text-foreground"
          )}
        >
          <Layers className="size-4" />
          Accesorii incluse în pachet
        </span>
        <span className="clip-corner-cut-sm bg-foreground px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-background">
          {pieceCount} {pieceCount === 1 ? "piesă" : "piese"}
        </span>
      </div>

      {visualPieces.length > 0 && (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
          }}
        >
          {visualPieces.map((piece) => {
            const quantity = piece.qty ?? 1;

            return (
              <article
                key={piece.id}
                className="clip-corner-cut-md clip-shadow-sm relative aspect-[1.02] overflow-hidden bg-background ring-1 ring-foreground/10"
              >
                <Image
                  src={piece.image!}
                  alt={piece.label}
                  fill
                  sizes="(min-width: 1024px) 220px, (min-width: 640px) 180px, 44vw"
                  style={IMAGE_BG_NEUTRALIZE}
                  className="object-contain p-4 small:p-5"
                />
                <span className="absolute right-2.5 top-2.5 shrink-0 bg-foreground px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-background">
                  {quantity} {quantity === 1 ? "inclus" : "incluse"}
                </span>
              </article>
            );
          })}
        </div>
      )}

      {textPieces.length > 0 && (
        <div
          className={cn(
            "clip-corner-cut-md p-4 ring-1",
            tone === "dark"
              ? "bg-background/[0.08] ring-background/20"
              : "bg-card ring-border/70"
          )}
        >
          <div>
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.18em]",
                tone === "dark" ? "text-background/70" : "text-muted-foreground"
              )}
            >
              Alte accesorii incluse
            </p>
            <ul className="mt-3 space-y-2">
              {textPieces.map((piece) => (
                <li
                  key={piece.id}
                  className={cn(
                    "flex items-start gap-2 text-sm font-semibold leading-relaxed",
                    tone === "dark" ? "text-background" : "text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "mt-2 size-1.5 shrink-0 rounded-full",
                      tone === "dark" ? "bg-primary" : "bg-foreground"
                    )}
                  />
                  <span>
                    {piece.label}
                    {piece.qty != null && piece.qty > 1 ? ` ×${piece.qty}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
