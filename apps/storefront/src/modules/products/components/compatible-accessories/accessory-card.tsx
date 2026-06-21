"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { HttpTypes } from "@medusajs/types";

import { addToCart } from "@lib/data/cart";
import { cn } from "@lib/utils";
import { Button } from "@/components/atoms/button";

type Props = {
  product: HttpTypes.StoreProduct;
  kind: "battery" | "charger";
};

export function AccessoryCard({ product, kind }: Props) {
  const variants = product.variants ?? [];
  const hasMultiple = variants.length > 1;
  const [selectedId, setSelectedId] = React.useState<string>(
    variants[0]?.id ?? ""
  );
  const [pending, setPending] = React.useState(false);
  const [added, setAdded] = React.useState(false);

  const selected = variants.find((v) => v.id === selectedId);
  const price = selected?.calculated_price?.calculated_amount;
  const image = product.thumbnail || product.images?.[0]?.url;

  const onAdd = async () => {
    if (!selectedId || pending) return;
    setPending(true);
    try {
      await addToCart({ variantId: selectedId, quantity: 1 });
      setAdded(true);
      window.setTimeout(() => setAdded(false), 2500);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="clip-corner-cut-md flex gap-4 bg-card p-4 transition-shadow hover:shadow-md small:gap-5 small:p-5">
      <Link
        href={`/products/${product.handle}`}
        className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-md bg-surface-subtle small:w-24"
      >
        {image && (
          <Image
            src={image}
            alt={product.title ?? ""}
            fill
            sizes="(max-width: 640px) 80px, 96px"
            className="object-cover"
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Link
          href={`/products/${product.handle}`}
          className="line-clamp-2 text-sm font-semibold leading-tight text-foreground transition-colors hover:text-primary"
        >
          {product.title}
        </Link>

        {hasMultiple && (
          <div className="flex flex-wrap gap-1.5">
            {variants.map((v) => {
              const isActive = v.id === selectedId;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
                    isActive
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  )}
                >
                  {v.title}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            {price != null
              ? `${Number(price).toLocaleString("ro-MD")} MDL`
              : "—"}
          </span>
          <Button
            type="button"
            onClick={onAdd}
            disabled={pending || !selectedId}
            size="sm"
            variant={added ? "secondary" : "default"}
            className="shrink-0"
          >
            {added ? (
              <>
                <Check className="size-4" /> Adăugat
              </>
            ) : (
              <>
                <Plus className="size-4" />{" "}
                {kind === "battery" ? "Adaugă acumulator" : "Adaugă încărcător"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
