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
  topContent?: React.ReactNode;
  afterTitleContent?: React.ReactNode;
  descriptionContent?: React.ReactNode;
  includedContent?: React.ReactNode;
};

type ComboUnit = ComboItem & { unitKey: string };

const expandUnits = (items: ComboItem[]): ComboUnit[] =>
  items.flatMap((item) =>
    Array.from({ length: Math.max(1, item.quantity) }, (_, i) => ({
      ...item,
      unitKey: `${item.id}-${i}`,
    }))
  );

export function PdpHeroCombo({
  product,
  items,
  eyebrow,
  layout,
  topContent,
  afterTitleContent,
  descriptionContent,
  includedContent,
}: Props) {
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
            topContent={topContent}
            afterTitleContent={afterTitleContent}
            descriptionContent={descriptionContent}
            includedContent={includedContent}
          />
        )}
        {layout === "row" && (
          <ComboRow
            heroSrc={heroSrc}
            product={product}
            items={items}
            eyebrow={eyebrow}
            card={card}
            topContent={topContent}
            afterTitleContent={afterTitleContent}
            descriptionContent={descriptionContent}
            includedContent={includedContent}
          />
        )}
        {layout === "grid" && (
          <ComboGrid
            heroSrc={heroSrc}
            product={product}
            items={items}
            eyebrow={eyebrow}
            card={card}
            topContent={topContent}
            afterTitleContent={afterTitleContent}
            descriptionContent={descriptionContent}
            includedContent={includedContent}
          />
        )}
        {layout === "addon" && (
          <ComboAddon
            heroSrc={heroSrc}
            product={product}
            items={items}
            eyebrow={eyebrow}
            card={card}
            topContent={topContent}
            afterTitleContent={afterTitleContent}
            descriptionContent={descriptionContent}
            includedContent={includedContent}
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
  topContent?: React.ReactNode;
  afterTitleContent?: React.ReactNode;
  descriptionContent?: React.ReactNode;
  includedContent?: React.ReactNode;
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

function ComboTiles({
  heroSrc,
  product,
  items,
  eyebrow,
  card,
  topContent,
  afterTitleContent,
  descriptionContent,
  includedContent,
}: LayoutProps) {
  const units = expandUnits(items);

  return (
    <div className="mx-auto grid max-w-[1280px] gap-10 medium:grid-cols-[1.05fr_minmax(0,0.95fr)] medium:items-center">
      <div className="space-y-4">
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
        {includedContent}
      </div>

      <InfoCard
        product={product}
        eyebrow={eyebrow}
        card={card}
        tone="light"
        topContent={topContent}
        afterTitleContent={afterTitleContent}
        descriptionContent={descriptionContent}
      />
    </div>
  );
}

function ComboRow({
  heroSrc,
  product,
  items,
  eyebrow,
  card,
  topContent,
  afterTitleContent,
  descriptionContent,
  includedContent,
}: LayoutProps) {
  const units = expandUnits(items);
  const includedBadge =
    units.length > 0
      ? `${units.length} ${units.length === 1 ? "articol inclus" : "articole incluse"}`
      : undefined;

  return (
    <div className="mx-auto grid max-w-[1280px] gap-6 medium:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)] medium:items-start">
      <div className="space-y-4">
        <ProductStage
          heroSrc={heroSrc}
          product={product}
          heading="Produs principal"
          includedBadge={includedBadge}
          aspectClassName="aspect-[5/4] medium:min-h-[420px]"
        />
        {includedContent}
      </div>
      <InfoCard
        product={product}
        eyebrow={eyebrow}
        card={card}
        tone="light"
        topContent={topContent}
        afterTitleContent={afterTitleContent}
        descriptionContent={descriptionContent}
      />
    </div>
  );
}

function ComboGrid({
  heroSrc,
  product,
  items,
  eyebrow,
  card,
  topContent,
  afterTitleContent,
  descriptionContent,
  includedContent,
}: LayoutProps) {
  const units = expandUnits(items);
  const includedBadge =
    units.length > 0
      ? `${units.length} ${units.length === 1 ? "piesă inclusă" : "piese incluse"}`
      : undefined;

  return (
    <div className="mx-auto grid max-w-[1280px] gap-6 medium:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] medium:items-start">
      <div className="space-y-4">
        <ProductStage
          heroSrc={heroSrc}
          product={product}
          heading="Kit pregătit de lucru"
          includedBadge={includedBadge}
          aspectClassName="aspect-square medium:min-h-[440px]"
        />
        {includedContent}
      </div>

      <InfoCard
        product={product}
        eyebrow={eyebrow}
        card={card}
        tone="light"
        topContent={topContent}
        afterTitleContent={afterTitleContent}
        descriptionContent={descriptionContent}
      />
    </div>
  );
}

function ProductStage({
  heroSrc,
  product,
  heading,
  includedBadge,
  aspectClassName,
}: {
  heroSrc?: string;
  product: HttpTypes.StoreProduct;
  heading: string;
  includedBadge?: string;
  aspectClassName: string;
}) {
  return (
    <div
      className={cn(
        "clip-corner-cut-lg clip-shadow-lg relative overflow-hidden bg-background shadow-[0_36px_80px_-50px_rgba(15,23,42,0.85)]",
        aspectClassName
      )}
    >
      <ProductMedia
        src={heroSrc}
        alt={product.title ?? ""}
        priority
        padding="p-8 small:p-10"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground via-foreground/82 to-transparent p-5 text-background small:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
            <Check className="size-3" />
            {heading}
          </span>
          {includedBadge && (
            <span className="rounded-full bg-background/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-background/92">
              {includedBadge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ComboAddon({
  heroSrc,
  product,
  items,
  eyebrow,
  card,
  topContent,
  afterTitleContent,
  descriptionContent,
}: LayoutProps) {
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

      <InfoCard
        product={product}
        eyebrow={eyebrow}
        card={card}
        tone="light"
        topContent={topContent}
        afterTitleContent={afterTitleContent}
        descriptionContent={descriptionContent}
      />
    </div>
  );
}
