"use client";

import * as React from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { HttpTypes } from "@medusajs/types";
import { useTranslations } from "next-intl";

import { cn } from "@lib/utils";
import { useCart } from "@lib/cart/cart-context";
import { convertToLocale } from "@lib/util/money";
import { IMAGE_BG_NEUTRALIZE } from "@/components/organisms/pdp-hero-variants";
import { QuantityStepper } from "@/components/molecules/quantity-stepper";

type Props = {
  item: HttpTypes.StoreCartLineItem;
  type?: "full" | "preview";
  currencyCode: string;
};

// Quantity/remove go through the shared CartProvider so the header badge and
// minibag stay in sync with edits made directly on the cart page, then
// router.refresh() re-fetches this page's own authoritative totals (sale
// pricing, promotions) since CartView doesn't carry those fields.
export default function CartItemRow({
  item,
  type = "full",
  currencyCode,
}: Props) {
  const t = useTranslations("Cart");
  const router = useRouter();
  const { updateItem, removeItem } = useCart();
  const [updating, setUpdating] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
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
      setUpdating(true);
      try {
        await updateItem(item.id, next);
        router.refresh();
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

    setRemoving(true);
    try {
      await removeItem(item.id);
      router.refresh();
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
        "border-border grid gap-4 border-b py-6 last:border-b-0",
        isPreview
          ? "grid-cols-[64px_1fr_auto]"
          : "small:grid-cols-[120px_1fr_auto] grid-cols-[88px_1fr]"
      )}
      data-testid="product-row"
    >
      <Link
        href={`/products/${item.product_handle}`}
        className={cn(
          "clip-corner-cut-md bg-surface-subtle ring-border relative aspect-square overflow-hidden ring-1",
          isPreview ? "size-16" : "small:size-[120px] size-[88px]"
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
          className="text-foreground hover:text-primary small:text-base line-clamp-2 text-sm font-semibold tracking-tight"
          data-testid="product-title"
        >
          {item.product_title}
        </Link>
        {item.variant?.title && (
          <p
            className="text-muted-foreground text-xs"
            data-testid="product-variant"
          >
            {t("variantLabel", { variant: item.variant.title })}
          </p>
        )}
        {!isPreview && (
          <div className="mt-2 flex flex-wrap items-center gap-4">
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
              className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1.5 px-0 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {removing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              {t("remove")}
            </button>
            {updating && !removing && (
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <Loader2 className="size-3 animate-spin" />
                {t("updating")}
              </span>
            )}
          </div>
        )}
      </div>
      <div
        className={cn(
          "flex flex-col items-end justify-center gap-1 text-right",
          isPreview ? "" : "small:col-span-1 col-span-2"
        )}
      >
        {isPreview ? (
          <p className="text-muted-foreground text-xs">
            {item.quantity}×{" "}
            {convertToLocale({
              amount: unitPrice,
              currency_code: currencyCode,
            })}
          </p>
        ) : null}
        {onSale && (
          <p
            className="text-muted-foreground text-xs line-through"
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
