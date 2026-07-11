"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Trash2 } from "lucide-react";

import { IMAGE_BG_NEUTRALIZE } from "@/components/organisms/pdp-hero-variants";
import { QuantityStepper } from "@/components/molecules/quantity-stepper";
import {
  ProductTypeBadge,
  type ProductType,
} from "@/components/organisms/product-type-badge";

export type CartLineItemData = {
  id: string;
  title: string;
  href: string;
  thumbnail?: string;
  variantLabel?: string;
  unitPrice: string;
  originalUnitPrice?: string;
  quantity: number;
  productType?: ProductType;
  setCount?: number;
  includes?: string[];
};

export function CartLineItem({ item }: { item: CartLineItemData }) {
  const [quantity, setQuantity] = React.useState(item.quantity);

  return (
    <div className="flex gap-4 border-b border-border py-5 last:border-0">
      <Link
        href={item.href}
        className="clip-corner-cut-md relative size-24 shrink-0 overflow-hidden bg-surface-subtle ring-1 ring-border"
      >
        {item.thumbnail && (
          <Image
            src={item.thumbnail}
            alt={item.title}
            fill
            sizes="96px"
            style={IMAGE_BG_NEUTRALIZE}
            className="object-contain p-2"
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {item.productType && (
          <ProductTypeBadge
            type={item.productType}
            count={item.setCount}
            className="self-start"
          />
        )}
        <Link
          href={item.href}
          className="line-clamp-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
        >
          {item.title}
        </Link>
        {item.variantLabel && (
          <span className="text-xs text-muted-foreground">
            {item.variantLabel}
          </span>
        )}
        {item.includes && item.includes.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {item.includes.map((entry) => (
              <li
                key={entry}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Check className="size-3 text-success" />
                {entry}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-center gap-3 pt-2">
          <QuantityStepper value={quantity} onChange={setQuantity} max={20} />
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            Elimină
          </button>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 text-right">
        <span className="font-display text-base font-bold text-foreground">
          {item.unitPrice}
        </span>
        {item.originalUnitPrice && (
          <span className="text-xs text-muted-foreground line-through">
            {item.originalUnitPrice}
          </span>
        )}
      </div>
    </div>
  );
}
