"use client";

import * as React from "react";
import Image from "next/image";
import { isEqual } from "lodash";
import { Heart, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import AutoplayPlugin from "embla-carousel-autoplay";
import { HttpTypes } from "@medusajs/types";

import { addToCart } from "@lib/data/cart";
import { cn } from "@lib/utils";
import { Button } from "@/components/atoms/button";
import { Separator } from "@/components/atoms/separator";
import { QuantityStepper } from "@/components/molecules/quantity-stepper";

type Variant = "spotlight" | "marquee" | "staggered";

type Props = {
  product: HttpTypes.StoreProduct;
  eyebrow?: string;
  variant: Variant;
};

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
): Record<string, string> =>
  variantOptions?.reduce<Record<string, string>>((acc, opt) => {
    acc[opt.option_id ?? ""] = opt.value;
    return acc;
  }, {}) ?? {};

const fmt = new Intl.NumberFormat("ro-MD");
const formatPrice = (n: number | null | undefined) =>
  n == null ? "—" : `${fmt.format(Math.round(n))} MDL`;

// Pushes near-white pixels in product photos (manufacturer catalog shots
// usually have a faint grey backdrop) to true white so the photo's edge
// stops being visible against pure-white tile backgrounds. Dark product
// pixels are largely unaffected. Proper fix is per-image background removal
// (see TODO.md — AI chat editor / batch cleanup pipeline).
const IMAGE_BG_NEUTRALIZE: React.CSSProperties = {
  filter: "brightness(1.04) contrast(1.05)",
};

export function PdpHeroVariant({ product, eyebrow, variant }: Props) {
  const images = (product.images ?? []).filter((i) => i.url);
  const bgSrc = product.thumbnail ?? images[0]?.url;

  const useCard = useInfoCardController(product);

  return (
    <section
      aria-label={`Prezentare produs — variant ${variant}`}
      className="relative isolate overflow-hidden"
    >
      <BackgroundLayer
        variant={variant}
        src={bgSrc}
        alt={product.title ?? ""}
      />

      <div className="relative z-[1] px-4 py-16 small:px-8 small:py-20 medium:px-12 medium:py-24">
        {variant === "spotlight" && (
          <SpotlightLayout
            images={images}
            product={product}
            eyebrow={eyebrow}
            card={useCard}
          />
        )}
        {variant === "marquee" && (
          <MarqueeLayout
            images={images}
            product={product}
            eyebrow={eyebrow}
            card={useCard}
          />
        )}
        {variant === "staggered" && (
          <StaggeredLayout
            images={images}
            product={product}
            eyebrow={eyebrow}
            card={useCard}
          />
        )}
      </div>
    </section>
  );
}

function BackgroundLayer({
  variant,
  src,
  alt,
}: {
  variant: Variant;
  src?: string;
  alt: string;
}) {
  if (variant === "spotlight" && src) {
    return (
      <>
        <div className="absolute inset-0">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="100vw"
            className="scale-110 object-cover"
            style={{ filter: "blur(40px) brightness(0.4) saturate(1.2)" }}
            priority
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-foreground/30 via-foreground/40 to-foreground/70"
        />
      </>
    );
  }

  if (variant === "marquee") {
    return (
      <>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-foreground"
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
      </>
    );
  }

  // staggered + staggered-mosaic: paper / concrete texture
  return (
    <>
      <div className="absolute inset-0 bg-surface-subtle" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-primary/10 to-transparent"
      />
    </>
  );
}

