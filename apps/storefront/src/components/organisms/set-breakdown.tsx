import * as React from "react";
import Image from "next/image";
import { Layers } from "lucide-react";

import { Container } from "@/components/atoms/container";
import { IMAGE_BG_NEUTRALIZE } from "@/components/organisms/pdp-hero-variants";

export type SetPiece = {
  id: string;
  label: string;
  image?: string;
  qty?: number;
};

type Props = {
  title?: string;
  pieceCount: number;
  pieces: SetPiece[];
};

export function SetBreakdown({ title, pieceCount, pieces }: Props) {
  const hasImages = pieces.some((piece) => piece.image);

  return (
    <section className="bg-background py-16 small:py-20">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <Layers className="size-4" />
              Conținutul setului
            </span>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-foreground small:text-3xl">
              {title ?? "Ce conține setul"}
            </h2>
          </div>
          <span className="clip-corner-cut-sm bg-foreground px-4 py-2 text-sm font-bold text-background">
            {pieceCount} piese incluse
          </span>
        </div>

        {hasImages ? (
          <div className="grid grid-cols-2 gap-3 small:grid-cols-4 medium:grid-cols-6">
            {pieces.map((piece) => (
              <div
                key={piece.id}
                className="clip-corner-cut-md relative flex aspect-square flex-col justify-end overflow-hidden bg-card p-2 ring-1 ring-border"
              >
                {piece.image && (
                  <Image
                    src={piece.image}
                    alt={piece.label}
                    fill
                    sizes="160px"
                    style={IMAGE_BG_NEUTRALIZE}
                    className="object-contain p-4"
                  />
                )}
                <span className="relative z-[1] text-[11px] font-semibold leading-tight text-foreground">
                  {piece.label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pieces.map((piece) => (
              <span
                key={piece.id}
                className="clip-corner-cut-xs inline-flex items-center gap-1.5 border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
              >
                {piece.label}
                {piece.qty != null && piece.qty > 1 && (
                  <span className="text-xs font-bold text-primary">
                    ×{piece.qty}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
