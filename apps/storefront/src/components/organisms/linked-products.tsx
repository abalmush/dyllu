"use client";

import * as React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight, Check, Link2, Plus, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCart } from "@lib/cart/cart-context";
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
      <span className="font-display text-foreground text-lg font-bold">
        {formatPrice(price)}
      </span>
      {compareAtPrice != null && compareAtPrice > price && (
        <span className="text-muted-foreground text-sm line-through">
          {formatPrice(compareAtPrice)}
        </span>
      )}
    </div>
  );
}

function CompatibleLayout({ mainName, products, compatibilityNote }: Props) {
  const t = useTranslations("LinkedProducts");
  const tCommon = useTranslations("Common");
  const { addItem } = useCart();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [addedIds, setAddedIds] = React.useState<Record<string, boolean>>({});

  const handleAdd = async (product: LinkedProduct) => {
    if (!product.variantId || pendingId || product.inStock === false) return;

    setPendingId(product.id);
    try {
      await addItem(
        { variantId: product.variantId, quantity: 1 },
        {
          variantId: product.variantId,
          productHandle: product.handle,
          title: product.name,
          thumbnail: product.image,
          quantity: 1,
          unitPrice: product.price,
          currencyCode: "mdl",
        }
      );
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
    <section className="bg-surface-subtle small:py-20 py-16">
      <Container>
        <div className="mb-8 max-w-2xl">
          <span className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
            {t("compatibleEyebrow")}
          </span>
          <h2 className="font-display text-foreground small:text-3xl mt-2 text-2xl font-extrabold tracking-tight">
            {t("compatibleHeading", { mainName })}
          </h2>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            {t("compatibleDescription")}
          </p>
        </div>

        {compatibilityNote && (
          <div className="clip-corner-cut-md bg-primary-subtle text-primary mb-8 flex items-center gap-4 px-4 py-4">
            <Link2 className="size-4 shrink-0" />
            <span className="text-sm font-semibold">{compatibilityNote}</span>
          </div>
        )}

        <div className="small:grid-cols-2 medium:grid-cols-3 grid gap-4">
          {products.map((product) => (
            <article
              key={product.id}
              className="clip-corner-cut-lg clip-shadow-sm group bg-card ring-border flex flex-col overflow-hidden ring-1"
            >
              <div className="bg-background relative aspect-4/3 overflow-hidden">
                <Link
                  href={`/products/${product.handle}`}
                  className="absolute inset-0"
                  aria-label={t("viewProductAria", { name: product.name })}
                >
                  <LinkedMedia src={product.image} alt={product.name} />
                </Link>
                <div className="absolute top-3 left-3">
                  <Badge variant={RELATION_BADGE[product.relation]}>
                    {t(`relation.${product.relation}`)}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-4 p-4">
                <div className="flex-1 space-y-1.5">
                  <Link
                    href={`/products/${product.handle}`}
                    className="text-foreground hover:text-primary block leading-tight font-semibold transition-colors"
                  >
                    {product.name}
                  </Link>
                  {product.compatibility && (
                    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <Check className="text-success size-3.5" />
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
                  {product.inStock === false
                    ? tCommon("soldOut")
                    : t("inStock")}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="clip-corner-cut-sm flex-1 rounded-none"
                  >
                    <Link href={`/products/${product.handle}`}>
                      {t("viewProduct")}
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    aria-label={tCommon("addToCart", { title: product.name })}
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
  const t = useTranslations("LinkedProducts");
  const bundleTotal =
    (mainPrice ?? 0) + products.reduce((sum, p) => sum + p.price, 0);

  return (
    <section className="bg-background small:py-20 py-16">
      <Container>
        <h2 className="font-display text-foreground small:text-3xl mb-8 text-2xl font-extrabold tracking-tight">
          {t("bundleHeading")}
        </h2>

        <div className="medium:grid-cols-[1.6fr_1fr] medium:items-center grid gap-8">
          <div className="flex flex-wrap items-center gap-4">
            <BundleTile
              image={mainImage}
              name={mainName}
              price={mainPrice}
              mainProductLabel={t("mainProductBadge")}
              isMain
            />
            {products.map((product) => (
              <React.Fragment key={product.id}>
                <Plus className="text-muted-foreground size-6 shrink-0" />
                <BundleTile
                  image={product.image}
                  name={product.name}
                  price={product.price}
                />
              </React.Fragment>
            ))}
          </div>

          <div className="clip-corner-cut-lg clip-shadow-md bg-card ring-border p-6 ring-1">
            <ul className="space-y-4">
              <BundleRow label={mainName} price={mainPrice} main />
              {products.map((product) => (
                <BundleRow
                  key={product.id}
                  label={product.name}
                  price={product.price}
                />
              ))}
            </ul>

            <div className="border-border mt-6 flex items-baseline justify-between border-t pt-6">
              <span className="text-muted-foreground text-sm font-semibold tracking-[0.14em] uppercase">
                {t("bundleTotal")}
              </span>
              <span className="font-display text-foreground text-2xl font-bold">
                {formatPrice(bundleTotal)}
              </span>
            </div>

            <Button
              type="button"
              size="xl"
              className="clip-corner-cut-sm mt-6 w-full rounded-none"
            >
              <ShoppingCart className="size-4" />
              {t("addAllToCart")}
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
  mainProductLabel,
}: {
  image?: string;
  name: string;
  price?: number;
  isMain?: boolean;
  mainProductLabel?: string;
}) {
  return (
    <div
      className={cn(
        "clip-corner-cut-md bg-card ring-border relative flex flex-col overflow-hidden ring-1",
        isMain ? "h-40 w-40" : "h-32 w-32"
      )}
    >
      <div className="relative flex-1">
        {image && <LinkedMedia src={image} alt={name} />}
        {isMain && (
          <span className="absolute top-2 left-2">
            <Badge variant="default">{mainProductLabel}</Badge>
          </span>
        )}
      </div>
      {price != null && (
        <span className="text-foreground px-2 pb-2 text-xs font-semibold">
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
    <li className="flex items-center gap-4">
      <span className="bg-success text-background grid size-5 shrink-0 place-items-center rounded">
        <Check className="size-3.5" />
      </span>
      <span
        className={cn(
          "flex-1 text-sm leading-tight",
          main ? "text-foreground font-semibold" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      {price != null && (
        <span className="text-foreground text-sm font-semibold">
          {formatPrice(price)}
        </span>
      )}
    </li>
  );
}