function SpotlightLayout({ images, product, eyebrow, card }: LayoutProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: images.length > 1,
    align: "center",
  });
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setIdx(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-8 text-center">
      <div className="relative w-full max-w-[560px]">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {images.length === 0 ? (
              <div className="aspect-square min-w-full rounded-3xl bg-background/10" />
            ) : (
              images.map((img, i) => (
                <div
                  key={img.id ?? img.url ?? i}
                  className="relative aspect-square min-w-full"
                >
                  <Image
                    src={img.url}
                    alt={product.title ?? ""}
                    fill
                    sizes="(min-width: 768px) 560px, 90vw"
                    priority={i === 0}
                    style={IMAGE_BG_NEUTRALIZE}
                    className="object-contain drop-shadow-2xl"
                  />
                </div>
              ))
            )}
          </div>
        </div>
        {images.length > 1 && (
          <div className="mt-6 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Imaginea ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === idx
                    ? "w-6 bg-background"
                    : "w-1.5 bg-background/40 hover:bg-background/70"
                )}
              />
            ))}
          </div>
        )}
      </div>

      <InfoCard
        product={product}
        eyebrow={eyebrow}
        card={card}
        tone="dark"
        className="w-full max-w-[820px]"
      />
    </div>
  );
}

function MarqueeLayout({ images, product, eyebrow, card }: LayoutProps) {
  if (card.isMultiVariant) {
    return (
      <VariantTilesMarquee product={product} eyebrow={eyebrow} card={card} />
    );
  }
  return (
    <ImageMarquee
      images={images}
      product={product}
      eyebrow={eyebrow}
      card={card}
    />
  );
}

