"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Link2, Plus, ShoppingCart } from "lucide-react";

import { addToCart } from "@lib/data/cart";
import { cn } from "@lib/utils";
import { Badge, type BadgeProps } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Container } from "@/components/atoms/container";
import {
  formatPrice,
  IMAGE_BG_NEUTRALIZE,
} from "@/components/organisms/pdp-hero-variants";

export type LinkedRelation =
  | "accessory"
  | "spare-part"
  | "recommended"
  | "consumable";

export type LinkedProduct = {
  id: string;
  handle: string;
  name: string;
  image: string;
  price: number;
  variantId?: string;
  compareAtPrice?: number;
  relation: LinkedRelation;
  compatibility?: string;
  inStock?: boolean;
};

const RELATION_LABEL: Record<LinkedRelation, string> = {
  accessory: "Accesoriu",
  "spare-part": "Piesă de schimb",
  recommended: "Recomandat",
  consumable: "Consumabil",
};

const RELATION_BADGE: Record<LinkedRelation, BadgeProps["variant"]> = {
  accessory: "soft",
  "spare-part": "outline",
  recommended: "success",
  consumable: "secondary",
};

type Props = {
  mainName: string;
  mainImage?: string;
  mainPrice?: number;
  products: LinkedProduct[];
  layout: "compatible" | "bundle";
  compatibilityNote?: string;
};

export function LinkedProducts(props: Props) {
  if (props.layout === "bundle") return <BundleLayout {...props} />;
  return <CompatibleLayout {...props} />;
}

function LinkedMedia({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(min-width: 768px) 240px, 45vw"
      style={IMAGE_BG_NEUTRALIZE}
      className="object-contain p-4"
    />
  );
}

function PriceLine({
  price,
  compareAtPrice,
}: {
  price: number;
  compareAtPrice?: number;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-display text-lg font-bold text-foreground">
        {formatPrice(price)}
      </span>
      {compareAtPrice != null && compareAtPrice > price && (
        <span className="text-sm text-muted-foreground line-through">
          {formatPrice(compareAtPrice)}
        </span>
      )}
    </div>
  );
}

