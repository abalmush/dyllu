"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ShoppingCart, Star } from "lucide-react";

import { addToCart } from "@lib/data/cart";
import { Badge } from "@/components/atoms/badge";
import {
  PriceBlock,
  type PriceShape,
} from "@/components/molecules/price-block";
import {
  ProductTypeBadge,
  type ProductType,
} from "@/components/organisms/product-type-badge";

export type PlpProduct = {
  id: string;
  href: string;
  title: string;
  thumbnail?: string;
  category?: string;
  price: PriceShape | null;
  productType?: ProductType;
  setCount?: number;
  variantId?: string;
  inStock?: boolean;
  rating?: number;
  reviewCount?: number;
};

export function PlpProductCard({ product }: { product: PlpProduct }) {
  const [isAdding, setIsAdding] = React.useState(false);
  const [justAdded, setJustAdded] = React.useState(false);
  const isSale = product.price?.price_type === "sale";
  const soldOut = product.inStock === false;

  const handleAdd = async () => {
    if (!product.variantId || soldOut || isAdding) return;

    setIsAdding(true);
    try {
      await addToCart({ variantId: product.variantId, quantity: 1 });
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 2500);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <article className="clip-corner-cut-md group relative flex flex-col overflow-hidden bg-card ring-1 ring-border transition-[box-shadow,transform] duration-300 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:-translate-y-1 hover:shadow-[0_24px_60px_-30px_rgba(15,23,42,0.45)]">
      <div className="relative aspect-square w-full overflow-hidden bg-surface-subtle">
        <Link href={product.href} aria-label={product.title}>
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
              className="object-contain p-6 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
              Fără imagine
            </div>
          )}
        </Link>

        {product.productType && (
          <div className="absolute left-3 top-3">
            <ProductTypeBadge
              type={product.productType}
              count={product.setCount}
            />
          </div>
        )}

        {isSale && product.price?.percentage_diff != null && (
          <Badge variant="destructive" className="absolute right-3 top-3">
            −{product.price.percentage_diff}%
          </Badge>
        )}

        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-background/60">
            <span className="clip-corner-cut-xs bg-foreground px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-background">
              Stoc epuizat
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.category && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {product.category}
          </span>
        )}
        <Link
          href={product.href}
          className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-brand-800"
        >
          {product.title}
        </Link>

        {product.rating != null && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star
              aria-hidden="true"
              className="size-4 fill-warning text-warning-foreground"
            />
            {product.rating.toFixed(1)}
            {product.reviewCount != null && (
              <span>({product.reviewCount})</span>
            )}
          </span>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <PriceBlock price={product.price} size="md" />
          <button
            type="button"
            aria-label={`Adaugă ${product.title} în coș`}
            disabled={soldOut || !product.variantId || isAdding}
            onClick={handleAdd}
            className="clip-corner-cut-xs grid size-11 shrink-0 place-items-center bg-foreground text-background transition-colors hover:bg-foreground/90 disabled:opacity-55"
          >
            {justAdded ? (
              <Check aria-hidden="true" className="size-5" />
            ) : (
              <ShoppingCart aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