function VariantTilesMarquee({
  product,
  eyebrow,
  card,
}: {
  product: HttpTypes.StoreProduct;
  eyebrow?: string;
  card: ReturnType<typeof useInfoCardController>;
}) {
  const variants = product.variants ?? [];

  // Pull a per-variant image URL with sensible fallbacks
  const tileFor = (
    v: HttpTypes.StoreProductVariant,
    index: number
  ): { url: string | undefined; label: string } => {
    const md = (v.metadata ?? {}) as Record<string, unknown>;
    const variantImage =
      typeof md.ingco_variant_image === "string"
        ? (md.ingco_variant_image as string)
        : undefined;
    const positional = product.images?.[index]?.url;
    return {
      url: variantImage ?? positional ?? product.thumbnail ?? undefined,
      label: v.title ?? v.sku ?? "—",
    };
  };

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-10">
      <div className="-mx-4 overflow-x-auto px-4 small:-mx-8 small:px-8 medium:-mx-12 medium:px-12">
        <div className="flex gap-4 pb-2 small:gap-5">
          {variants.map((v, i) => {
            const { url, label } = tileFor(v, i);
            const primaryOptionId = card.primaryOption?.id ?? "";
            const variantValue =
              v.options?.find((o) => o.option_id === primaryOptionId)?.value ??
              label;
            const isSelected = card.selectedVariant?.id === v.id;
            const price = v.calculated_price?.calculated_amount;

            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`Selectează varianta ${label}`}
                onClick={() => {
                  if (primaryOptionId) card.onSelectOption(variantValue);
                }}
                className={cn(
                  "clip-corner-cut-md clip-shadow-lg group relative flex h-64 w-64 shrink-0 flex-col justify-end overflow-hidden bg-background p-4 text-left transition-all small:h-72 small:w-72 small:p-5",
                  isSelected
                    ? "scale-[1.02] ring-2 ring-primary"
                    : "ring-1 ring-foreground/10 hover:scale-[1.01] hover:ring-foreground/30"
                )}
              >
                {url && (
                  <Image
                    src={url}
                    alt={`${product.title} — ${variantValue}`}
                    fill
                    sizes="(min-width: 768px) 288px, 256px"
                    priority={i === 0}
                    style={IMAGE_BG_NEUTRALIZE}
                    className="object-contain p-6 transition-transform duration-300 group-hover:scale-105"
                  />
                )}

                {/* Bottom gradient for label legibility */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t to-transparent transition-opacity",
                    isSelected ? "from-foreground/85" : "from-foreground/70"
                  )}
                />

                {/* Top-right "selected" pill */}
                {isSelected && (
                  <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
                    Selectat
                  </span>
                )}

                <div className="relative z-[1] space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {card.primaryOption?.title ?? "Variantă"}
                  </span>
                  <h3 className="font-display text-xl font-bold leading-tight text-background small:text-2xl">
                    {variantValue}
                  </h3>
                  {price != null && (
                    <span className="block text-sm font-semibold text-background/80">
                      {formatPrice(price)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <InfoCard product={product} eyebrow={eyebrow} card={card} tone="light" />
    </div>
  );
}

function ImageMarquee({ images, product, eyebrow, card }: LayoutProps) {
  // Fallback for single-variant products: rotating image strip
  const slides = React.useMemo(() => {
    if (images.length === 0) return [] as typeof images;
    const padded = [...images];
    while (padded.length < 4) padded.push(...images);
    return padded.slice(0, Math.max(8, images.length * 2));
  }, [images]);

  const autoplayPlugin = React.useRef(
    AutoplayPlugin({
      delay: 2800,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    })
  );

  const [emblaRef] = useEmblaCarousel(
    {
      loop: true,
      align: "center",
      dragFree: true,
      containScroll: false,
    },
    [autoplayPlugin.current]
  );

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-10">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4 px-2 small:gap-5">
          {slides.length === 0 ? (
            <div className="clip-corner-cut-md h-64 w-64 shrink-0 bg-background/20 small:h-72 small:w-72" />
          ) : (
            slides.map((img, i) => (
              <div
                key={`${img.id ?? img.url}-${i}`}
                className="clip-corner-cut-md clip-shadow-lg relative h-64 w-64 shrink-0 overflow-hidden bg-background ring-1 ring-foreground/10 small:h-72 small:w-72"
              >
                <Image
                  src={img.url}
                  alt={product.title ?? ""}
                  fill
                  sizes="(min-width: 768px) 288px, 256px"
                  priority={i === 0}
                  style={IMAGE_BG_NEUTRALIZE}
                  className="object-contain p-6"
                />
              </div>
            ))
          )}
        </div>
      </div>

      <InfoCard product={product} eyebrow={eyebrow} card={card} tone="light" />
    </div>
  );
}

function StaggeredLayout({ images, product, eyebrow, card }: LayoutProps) {
  // 1 main image on the left, 3 equal tiles in a clean vertical grid on the
  // right. No rotations, perfect alignment. If product has fewer than 4
  // images, satellites cycle through what's available.
  const main = images[0];
  const satellites = React.useMemo(() => {
    if (images.length === 0) return [];
    const out: typeof images = [];
    for (let i = 1; i <= 3; i++) {
      out.push(images[i] ?? images[(i - 1) % images.length] ?? images[0]);
    }
    return out;
  }, [images]);

  return (
    <div className="mx-auto grid max-w-[1280px] gap-10 medium:grid-cols-[1.05fr_minmax(0,0.95fr)] medium:items-center">
      <div className="grid aspect-[5/4] w-full grid-cols-[3fr_1fr] gap-3 medium:gap-4">
        {main && (
          <div className="clip-corner-cut-lg clip-shadow-lg relative overflow-hidden bg-background ring-1 ring-foreground/10">
            <Image
              src={main.url}
              alt={product.title ?? ""}
              fill
              sizes="(min-width: 768px) 520px, 75vw"
              priority
              style={IMAGE_BG_NEUTRALIZE}
              className="object-contain p-8"
            />
          </div>
        )}

        <div className="grid grid-rows-3 gap-3 medium:gap-4">
          {satellites.map((img, i) => (
            <div
              key={`${img.id ?? img.url}-${i}`}
              className="clip-corner-cut-md clip-shadow-lg relative overflow-hidden bg-background ring-1 ring-foreground/10 transition-transform hover:scale-[1.02]"
            >
              <Image
                src={img.url}
                alt={product.title ?? ""}
                fill
                sizes="(min-width: 768px) 180px, 25vw"
                style={IMAGE_BG_NEUTRALIZE}
                className="object-contain p-3"
              />
            </div>
          ))}
        </div>
      </div>

      <InfoCard product={product} eyebrow={eyebrow} card={card} tone="light" />
    </div>
  );
}

type LayoutProps = {
  images: HttpTypes.StoreProductImage[];
  product: HttpTypes.StoreProduct;
  eyebrow?: string;
  card: ReturnType<typeof useInfoCardController>;
};

function InfoCard({
  product,
  eyebrow,
  card,
  tone,
  className,
}: {
  product: HttpTypes.StoreProduct;
  eyebrow?: string;
  card: ReturnType<typeof useInfoCardController>;
  tone: "light" | "dark";
  className?: string;
}) {
  const {
    selectedVariant,
    options,
    onSelectOption,
    onAddToCart,
    isAdding,
    justAdded,
    primaryOption,
    optionValues,
    isMultiVariant,
    displayPrice,
    showFromPrefix,
    quantity,
    setQuantity,
    inStock,
  } = card;

  const ctaLabel =
    isMultiVariant && !selectedVariant
      ? "Selectează varianta"
      : justAdded
        ? "Adăugat ✓"
        : "Adaugă în coș";

  return (
    <div
      className={cn(
        "clip-corner-cut-lg clip-shadow-lg p-6 small:p-8 medium:p-10",
        tone === "dark"
          ? "bg-background/95 ring-1 ring-foreground/10 backdrop-blur"
          : "bg-card ring-1 ring-border",
        className
      )}
    >
      <div className="grid gap-6 small:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] small:gap-10">
        <div className="flex flex-col gap-4 small:gap-5">
          {eyebrow && (
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </span>
          )}
          <h1 className="font-display text-2xl font-extrabold leading-[1.05] tracking-tight text-foreground small:text-3xl medium:text-4xl">
            {product.title}
          </h1>

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <div className="flex items-baseline gap-2">
              {showFromPrefix && (
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  de la
                </span>
              )}
              <span className="font-display text-2xl font-bold tracking-tight text-foreground small:text-3xl">
                {formatPrice(displayPrice)}
              </span>
            </div>
            <span
              className={cn(
                "clip-corner-cut-xs inline-flex items-center gap-2 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                inStock
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              <span
                className={cn(
                  "size-1.5",
                  inStock ? "bg-success" : "bg-destructive"
                )}
              />
              {inStock ? "În stoc · 24–48h" : "Indisponibil"}
            </span>
          </div>

          {product.description && (
            <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-5">
          {isMultiVariant && primaryOption && optionValues.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {primaryOption.title}
                </span>
                {options[primaryOption.id ?? ""] && (
                  <span className="text-sm font-semibold tracking-tight text-foreground">
                    {options[primaryOption.id ?? ""]}
                  </span>
                )}
              </div>
              <div
                className="flex flex-wrap gap-1.5"
                role="radiogroup"
                aria-label={primaryOption.title ?? "Variantă"}
              >
                {optionValues.slice(0, 12).map((v) => {
                  const selected = options[primaryOption.id ?? ""] === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onSelectOption(v)}
                      className={cn(
                        "clip-corner-cut-xs min-w-[52px] border px-3 py-1.5 text-xs font-medium tracking-tight transition-colors",
                        selected
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-card text-foreground hover:border-foreground/40 hover:bg-muted"
                      )}
                    >
                      {v}
                    </button>
                  );
                })}
                {optionValues.length > 12 && (
                  <span className="grid place-items-center px-3 text-xs text-muted-foreground">
                    +{optionValues.length - 12}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Cantitate
            </span>
            <QuantityStepper value={quantity} onChange={setQuantity} max={20} />
          </div>

          <div className="flex items-stretch gap-2">
            <Button
              type="button"
              onClick={onAddToCart}
              disabled={isAdding || (isMultiVariant && !selectedVariant)}
              size="xl"
              className="clip-corner-cut-sm flex-1 rounded-none"
            >
              <ShoppingBag className="size-4" />
              {ctaLabel}
            </Button>
            <button
              type="button"
              aria-label="Adaugă la favorite"
              className="clip-corner-cut-sm grid size-14 shrink-0 place-items-center border border-border bg-card text-foreground transition-colors hover:border-foreground/40 hover:bg-muted"
            >
              <Heart className="size-5" />
            </button>
          </div>
        </div>
      </div>

      <Separator className="mt-6 small:mt-8" />

      <ul className="mt-5 grid gap-3 text-sm small:mt-6 small:grid-cols-2 small:gap-4">
        <li className="flex items-start gap-3">
          <span className="clip-corner-cut-xs grid size-9 shrink-0 place-items-center bg-primary/10 text-primary">
            <Truck className="size-4" />
          </span>
          <span className="text-foreground">
            <span className="font-semibold">Livrare gratuită</span>
            <span className="text-muted-foreground">
              {" "}
              peste 1.000 MDL în Chișinău
            </span>
          </span>
        </li>
        <li className="flex items-start gap-3">
          <span className="clip-corner-cut-xs grid size-9 shrink-0 place-items-center bg-primary/10 text-primary">
            <ShieldCheck className="size-4" />
          </span>
          <span className="text-foreground">
            <span className="font-semibold">Plată securizată MAIB</span>
            <span className="text-muted-foreground"> · 3-D Secure</span>
          </span>
        </li>
      </ul>
    </div>
  );
}

function useInfoCardController(product: HttpTypes.StoreProduct) {
  const primaryOption = product.options?.[0];
  const optionValues = primaryOption?.values?.map((v) => v.value) ?? [];
  const isMultiVariant = (product.variants?.length ?? 0) > 1;

  const [options, setOptions] = React.useState<Record<string, string>>(() => {
    if ((product.variants?.length ?? 0) === 1 && product.variants?.[0]) {
      return optionsAsKeymap(product.variants[0].options);
    }
    return {};
  });
  const [quantity, setQuantity] = React.useState(1);
  const [isAdding, setIsAdding] = React.useState(false);
  const [justAdded, setJustAdded] = React.useState(false);

  const selectedVariant = React.useMemo(() => {
    if (!product.variants?.length) return undefined;
    return product.variants.find((v) =>
      isEqual(optionsAsKeymap(v.options), options)
    );
  }, [product.variants, options]);

  const fallbackPrice = React.useMemo(() => {
    if (!product.variants?.length) return undefined;
    const prices = product.variants
      .map((v) => v.calculated_price?.calculated_amount)
      .filter((n): n is number => typeof n === "number" && n > 0);
    if (!prices.length) return undefined;
    return Math.min(...prices);
  }, [product.variants]);

  const displayPrice =
    selectedVariant?.calculated_price?.calculated_amount ?? fallbackPrice;
  const showFromPrefix = !selectedVariant && isMultiVariant;

  const inStock = React.useMemo(() => {
    // No variant selected yet on a multi-variant product → optimistic in-stock
    if (!selectedVariant && isMultiVariant) return true;
    if (!selectedVariant) return false;
    if (!selectedVariant.manage_inventory) return true;
    if (selectedVariant.allow_backorder) return true;
    return (selectedVariant.inventory_quantity ?? 0) > 0;
  }, [selectedVariant, isMultiVariant]);

  const onSelectOption = (value: string) => {
    if (!primaryOption?.id) return;
    setOptions({ [primaryOption.id]: value });
  };

  const onAddToCart = async () => {
    if (!selectedVariant?.id || isAdding) return;
    setIsAdding(true);
    try {
      await addToCart({ variantId: selectedVariant.id, quantity });
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 2500);
    } finally {
      setIsAdding(false);
    }
  };

  return {
    primaryOption,
    optionValues,
    isMultiVariant,
    options,
    selectedVariant,
    displayPrice,
    showFromPrefix,
    inStock,
    quantity,
    setQuantity,
    isAdding,
    justAdded,
    onSelectOption,
    onAddToCart,
  };
}
