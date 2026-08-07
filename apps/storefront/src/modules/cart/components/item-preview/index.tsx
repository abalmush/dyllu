import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { HttpTypes } from "@medusajs/types";
import { getTranslations } from "next-intl/server";

import { IMAGE_BG_NEUTRALIZE } from "@/components/organisms/pdp-hero-variants";
import { cn } from "@lib/utils";
import { convertToLocale } from "@lib/util/money";

export default async function CartItemPreview({
  item,
  currencyCode,
}: {
  item: HttpTypes.StoreCartLineItem;
  currencyCode: string;
}) {
  const t = await getTranslations("Cart");
  const total = item.total ?? 0;
  const original = item.original_total ?? total;
  const onSale = total < original;
  const unitPrice = item.quantity > 0 ? total / item.quantity : 0;

  return (
    <li
      className="border-border grid grid-cols-[64px_1fr_auto] gap-4 border-b py-6 last:border-b-0"
      data-testid="product-row"
    >
      <Link
        href={`/products/${item.product_handle}`}
        className="clip-corner-cut-md bg-surface-subtle ring-border relative aspect-square size-16 overflow-hidden ring-1"
      >
        {item.thumbnail ? (
          <Image
            src={item.thumbnail}
            alt={item.title}
            fill
            sizes="64px"
            style={IMAGE_BG_NEUTRALIZE}
            className="object-contain p-2"
          />
        ) : null}
      </Link>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Link
          href={`/products/${item.product_handle}`}
          className="text-foreground hover:text-primary line-clamp-2 text-sm font-semibold tracking-tight"
          data-testid="product-title"
        >
          {item.product_title}
        </Link>
        {item.variant?.title ? (
          <p
            className="text-muted-foreground text-xs"
            data-testid="product-variant"
          >
            {t("variantLabel", { variant: item.variant.title })}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-end justify-center gap-1 text-right">
        <p className="text-muted-foreground text-xs">
          {item.quantity}×{" "}
          {convertToLocale({
            amount: unitPrice,
            currency_code: currencyCode,
          })}
        </p>
        {onSale ? (
          <p
            className="text-muted-foreground text-xs line-through"
            data-testid="product-original-price"
          >
            {convertToLocale({ amount: original, currency_code: currencyCode })}
          </p>
        ) : null}
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