function CompatibleLayout({ mainName, products, compatibilityNote }: Props) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [addedIds, setAddedIds] = React.useState<Record<string, boolean>>({});

  const handleAdd = async (product: LinkedProduct) => {
    if (!product.variantId || pendingId || product.inStock === false) return;

    setPendingId(product.id);
    try {
      await addToCart({ variantId: product.variantId, quantity: 1 });
      setAddedIds((current) => ({ ...current, [product.id]: true }));
      window.setTimeout(() => {
        setAddedIds((current) => {
          const next = { ...current };
          delete next[product.id];
          return next;
        });
      }, 2500);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="bg-surface-subtle py-16 small:py-20">
      <Container>
        <div className="mb-8 max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Accesorii & piese compatibile
          </span>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-foreground small:text-3xl">
            Se potrivește cu {mainName}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Produse separate, vândute individual, dar compatibile cu acest
            model. Fiecare are propria pagină și poate fi cumpărat oricând.
          </p>
        </div>

        {compatibilityNote && (
          <div className="clip-corner-cut-md mb-8 flex items-center gap-3 bg-primary-subtle px-4 py-3 text-primary">
            <Link2 className="size-4 shrink-0" />
            <span className="text-sm font-semibold">{compatibilityNote}</span>
          </div>
        )}

        <div className="grid gap-4 small:grid-cols-2 medium:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="clip-corner-cut-lg clip-shadow-sm group flex flex-col overflow-hidden bg-card ring-1 ring-border"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-background">
                <Link
                  href={`/products/${product.handle}`}
                  className="absolute inset-0"
                  aria-label={`Vezi ${product.name}`}
                >
                  <LinkedMedia src={product.image} alt={product.name} />
                </Link>
                <div className="absolute left-3 top-3">
                  <Badge variant={RELATION_BADGE[product.relation]}>
                    {RELATION_LABEL[product.relation]}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex-1 space-y-1.5">
                  <Link
                    href={`/products/${product.handle}`}
                    className="block font-semibold leading-tight text-foreground transition-colors hover:text-primary"
                  >
                    {product.name}
                  </Link>
                  {product.compatibility && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-success" />
                      {product.compatibility}
                    </span>
                  )}
                </div>

                <PriceLine
                  price={product.price}
                  compareAtPrice={product.compareAtPrice}
                />

                <span
                  className={cn(
                    "text-xs font-semibold",
                    product.inStock === false
                      ? "text-muted-foreground"
                      : "text-success"
                  )}
                >
                  {product.inStock === false ? "Stoc epuizat" : "În stoc"}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="clip-corner-cut-sm flex-1 rounded-none"
                  >
                    <Link href={`/products/${product.handle}`}>
                      Vezi produsul
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    aria-label={`Adaugă ${product.name} în coș`}
                    disabled={
                      product.inStock === false ||
                      !product.variantId ||
                      pendingId === product.id
                    }
                    onClick={() => handleAdd(product)}
                    className="clip-corner-cut-sm rounded-none"
                  >
                    {addedIds[product.id] ? (
                      <Check className="size-4" />
                    ) : (
                      <ShoppingCart className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

function BundleLayout({ mainName, mainImage, mainPrice, products }: Props) {
  const bundleTotal =
    (mainPrice ?? 0) + products.reduce((sum, p) => sum + p.price, 0);

  return (
    <section className="bg-background py-16 small:py-20">
      <Container>
        <h2 className="mb-8 font-display text-2xl font-extrabold tracking-tight text-foreground small:text-3xl">
          Cumpărate frecvent împreună
        </h2>

        <div className="grid gap-8 medium:grid-cols-[1.6fr_1fr] medium:items-center">
          <div className="flex flex-wrap items-center gap-4">
            <BundleTile
              image={mainImage}
              name={mainName}
              price={mainPrice}
              isMain
            />
            {products.map((product) => (
              <React.Fragment key={product.id}>
                <Plus className="size-6 shrink-0 text-muted-foreground" />
                <BundleTile
                  image={product.image}
                  name={product.name}
                  price={product.price}
                />
              </React.Fragment>
            ))}
          </div>

          <div className="clip-corner-cut-lg clip-shadow-md bg-card p-6 ring-1 ring-border">
            <ul className="space-y-3">
              <BundleRow label={mainName} price={mainPrice} main />
              {products.map((product) => (
                <BundleRow
                  key={product.id}
                  label={product.name}
                  price={product.price}
                />
              ))}
            </ul>

            <div className="mt-5 flex items-baseline justify-between border-t border-border pt-5">
              <span className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Total set
              </span>
              <span className="font-display text-2xl font-bold text-foreground">
                {formatPrice(bundleTotal)}
              </span>
            </div>

            <Button
              type="button"
              size="xl"
              className="clip-corner-cut-sm mt-5 w-full rounded-none"
            >
              <ShoppingCart className="size-4" />
              Adaugă toate în coș
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}

function BundleTile({
  image,
  name,
  price,
  isMain,
}: {
  image?: string;
  name: string;
  price?: number;
  isMain?: boolean;
}) {
  return (
    <div
      className={cn(
        "clip-corner-cut-md relative flex flex-col overflow-hidden bg-card ring-1 ring-border",
        isMain ? "h-40 w-40" : "h-32 w-32"
      )}
    >
      <div className="relative flex-1">
        {image && <LinkedMedia src={image} alt={name} />}
        {isMain && (
          <span className="absolute left-2 top-2">
            <Badge variant="default">Acest produs</Badge>
          </span>
        )}
      </div>
      {price != null && (
        <span className="px-2 pb-2 text-xs font-semibold text-foreground">
          {formatPrice(price)}
        </span>
      )}
    </div>
  );
}

function BundleRow({
  label,
  price,
  main,
}: {
  label: string;
  price?: number;
  main?: boolean;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid size-5 shrink-0 place-items-center rounded bg-success text-background">
        <Check className="size-3.5" />
      </span>
      <span
        className={cn(
          "flex-1 text-sm leading-tight",
          main ? "font-semibold text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      {price != null && (
        <span className="text-sm font-semibold text-foreground">
          {formatPrice(price)}
        </span>
      )}
    </li>
  );
}
