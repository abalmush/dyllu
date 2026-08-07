"use client";

import * as React from "react";
import Image from "next/image";
import { isEqual } from "lodash";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useFormatter, useTranslations } from "next-intl";
import { HttpTypes } from "@medusajs/types";

import { useCart } from "@lib/cart/cart-context";
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

export function PdpHero({ product, eyebrow }: Props) {
  const t = useTranslations("PdpHero");
  const format = useFormatter();
  const formatPrice = (amount: number | null | undefined, code = "MDL") => {
    if (amount == null) return "—";
    return `${format.number(Math.round(amount))} ${code}`;
  };
  const { addItem } = useCart();
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
      await addItem(
        { variantId: selectedVariant.id, quantity: 1 },
        {
          variantId: selectedVariant.id,
          productHandle: product.handle ?? "",
          title: product.title ?? "",
          variantTitle: selectedVariant.title ?? undefined,
          thumbnail: product.thumbnail ?? undefined,
          quantity: 1,
          unitPrice: selectedVariant.calculated_price?.calculated_amount ?? 0,
          currencyCode:
            selectedVariant.calculated_price?.currency_code ?? "mdl",
        }
      );
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 2500);
    } finally {
      setIsAdding(false);
    }
  };

  const ctaLabel =
    isMultiVariant && !selectedVariant
      ? t("selectVariant")
      : justAdded
        ? t("added")
        : t("addToCart");

  return (
    <section
      aria-label={t("sectionLabel")}
      className="bg-foreground relative isolate -mt-px overflow-hidden"
    >
      {/* Red side rails — DYLLU brand frame */}
      <div
        aria-hidden
        className="bg-primary small:w-[20px] medium:w-[28px] pointer-events-none absolute inset-y-0 left-0 w-[14px]"
      />
      <div
        aria-hidden
        className="bg-primary small:w-[20px] medium:w-[28px] pointer-events-none absolute inset-y-0 right-0 w-[14px]"
      />

      <div className="small:px-[20px] medium:px-[28px] relative px-[14px]">
        {/* Image carousel — background layer */}
        <div className="bg-surface-subtle small:aspect-16/8 medium:aspect-21/9 relative aspect-video w-full">
          <div ref={emblaRef} className="h-full overflow-hidden">
            <div className="flex h-full">
              {images.length === 0 ? (
                <div className="bg-muted relative h-full min-w-full" />
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
                aria-label={t("previousImage")}
                className="border-background/20 bg-background/80 text-foreground hover:bg-background small:left-6 absolute top-1/2 left-4 z-1 grid size-10 -translate-y-1/2 place-items-center rounded-full border backdrop-blur-sm transition-all hover:scale-105"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => emblaApi?.scrollNext()}
                aria-label={t("nextImage")}
                className="border-background/20 bg-background/80 text-foreground hover:bg-background small:right-6 absolute top-1/2 right-4 z-1 grid size-10 -translate-y-1/2 place-items-center rounded-full border backdrop-blur-sm transition-all hover:scale-105"
              >
                <ChevronRight className="size-5" />
              </button>
              <div className="small:bottom-[148px] absolute bottom-[136px] left-1/2 z-1 flex -translate-x-1/2 gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => emblaApi?.scrollTo(i)}
                    aria-label={t("imageIndicator", { index: i + 1 })}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === selectedIndex
                        ? "bg-foreground w-6"
                        : "bg-foreground/40 hover:bg-foreground/60 w-1.5"
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Floating white card — overlaps the carousel at top edge */}
        <div className="small:-mt-24 medium:-mt-32 relative z-2 mx-auto -mt-20 mb-8 max-w-[1280px]">
          <div className="clip-corner-cut-md clip-shadow-lg bg-card ring-border small:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] small:gap-12 small:p-8 medium:p-12 grid gap-6 p-6 ring-1">
            <div className="small:space-y-4 space-y-4">
              {eyebrow && (
                <span className="text-2xs text-brand-800 block font-semibold tracking-[0.18em] uppercase">
                  {eyebrow}
                </span>
              )}
              <h1 className="font-display text-foreground small:text-3xl medium:text-4xl text-2xl leading-[1.05] font-extrabold tracking-tight">
                {product.title}
              </h1>
              <div className="flex items-baseline gap-2 pt-1">
                {showFromPrefix && (
                  <span className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
                    {t("fromPrefix")}
                  </span>
                )}
                <span className="font-display text-foreground small:text-3xl text-2xl font-bold tracking-tight">
                  {priceLabel}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {isMultiVariant && primaryOption && optionValues.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
                      {primaryOption.title}
                    </span>
                    {options[primaryOption.id ?? ""] && (
                      <span className="text-foreground text-sm font-semibold tracking-tight">
                        {options[primaryOption.id ?? ""]}
                      </span>
                    )}
                  </div>
                  <div
                    className="flex flex-wrap gap-1.5"
                    role="radiogroup"
                    aria-label={primaryOption.title ?? t("variantFallback")}
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
                            "min-w-[52px] rounded-full border px-4 py-1.5 text-xs font-medium tracking-tight transition-colors",
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
                      <span className="text-muted-foreground grid place-items-center px-4 text-xs">
                        +{optionValues.length - 12}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
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
        <div aria-hidden className="bg-primary small:h-4 medium:h-5 h-3" />
      </div>
    </section>
  );
}
