"use client";

import * as React from "react";
import Image from "next/image";
import { Check, Package, PackageX, ShoppingCart } from "lucide-react";
import { HttpTypes } from "@medusajs/types";

import { cn } from "@lib/utils";
import { Button } from "@/components/atoms/button";
import { CutBorder } from "@/components/atoms/cut-border";
import {
  formatPrice,
  IMAGE_BG_NEUTRALIZE,
  InfoCard,
  useInfoCardController,
} from "@/components/organisms/pdp-hero-variants";

export type ComboItem = {
  id: string;
  name: string;
  image: string;
  quantity: number;
  note?: string;
  price?: number;
};

type ComboLayout = "tiles" | "row" | "grid" | "addon";

type Props = {
  product: HttpTypes.StoreProduct;
  items: ComboItem[];
  eyebrow?: string;
  layout: ComboLayout;
};

type ComboUnit = ComboItem & { unitKey: string };

const expandUnits = (items: ComboItem[]): ComboUnit[] =>
  items.flatMap((item) =>
    Array.from({ length: Math.max(1, item.quantity) }, (_, i) => ({
      ...item,
      unitKey: `${item.id}-${i}`,
    }))
  );

export function PdpHeroCombo({ product, items, eyebrow, layout }: Props) {
  const heroSrc = product.thumbnail ?? product.images?.[0]?.url;
  const card = useInfoCardController(product);

  return (
    <section
      aria-label={`Combo produs — layout ${layout}`}
      className="relative isolate overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-foreground"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-[1] px-4 py-16 small:px-8 small:py-20 medium:px-12 medium:py-24">
        {layout === "tiles" && (
          <ComboTiles
            heroSrc={heroSrc}
            product={product}
            items={items}
            eyebrow={eyebrow}
            card={card}
          />
        )}
        {layout === "row" && (
          <ComboRow
            heroSrc={heroSrc}
            product={product}
            items={items}
            eyebrow={eyebrow}
            card={card}
          />
        )}
        {layout === "grid" && (
          <ComboGrid
            heroSrc={heroSrc}
            product={product}
            items={items}
            eyebrow={eyebrow}
            card={card}
          />
        )}
        {layout === "addon" && (
          <ComboAddon
            heroSrc={heroSrc}
            product={product}
            items={items}
            eyebrow={eyebrow}
            card={card}
          />
        )}
      </div>
    </section>
  );
}

type LayoutProps = {
  heroSrc?: string;
  product: HttpTypes.StoreProduct;
  items: ComboItem[];
  eyebrow?: string;
  card: ReturnType<typeof useInfoCardController>;
};

function IncludedHeading({ label, count }: { label: string; count?: number }) {
  return (
    <div className="mb-4 flex items-center gap-2 text-background">
      <Package className="size-4" />
      <span className="text-xs font-semibold uppercase tracking-[0.2em]">
        {label}
      </span>
      {count != null && (
        <span className="rounded-full bg-background/20 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em]">
          {count} piese
        </span>
      )}
    </div>
  );
}

function ProductMedia({
  src,
  alt,
  priority,
  className,
  padding = "p-8",
}: {
  src?: string;
  alt: string;
  priority?: boolean;
  className?: string;
  padding?: string;
}) {
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(min-width: 768px) 520px, 75vw"
      priority={priority}
      style={IMAGE_BG_NEUTRALIZE}
      className={cn("object-contain", padding, className)}
    />
  );
}

