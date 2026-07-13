"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { HttpTypes } from "@medusajs/types";

import { cn } from "@lib/utils";
import { deleteLineItem, updateLineItem } from "@lib/data/cart";
import { convertToLocale } from "@lib/util/money";
import { IMAGE_BG_NEUTRALIZE } from "@/components/organisms/pdp-hero-variants";
import { QuantityStepper } from "@/components/molecules/quantity-stepper";
import ErrorMessage from "@modules/checkout/components/error-message";

type Props = {
  item: HttpTypes.StoreCartLineItem;
  type?: "full" | "preview";
  currencyCode: string;
};

export default function CartItemRow({
  item,
  type = "full",
  currencyCode,
}: Props) {
  const [updating, setUpdating] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState(item.quantity);

  const debounced = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (debounced.current) {
        clearTimeout(debounced.current);
      }
    };
  }, []);

  const handleQty = (next: number) => {
    setQuantity(next);
    if (debounced.current) clearTimeout(debounced.current);
    debounced.current = setTimeout(async () => {
      setError(null);
      setUpdating(true);
      try {
        await updateLineItem({ lineId: item.id, quantity: next });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Eroare actualizare");
        setQuantity(item.quantity);
      } finally {
        setUpdating(false);
      }
    }, 250);
  };

  const handleRemove = async () => {
    if (debounced.current) {
      clearTimeout(debounced.current);
      debounced.current = null;
    }

    setError(null);
    setRemoving(true);
    try {
      await deleteLineItem(item.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nu am putut șterge produsul. Încearcă din nou."
      );
    } finally {
      setRemoving(false);
    }
  };

  const total = item.total ?? 0;
  const original = item.original_total ?? total;
  const onSale = total < original;
  const isPreview = type === "preview";
  const unitPrice = item.quantity > 0 ? total / item.quantity : 0;

  return (
    <li
      className={cn(
        "grid gap-4 border-b border-border py-5 last:border-b-0",
        isPreview
          ? "grid-cols-[64px_1fr_auto]"
          : "grid-cols-[88px_1fr] small:grid-cols-[120px_1fr_auto]"
      )}
      data-testid="product-row"
    >
      <Link
        href={`/products/${item.product_handle}`}
        className={cn(
          "clip-corner-cut-md relative aspect-square overflow-hidden bg-surface-subtle ring-1 ring-border",
          isPreview ? "size-16" : "size-[88px] small:size-[120px]"
        )}
      >
        {item.thumbnail && (
          <Image
            src={item.thumbnail}
            alt={item.title}
            fill
            sizes={isPreview ? "64px" : "120px"}
            style={IMAGE_BG_NEUTRALIZE}
            className="object-contain p-2"
          />
        )}
      </Link>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Link
          href={`/products/${item.product_handle}`}
          className="line-clamp-2 text-sm font-semibold tracking-tight text-foreground hover:text-primary small:text-base"
          data-testid="product-title"
        >
          {item.product_title}
        </Link>
        {item.variant?.title && (
          <p
            className="text-xs text-muted-foreground"
            data-testid="product-variant"
          >
            Variantă: {item.variant.title}
          </p>
        )}
        {!isPreview && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <QuantityStepper
              value={quantity}
              onChange={handleQty}
              max={10}
              size="sm"
              disabled={updating || removing}
            />
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing || updating}
              data-testid="product-delete-button"
              className="inline-flex items-center gap-1.5 px-0 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
            >
              {removing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Șterge
            </button>
            {updating && !removing && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                actualizez
              </span>
            )}
          </div>
        )}
        {error && (
          <ErrorMessage error={error} data-testid="product-error-message" />
        )}
      </div>
      <div
        className={cn(
          "flex flex-col items-end justify-center gap-1 text-right",
          isPreview ? "" : "col-span-2 small:col-span-1"
        )}
      >
        {isPreview ? (
          <p className="text-xs text-muted-foreground">
            {item.quantity}×{" "}
            {convertToLocale({
              amount: unitPrice,
              currency_code: currencyCode,
            })}
          </p>
        ) : null}
        {onSale && (
          <p
            className="text-xs text-muted-foreground line-through"
            data-testid="product-original-price"
          >
            {convertToLocale({ amount: original, currency_code: currencyCode })}
          </p>
        )}
        <p
          className={cn(
            "font-display text-base font-bold tracking-tight",
            onSale ? "text-success" : "text-foreground"
          )}
          data-testid="product-price"
        >
          {convertToLocale({ amount: total, currency_code: currencyCode })}
        </p>
      </div>
    </li>
  );
}
