"use client";

import * as React from "react";
import Image from "next/image";
import { ZoomIn } from "lucide-react";
import { HttpTypes } from "@medusajs/types";

import { cn } from "@lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/atoms/dialog";

type Props = {
  images: HttpTypes.StoreProductImage[];
};

export default function ImageGallery({ images }: Props) {
  const [active, setActive] = React.useState(0);
  const [zoomOpen, setZoomOpen] = React.useState(false);
  const safeImages = images?.length ? images : [];
  const current = safeImages[active];

  return (
    <div className="grid w-full gap-4 small:grid-cols-[88px_1fr] small:items-start">
      <div className="no-scrollbar order-2 flex gap-3 overflow-x-auto pb-1 small:order-1 small:max-h-[640px] small:flex-col small:overflow-y-auto small:pb-0 small:pr-1">
        {safeImages.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Imaginea ${i + 1}`}
            className={cn(
              "relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-surface-subtle transition-[border-color,box-shadow,opacity,transform] small:w-full",
              active === i
                ? "border-foreground shadow-md"
                : "border-transparent opacity-70 hover:opacity-100"
            )}
          >
            {img.url && (
              <Image
                src={img.url}
                alt={`Miniatura ${i + 1}`}
                fill
                sizes="88px"
                className="object-cover"
              />
            )}
          </button>
        ))}
      </div>

      <div className="order-1 small:order-2">
        <button
          type="button"
          onClick={() => current && setZoomOpen(true)}
          className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl bg-surface-subtle"
          aria-label="Mărește imaginea"
        >
          {current?.url ? (
            <Image
              src={current.url}
              alt="Imagine produs"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 720px"
              className="object-contain p-6 transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-muted-foreground">
              Fără imagine
            </div>
          )}
          <span className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground opacity-0 shadow transition-opacity group-hover:opacity-100">
            <ZoomIn className="size-3.5" /> Mărește
          </span>
          {safeImages.length > 1 && (
            <span className="absolute bottom-4 right-4 rounded-full bg-foreground/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-background">
              {active + 1} / {safeImages.length}
            </span>
          )}
        </button>
      </div>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="grid h-[92vh] max-w-[1080px] grid-rows-[auto_1fr_auto] gap-4 overflow-hidden bg-background p-0 sm:rounded-2xl">
          <DialogTitle className="px-6 pt-6 text-sm font-semibold text-muted-foreground">
            Imagine {active + 1} / {safeImages.length}
          </DialogTitle>
          <div className="relative overflow-hidden">
            {current?.url && (
              <Image
                src={current.url}
                alt="Imagine produs (mărită)"
                fill
                sizes="100vw"
                className="object-contain p-8"
              />
            )}
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-6 pb-6">
            {safeImages.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "relative aspect-square w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-surface-subtle",
                  active === i
                    ? "border-foreground"
                    : "border-transparent opacity-70 hover:opacity-100"
                )}
                aria-label={`Imaginea ${i + 1}`}
              >
                {img.url && (
                  <Image
                    src={img.url}
                    alt={`Miniatura ${i + 1}`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