function ComboTiles({ heroSrc, product, items, eyebrow, card }: LayoutProps) {
  const units = expandUnits(items);

  return (
    <div className="mx-auto grid max-w-[1280px] gap-10 medium:grid-cols-[1.05fr_minmax(0,0.95fr)] medium:items-center">
      <div>
        <IncludedHeading label="Inclus în combo" count={units.length + 1} />
        <div className="grid aspect-[5/4] w-full grid-cols-[3fr_1fr] gap-3 medium:gap-4">
          <div className="clip-corner-cut-lg clip-shadow-lg relative overflow-hidden bg-background ring-1 ring-foreground/10">
            <ProductMedia
              src={heroSrc}
              alt={product.title ?? ""}
              priority
              padding="p-8"
            />
            <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
              Produs principal
            </span>
          </div>

          <div className="grid grid-rows-3 gap-3 medium:gap-4">
            {units.map((unit) => (
              <div
                key={unit.unitKey}
                className="clip-corner-cut-md clip-shadow-lg relative flex flex-col justify-end overflow-hidden bg-background p-2 ring-1 ring-foreground/10"
              >
                <ProductMedia src={unit.image} alt={unit.name} padding="p-3" />
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-foreground/80 to-transparent"
                />
                <span className="relative z-[1] line-clamp-2 text-[11px] font-semibold leading-tight text-background">
                  {unit.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <InfoCard product={product} eyebrow={eyebrow} card={card} tone="light" />
    </div>
  );
}

function ComboRow({ heroSrc, product, items, eyebrow, card }: LayoutProps) {
  const units = expandUnits(items);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-8">
      <div className="grid gap-4 medium:grid-cols-[1.5fr_1fr] medium:items-stretch">
        <div className="clip-corner-cut-lg clip-shadow-lg relative aspect-[4/3] overflow-hidden bg-background ring-1 ring-foreground/10 medium:aspect-auto medium:min-h-[340px]">
          <ProductMedia
            src={heroSrc}
            alt={product.title ?? ""}
            priority
            padding="p-10"
          />
          <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
            <Check className="size-3" />
            Produs principal
          </span>
        </div>

        <div className="clip-corner-cut-lg clip-shadow-lg flex flex-col bg-background p-5 ring-1 ring-foreground/10 small:p-6">
          <div className="mb-4 flex items-center gap-2 text-foreground">
            <Package className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Inclus în combo
            </span>
          </div>
          <div className="grid flex-1 grid-cols-3 gap-3">
            {units.map((unit) => (
              <div
                key={unit.unitKey}
                className="clip-corner-cut-md relative flex flex-col justify-end overflow-hidden bg-muted p-2 ring-1 ring-foreground/10"
              >
                <ProductMedia src={unit.image} alt={unit.name} padding="p-3" />
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-foreground/80 to-transparent"
                />
                <span className="relative z-[1] line-clamp-2 text-[11px] font-semibold leading-tight text-background">
                  {unit.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <InfoCard product={product} eyebrow={eyebrow} card={card} tone="light" />
    </div>
  );
}

function ComboGrid({ heroSrc, product, items, eyebrow, card }: LayoutProps) {
  const units = expandUnits(items);

  return (
    <div className="mx-auto grid max-w-[1280px] gap-10 medium:grid-cols-[1.05fr_minmax(0,0.95fr)] medium:items-center">
      <div>
        <span className="mb-4 block text-xs font-semibold uppercase tracking-[0.2em] text-background/90">
          Set complet
        </span>
        <div className="grid grid-cols-2 gap-3 medium:gap-4">
          <div className="clip-corner-cut-md clip-shadow-lg relative aspect-square overflow-hidden bg-background ring-2 ring-background">
            <ProductMedia
              src={heroSrc}
              alt={product.title ?? ""}
              priority
              padding="p-6"
            />
            <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
              Produs principal
            </span>
          </div>

          {units.map((unit) => (
            <div
              key={unit.unitKey}
              className="clip-corner-cut-md clip-shadow-lg relative flex aspect-square flex-col justify-end overflow-hidden bg-background p-3 ring-1 ring-foreground/10"
            >
              <ProductMedia src={unit.image} alt={unit.name} padding="p-6" />
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-foreground/75 to-transparent"
              />
              <span className="relative z-[1] line-clamp-2 text-xs font-semibold leading-tight text-background">
                {unit.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <InfoCard product={product} eyebrow={eyebrow} card={card} tone="light" />
    </div>
  );
}

function ComboAddon({ heroSrc, product, items, eyebrow, card }: LayoutProps) {
  return (
    <div className="mx-auto grid max-w-[1280px] gap-10 medium:grid-cols-[1.05fr_minmax(0,0.95fr)] medium:items-start">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-background">
          <Check className="size-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">
            Produsul tău
          </span>
        </div>

        <div className="clip-corner-cut-lg clip-shadow-lg relative aspect-[4/3] overflow-hidden bg-background ring-1 ring-foreground/10">
          <ProductMedia
            src={heroSrc}
            alt={product.title ?? ""}
            priority
            padding="p-8"
          />
          <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-success px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-background">
            <Check className="size-3" />
            Inclus
          </span>
        </div>

        <CutBorder
          clip="md"
          width={2}
          borderClassName="bg-warning"
          fillClassName="bg-warning-subtle"
          innerClassName="flex items-start gap-3 p-4"
        >
          <PackageX className="mt-0.5 size-5 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-foreground">
              Nu sunt incluse în acest set
            </p>
            <p className="text-sm text-muted-foreground">
              Ai nevoie de accesoriile de mai jos ca să folosești produsul.
              Adaugă-le în coș dacă nu le ai deja.
            </p>
          </div>
        </CutBorder>

        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <CutBorder
              key={item.id}
              clip="md"
              width={2}
              borderClassName="bg-warning"
              fillClassName="bg-background"
              innerClassName="flex flex-col overflow-hidden"
            >
              <div className="relative aspect-square">
                <ProductMedia src={item.image} alt={item.name} padding="p-4" />
                <span className="absolute right-2 top-2 rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-warning-foreground">
                  Nu e inclus
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold leading-tight text-foreground">
                    {item.name}
                  </p>
                  {item.note && (
                    <p className="text-xs text-muted-foreground">{item.note}</p>
                  )}
                </div>
                {item.price != null && (
                  <span className="font-display text-lg font-bold text-foreground">
                    {formatPrice(item.price)}
                  </span>
                )}
                <Button
                  type="button"
                  size="sm"
                  className="clip-corner-cut-sm w-full rounded-none"
                >
                  <ShoppingCart className="size-4" />
                  Adaugă în coș
                </Button>
              </div>
            </CutBorder>
          ))}
        </div>
      </div>

      <InfoCard product={product} eyebrow={eyebrow} card={card} tone="light" />
    </div>
  );
}
