import Image from "next/image";
import { Check } from "lucide-react";
import { HttpTypes } from "@medusajs/types";

import type { IncludedAccessoryImage } from "@lib/data/included-accessories";
import { getIncludedAccessoryRelationships } from "@modules/products/lib/product-presentation";

const BATTERY_RE =
  /(acumulator|acumulatori|baterie|baterii|battery|batteries)/i;
const CHARGER_RE = /(încărcător|incarcator|charger)/i;

type AccessoryKind = "battery" | "charger";

type Props = {
  product: HttpTypes.StoreProduct;
  variant?: HttpTypes.StoreProductVariant;
  accessoryImages: IncludedAccessoryImage[];
};

function getAccessoryKind(
  kind: AccessoryKind | undefined,
  name: string
): AccessoryKind | undefined {
  if (kind) return kind;
  if (BATTERY_RE.test(name)) return "battery";
  if (CHARGER_RE.test(name)) return "charger";
  return undefined;
}

function normalizeSku(sku: string) {
  return sku.trim().toLowerCase();
}

export function IncludedAccessorySummary({
  product,
  variant,
  accessoryImages,
}: Props) {
  const imageBySku = new Map(
    accessoryImages.map((accessory) => [normalizeSku(accessory.sku), accessory])
  );
  const items = getIncludedAccessoryRelationships(product, variant).flatMap(
    (relationship) => {
      if (!relationship.sku) return [];
      const accessory = imageBySku.get(normalizeSku(relationship.sku));
      const searchableName = `${relationship.name ?? ""} ${accessory?.title ?? ""}`;
      const kind = getAccessoryKind(relationship.kind, searchableName);
      if (!kind) return [];

      return [
        {
          imageUrl: accessory?.imageUrl,
          kind,
          quantity: relationship.quantity,
          sku: relationship.sku,
          title:
            accessory?.title ??
            relationship.name ??
            (kind === "battery" ? "Acumulator inclus" : "Încărcător inclus"),
        },
      ];
    }
  );

  if (items.length === 0) return null;

  const pieceCount = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <div
      aria-labelledby="included-accessories-title"
      className="clip-corner-cut-lg clip-shadow-xl bg-foreground text-background ring-background/15 small:p-5 p-4 ring-1"
      data-testid="included-accessory-summary"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2
          id="included-accessories-title"
          className="font-display text-background text-xl leading-tight font-bold"
        >
          Ce este inclus
        </h2>
        <span className="bg-primary text-2xs text-primary-foreground shrink-0 rounded-full px-2.5 py-1 font-black">
          {pieceCount} {pieceCount === 1 ? "piesă" : "piese"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <article
            key={`${item.kind}-${item.sku}`}
            className="clip-corner-cut-md bg-background/10 ring-background/15 min-w-0 overflow-hidden ring-1"
          >
            <div className="xsmall:h-32 large:h-28 relative h-28">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 767px) 44vw, 180px"
                  className="object-contain p-2.5"
                />
              ) : (
                <div className="grid h-full place-items-center px-2 text-center">
                  <p className="text-2xs text-background/60 font-semibold">
                    Imagine indisponibilă
                  </p>
                </div>
              )}
              {item.quantity > 1 && (
                <span className="bg-primary text-primary-foreground absolute top-2 left-2 rounded-md px-3 py-1.5 text-base leading-none font-black shadow-xs">
                  ×{item.quantity}
                </span>
              )}
              <span
                aria-hidden
                className="bg-primary text-primary-foreground absolute top-2 right-2 grid size-8 place-items-center rounded-full shadow-xs"
              >
                <Check className="size-4 stroke-3" />
              </span>
            </div>

            <div className="border-background/15 border-t px-3 py-2.5">
              <p className="text-2xs text-primary font-bold tracking-[0.14em] uppercase">
                {item.kind === "battery" ? "Acumulator" : "Încărcător"}
              </p>
              <h3
                className="text-background mt-1 line-clamp-2 text-xs leading-snug font-semibold"
                title={item.title}
              >
                {item.title}
              </h3>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
