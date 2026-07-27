"use client";

import * as React from "react";
import Image from "next/image";
import { Check, Package, PackageX, ShoppingCart } from "lucide-react";
import { HttpTypes } from "@medusajs/types";

import { cn } from "@lib/utils";
import { Button } from "@/components/atoms/button";
import { CutBorder } from "@/components/atoms/cut-border";
import { PdpHeroShell } from "@/components/organisms/pdp-hero-shell";
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
    <PdpHeroShell label="Prezentare produs și conținut inclus">
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
    </PdpHeroShell>
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
    <div className="text-background mb-4 flex items-center gap-2">
      <Package className="size-4" />
      <span className="text-xs font-semibold tracking-[0.2em] uppercase">
        {label}
      </span>
      {count != null && (
        <span className="bg-background/20 text-2xs rounded-full px-2 py-0.5 font-bold tracking-[0.12em]">
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
    <div className="medium:grid-cols-[1.05fr_minmax(0,0.95fr)] medium:items-center mx-auto grid max-w-[1280px] gap-12">
      <div className="space-y-4">
        <IncludedHeading label="Ce este inclus" count={units.length + 1} />
        <div className="medium:gap-4 grid aspect-5/4 w-full grid-cols-[3fr_1fr] gap-4">
          <div className="clip-corner-cut-lg clip-shadow-lg bg-background ring-foreground/10 relative overflow-hidden ring-1">
            <ProductMedia
              src={heroSrc}
              alt={product.title ?? ""}
              priority
              padding="p-8"
            />
            <span className="bg-primary text-2xs text-primary-foreground absolute top-3 left-3 rounded-full px-2.5 py-1 font-bold tracking-[0.14em] uppercase">
              Produs principal
            </span>
          </div>

          <div className="medium:gap-4 grid grid-rows-3 gap-4">
            {units.map((unit) => (
              <div
                key={unit.unitKey}
                className="clip-corner-cut-md clip-shadow-lg bg-background ring-foreground/10 relative flex flex-col justify-end overflow-hidden p-2 ring-1"
              >
                <ProductMedia src={unit.image} alt={unit.name} padding="p-4" />
                <span
                  aria-hidden
                  className="from-foreground/80 absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t to-transparent"
                />
                <span className="text-2xs text-background relative z-1 line-clamp-2 leading-tight font-semibold">
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
    <div className="medium:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)] medium:items-start mx-auto grid max-w-[1280px] gap-6">
      <div className="space-y-4">
        <ProductStage
          heroSrc={heroSrc}
          product={product}
          heading="Produs principal"
          includedBadge={includedBadge}
          aspectClassName="aspect-5/4 medium:min-h-[420px]"
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
    <div className="medium:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] medium:items-start mx-auto grid max-w-[1280px] gap-6">
      <div className="space-y-4">
        <ProductStage
          heroSrc={heroSrc}
          product={product}
          heading="Set gata de lucru"
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
        "clip-corner-cut-lg clip-shadow-lg bg-background relative overflow-hidden shadow-[0_36px_80px_-50px_rgba(15,23,42,0.85)]",
        aspectClassName
      )}
    >
      <ProductMedia
        src={heroSrc}
        alt={product.title ?? ""}
        priority
        padding="p-8 small:p-12"
      />
      <div className="from-foreground via-foreground/82 text-background small:p-6 absolute inset-x-0 bottom-0 bg-linear-to-t to-transparent p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-primary text-2xs text-primary-foreground inline-flex items-center gap-1.5 rounded-full px-4 py-1 font-bold tracking-[0.14em] uppercase">
            <Check className="size-3" />
            {heading}
          </span>
          {includedBadge && (
            <span className="bg-background/15 text-2xs text-background/92 rounded-full px-4 py-1 font-semibold tracking-[0.12em] uppercase">
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
    <div className="medium:grid-cols-[1.05fr_minmax(0,0.95fr)] medium:items-start mx-auto grid max-w-[1280px] gap-12">
      <div className="space-y-4">
        <div className="text-background flex items-center gap-2">
          <Check className="size-4" />
          <span className="text-xs font-semibold tracking-[0.2em] uppercase">
            Produsul tău
          </span>
        </div>

        <div className="clip-corner-cut-lg clip-shadow-lg bg-background ring-foreground/10 relative aspect-4/3 overflow-hidden ring-1">
          <ProductMedia
            src={heroSrc}
            alt={product.title ?? ""}
            priority
            padding="p-8"
          />
          <span className="bg-success text-2xs text-background absolute top-4 left-4 flex items-center gap-1.5 rounded-full px-4 py-1 font-bold tracking-[0.14em] uppercase">
            <Check className="size-3" />
            Inclus
          </span>
        </div>

        <CutBorder
          clip="md"
          width={2}
          borderClassName="bg-warning"
          fillClassName="bg-warning-subtle"
          innerClassName="flex items-start gap-4 p-4"
        >
          <PackageX className="text-warning mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-foreground text-sm font-bold tracking-[0.12em] uppercase">
              Nu sunt incluse în acest set
            </p>
            <p className="text-muted-foreground text-sm">
              Ai nevoie de accesoriile de mai jos ca să folosești produsul.
              Adaugă-le în coș dacă nu le ai deja.
            </p>
          </div>
        </CutBorder>

        <div className="grid grid-cols-2 gap-4">
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
                <span className="bg-warning text-2xs text-warning-foreground absolute top-2 right-2 rounded-full px-2 py-0.5 font-bold tracking-widest uppercase">
                  Nu e inclus
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex-1">
                  <p className="text-foreground text-sm leading-tight font-semibold">
                    {item.name}
                  </p>
                  {item.note && (
                    <p className="text-muted-foreground text-xs">{item.note}</p>
                  )}
                </div>
                {item.price != null && (
                  <span className="font-display text-foreground text-lg font-bold">
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
