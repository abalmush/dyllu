"use client";

import * as React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Check, ShoppingCart, Star } from "lucide-react";

import { useCart } from "@lib/cart/cart-context";
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
  productHandle: string;
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

export function PlpProductCard({
  product,
  imagePriority = false,
}: {
  product: PlpProduct;
  imagePriority?: boolean;
}) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = React.useState(false);
  const [justAdded, setJustAdded] = React.useState(false);
  const isSale = product.price?.price_type === "sale";
  const soldOut = product.inStock === false;

  const handleAdd = async () => {
    if (!product.variantId || soldOut || isAdding) return;

    setIsAdding(true);
    try {
      await addItem(
        { variantId: product.variantId, quantity: 1 },
        {
          variantId: product.variantId,
          productHandle: product.productHandle,
          title: product.title,
          thumbnail: product.thumbnail,
          quantity: 1,
          unitPrice: product.price?.calculated_price_number ?? 0,
          currencyCode: product.price?.currency_code ?? "mdl",
        }
      );
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 2500);
    } finally {
      setIsAdding(false);
    }
  };

  if (!product.thumbnail) return null;

  return (
    <article className="clip-corner-cut-md group bg-card ring-border focus-within:ring-ring relative flex flex-col overflow-hidden ring-1 focus-within:ring-2 focus-within:ring-offset-2">
      <div className="bg-surface-subtle relative aspect-square w-full overflow-hidden">
        <Link
          href={product.href}
          aria-label={product.title}
          className="absolute inset-0"
        >
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              loading={imagePriority ? "eager" : "lazy"}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
              className="object-contain p-6 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="text-muted-foreground absolute inset-0 grid place-items-center text-xs">
              Fără imagine
            </div>
          )}
        </Link>

        {product.productType && product.productType !== "single" && (
          <div className="absolute top-3 left-3">
            <ProductTypeBadge
              type={product.productType}
              count={product.setCount}
            />
          </div>
        )}

        {isSale && product.price?.percentage_diff != null && (
          <Badge variant="destructive" className="absolute top-3 right-3">
            −{product.price.percentage_diff}%
          </Badge>
        )}

        {soldOut && (
          <div className="bg-background/60 absolute inset-0 grid place-items-center">
            <span className="clip-corner-cut-xs bg-foreground text-background px-4 py-1 text-xs font-bold tracking-[0.14em] uppercase">
              Stoc epuizat
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.category && (
          <span className="text-2xs text-muted-foreground font-semibold tracking-[0.18em] uppercase">
            {product.category}
          </span>
        )}
        <Link
          href={product.href}
          className="text-foreground group-hover:text-brand-800 line-clamp-2 text-base leading-snug font-semibold tracking-tight transition-colors"
        >
          {product.title}
        </Link>

        {product.rating != null && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Star
              aria-hidden="true"
              className="fill-warning text-warning-foreground size-4"
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
            className="clip-corner-cut-xs bg-foreground text-background hover:bg-foreground/90 grid size-11 shrink-0 place-items-center transition-colors disabled:opacity-55"
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
