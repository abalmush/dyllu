"use client";

import * as React from "react";
import Image from "next/image";
import { isEqual } from "lodash";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { HttpTypes } from "@medusajs/types";

import { addToCart } from "@lib/data/cart";
import { cn } from "@lib/utils";
import { Button } from "@/components/atoms/button";

type Props = {
  product: HttpTypes.StoreProduct;
  region: HttpTypes.StoreRegion;
  eyebrow?: string;
};

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
): Record<string, string> =>
  variantOptions?.reduce<Record<string, string>>((acc, opt) => {
    acc[opt.option_id ?? ""] = opt.value;
    return acc;
  }, {}) ?? {};

const currencyFormatter = new Intl.NumberFormat("ro-MD");

function formatPrice(amount: number | null | undefined, code = "MDL") {
  if (amount == null) return "—";
  return `${currencyFormatter.format(Math.round(amount))} ${code}`;
}

export function PdpHero({ product, eyebrow }: Props) {
  const images = (product.images ?? []).filter((i) => i.url);
  const hasMultipleImages = images.length > 1;
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: hasMultipleImages,
    align: "center",
  });
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const [options, setOptions] = React.useState<Record<string, string>>(() => {
    if ((product.variants?.length ?? 0) === 1 && product.variants?.[0]) {
      return optionsAsKeymap(product.variants[0].options);
    }
    return {};
  });
  const [isAdding, setIsAdding] = React.useState(false);
  const [justAdded, setJustAdded] = React.useState(false);

  const primaryOption = product.options?.[0];
  const optionValues = primaryOption?.values?.map((v) => v.value) ?? [];

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
  const priceLabel =
    (selectedVariant?.calculated_price?.calculated_amount ?? !selectedVariant)
      ? formatPrice(displayPrice)
      : "—";
  const showFromPrefix =
    !selectedVariant && (product.variants?.length ?? 0) > 1;

  const isMultiVariant = (product.variants?.length ?? 0) > 1;

  const onSelectOption = (value: string) => {
    if (!primaryOption?.id) return;
    setOptions({ [primaryOption.id]: value });
  };

  const onAddToCart = async () => {
    if (!selectedVariant?.id || isAdding) return;
    setIsAdding(true);
    try {
      await addToCart({ variantId: selectedVariant.id, quantity: 1 });
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 2500);
    } finally {
      setIsAdding(false);
    }
  };

  const ctaLabel =
    isMultiVariant && !selectedVariant
      ? "Selectează varianta"
      : justAdded
        ? "Adăugat ✓"
        : "Adaugă în coș";

  return (
    <section
      aria-label="Prezentare produs"
      className="relative isolate -mt-px overflow-hidden bg-foreground"
    >
      {/* Red side rails — DYLLU brand frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[14px] bg-primary small:w-[20px] medium:w-[28px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-[14px] bg-primary small:w-[20px] medium:w-[28px]"
      />

      <div className="relative px-[14px] small:px-[20px] medium:px-[28px]">
        {/* Image carousel — background layer */}
        <div className="relative aspect-[16/9] w-full bg-surface-subtle small:aspect-[16/8] medium:aspect-[21/9]">
          <div ref={emblaRef} className="h-full overflow-hidden">
            <div className="flex h-full">
              {images.length === 0 ? (
                <div className="relative h-full min-w-full bg-muted" />
              ) : (
                images.map((img, i) => (
                  <div
                    key={img.id ?? img.url ?? i}
                    className="relative h-full min-w-full"
                  >
                    <Image
                      src={img.url}
                      alt={product.title ?? ""}
                      fill
                      sizes="100vw"
                      priority={i === 0}
                      className="object-contain"
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={() => emblaApi?.scrollPrev()}
                aria-label="Imaginea anterioară"
                className="absolute left-4 top-1/2 z-[1] grid size-10 -translate-y-1/2 place-items-center rounded-full border border-background/20 bg-background/80 text-foreground backdrop-blur transition-all hover:scale-105 hover:bg-background small:left-6"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => emblaApi?.scrollNext()}
                aria-label="Imaginea următoare"
                className="absolute right-4 top-1/2 z-[1] grid size-10 -translate-y-1/2 place-items-center rounded-full border border-background/20 bg-background/80 text-foreground backdrop-blur transition-all hover:scale-105 hover:bg-background small:right-6"
              >
                <ChevronRight className="size-5" />
              </button>
              <div className="absolute bottom-[136px] left-1/2 z-[1] flex -translate-x-1/2 gap-1.5 small:bottom-[148px]">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => emblaApi?.scrollTo(i)}
                    aria-label={`Imaginea ${i + 1}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === selectedIndex
                        ? "w-6 bg-foreground"
                        : "w-1.5 bg-foreground/40 hover:bg-foreground/60"
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Floating white card — overlaps the carousel at top edge */}
        <div className="relative z-[2] mx-auto -mt-20 mb-8 max-w-[1280px] small:-mt-24 medium:-mt-32">
          <div className="clip-corner-cut-md clip-shadow-lg grid gap-6 bg-card p-6 ring-1 ring-border small:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] small:gap-10 small:p-8 medium:p-10">
            <div className="space-y-3 small:space-y-4">
              {eyebrow && (
                <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  {eyebrow}
                </span>
              )}
              <h1 className="font-display text-2xl font-extrabold leading-[1.05] tracking-tight text-foreground small:text-3xl medium:text-4xl">
                {product.title}
              </h1>
              <div className="flex items-baseline gap-2 pt-1">
                {showFromPrefix && (
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    de la
                  </span>
                )}
                <span className="font-display text-2xl font-bold tracking-tight text-foreground small:text-3xl">
                  {priceLabel}
                </span>
              </div>
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
                            "min-w-[52px] rounded-full border px-3 py-1.5 text-xs font-medium tracking-tight transition-colors",
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

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={onAddToCart}
                  disabled={isAdding || (isMultiVariant && !selectedVariant)}
                  size="lg"
                  className="flex-1 rounded-full"
                >
                  <ShoppingBag className="size-4" />
                  {ctaLabel}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom red strip — closes the frame */}
        <div aria-hidden className="h-3 bg-primary small:h-4 medium:h-5" />
      </div>
    </section>
  );
}
