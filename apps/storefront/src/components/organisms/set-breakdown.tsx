import * as React from "react";
import Image from "next/image";
import { BatteryFull, Briefcase, Plug } from "lucide-react";

import { cn } from "@lib/utils";
import { IMAGE_BG_NEUTRALIZE } from "@/components/organisms/pdp-hero-variants";

export type SetPiece = {
  id: string;
  label: string;
  image?: string;
  qty?: number;
  kind?: "battery" | "charger";
  sku?: string;
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
  const visualPieces = pieces.filter((piece) => piece.image || piece.kind);
  const textPieces = pieces.filter((piece) => !piece.image && !piece.kind);

  if (pieces.length === 0) return null;

  return (
    <div
      className={cn(
        tone === "dark" ? "relative pt-9 pb-2" : "space-y-4",
        className
      )}
    >
      {tone === "dark" && (
        <>
          <div
            aria-hidden="true"
            className="border-foreground absolute top-0 left-1/2 z-10 h-12 w-40 -translate-x-1/2 rounded-t-3xl border-[14px] border-b-0"
          >
            <span className="bg-foreground absolute top-7 -left-6 h-5 w-10 rounded-t-lg" />
            <span className="bg-foreground absolute top-7 -right-6 h-5 w-10 rounded-t-lg" />
          </div>
          <div
            aria-hidden="true"
            className="absolute top-9 left-1/2 z-20 flex -translate-x-1/2 gap-14"
          >
            <span className="bg-primary h-2.5 w-8 rounded-b-md" />
            <span className="bg-primary h-2.5 w-8 rounded-b-md" />
          </div>
          <span
            aria-hidden="true"
            className="bg-foreground absolute bottom-0 left-12 h-3 w-14 rounded-b-md"
          />
          <span
            aria-hidden="true"
            className="bg-foreground absolute right-12 bottom-0 h-3 w-14 rounded-b-md"
          />
        </>
      )}
      <div
        className={cn(
          "space-y-4",
          tone === "dark" &&
            "clip-corner-cut-lg clip-shadow-xl bg-foreground text-background small:p-6 ring-foreground p-6 ring-[5px]"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <span
            className={cn(
              "font-display flex items-center gap-2 text-xl font-bold tracking-tight",
              tone === "dark" ? "text-background" : "text-foreground"
            )}
          >
            <Briefcase className="size-5" />
            Ce este inclus
          </span>
          <span className="clip-corner-cut-sm bg-foreground text-2xs text-background px-4 py-1.5 font-bold tracking-[0.14em] uppercase">
            {pieceCount} {pieceCount === 1 ? "piesă" : "piese"}
          </span>
        </div>

        {visualPieces.length > 0 && (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
            }}
          >
            {visualPieces.map((piece, index) => {
              const quantity = piece.qty ?? 1;
              const visualKey = piece.id
                ? `${piece.id}-${index}`
                : `visual-${index}`;

              return (
                <article
                  key={visualKey}
                  data-testid={
                    piece.kind
                      ? `included-power-accessory-${piece.sku ?? piece.kind}`
                      : undefined
                  }
                  className={cn(
                    "clip-corner-cut-md clip-shadow-sm relative aspect-[1.02] overflow-hidden ring-1",
                    visualPieces.length === 1 && "w-full max-w-64",
                    tone === "dark"
                      ? "bg-background/10 ring-background/20"
                      : "bg-background ring-foreground/10"
                  )}
                >
                  {piece.image ? (
                    <Image
                      src={piece.image}
                      alt={piece.label}
                      fill
                      sizes="(min-width: 1024px) 220px, (min-width: 640px) 180px, 44vw"
                      style={IMAGE_BG_NEUTRALIZE}
                      className="small:p-6 object-contain p-4"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-4 p-5 text-center">
                      <span className="bg-primary text-foreground grid size-14 place-items-center rounded-full">
                        {piece.kind === "battery" ? (
                          <BatteryFull className="size-7" aria-hidden="true" />
                        ) : (
                          <Plug className="size-7" aria-hidden="true" />
                        )}
                      </span>
                      <p className="text-sm leading-snug font-bold">
                        {piece.label}
                      </p>
                    </div>
                  )}
                  {quantity > 1 && (
                    <span className="bg-primary text-foreground absolute top-2.5 right-2.5 rounded-md px-3 py-1.5 text-sm leading-none font-extrabold">
                      {`×${quantity}`}
                    </span>
                  )}
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
                ? "bg-background/10 ring-background/20"
                : "bg-card ring-border/70"
            )}
          >
            <div>
              <p
                className={cn(
                  "text-2xs font-semibold tracking-[0.18em] uppercase",
                  tone === "dark"
                    ? "text-background/70"
                    : "text-muted-foreground"
                )}
              >
                În cutie mai găsești
              </p>
              <ul className="mt-4 space-y-2">
                {textPieces.map((piece, index) => (
                  <li
                    key={piece.id ? `${piece.id}-${index}` : `text-${index}`}
                    className={cn(
                      "flex items-start gap-2 text-sm leading-relaxed font-semibold",
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
                      {piece.qty != null && piece.qty > 1
                        ? ` ×${piece.qty}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
