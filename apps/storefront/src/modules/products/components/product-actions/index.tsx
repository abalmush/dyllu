"use client";

import * as React from "react";
import { isEqual } from "lodash";
import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { HttpTypes } from "@medusajs/types";

import { useCart } from "@lib/cart/cart-context";
import type { OptimisticCartItem } from "@lib/cart/cart-context";
import type { CompatibleAccessories } from "@lib/data/compatible-accessories";
import { useIntersection } from "@lib/hooks/use-in-view";
import { cn } from "@lib/utils";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { QuantityStepper } from "@/components/molecules/quantity-stepper";
import {
  getProductPowerSupply,
  getVariantDisplayTitle,
} from "@modules/products/lib/product-presentation";

import MobileActions from "./mobile-actions";
import OptionSelect from "./option-select";
import ConfigurationSelect from "./configuration-select";
import { PowerSupplyConfigurator } from "./power-supply-configurator";
import { getProductPrice } from "@lib/util/get-product-price";

const isConfigurationOption = (title?: string | null) =>
  (title ?? "").trim().toLowerCase() === "configurație";

const priceFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});
const formatMdl = (amount: number, currency?: string) =>
  `${priceFormatter.format(amount)} ${(currency ?? "mdl").toUpperCase()}`;

type Props = {
  product: HttpTypes.StoreProduct;
  region: HttpTypes.StoreRegion;
  initialVariantId?: string;
  onVariantChange?: (variant: HttpTypes.StoreProductVariant) => void;
  compatiblePowerAccessories?: CompatibleAccessories;
  disabled?: boolean;
};

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) =>
  variantOptions?.reduce((acc: Record<string, string>, opt) => {
    if (opt.option_id) {
      acc[opt.option_id] = opt.value;
    }
    return acc;
  }, {}) ?? {};

export default function ProductActions({
  product,
  initialVariantId,
  onVariantChange,
  compatiblePowerAccessories = { batteries: [], chargers: [] },
  disabled,
}: Props) {
  const t = useTranslations("ProductActions.buyBox");
  const { addItems } = useCart();
  const [options, setOptions] = React.useState<
    Record<string, string | undefined>
  >(() => {
    const initialVariant =
      product.variants?.find((variant) => variant.id === initialVariantId) ??
      product.variants?.[0];

    if (initialVariant) {
      return optionsAsKeymap(initialVariant.options) ?? {};
    }

    return {};
  });
  const [quantity, setQuantity] = React.useState(1);
  const [selectedBatteryId, setSelectedBatteryId] = React.useState<string>();
  const [selectedChargerId, setSelectedChargerId] = React.useState<string>();
  const [isAdding, setIsAdding] = React.useState(false);

  const selectedVariant = React.useMemo(() => {
    if (!product.variants?.length) return undefined;
    return product.variants.find((v) =>
      isEqual(optionsAsKeymap(v.options), options)
    );
  }, [product.variants, options]);
  const supply = getProductPowerSupply(product, selectedVariant);
  const showPowerConfigurator =
    (product.variants?.length ?? 0) <= 1 &&
    supply?.powerSource === "cordless_battery" &&
    supply.batteryIncluded === false &&
    compatiblePowerAccessories.batteries.length > 0;

  const inStock = React.useMemo(() => {
    if (selectedVariant && !selectedVariant.manage_inventory) return true;
    if (selectedVariant?.allow_backorder) return true;
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true;
    }
    return false;
  }, [selectedVariant]);

  const { variantPrice, cheapestPrice } = getProductPrice({
    product,
    variantId: selectedVariant?.id,
  });
  const displayPrice = selectedVariant ? variantPrice : cheapestPrice;
  const badges: React.ReactNode[] = [];

  if ((product.variants?.length ?? 0) > 1) {
    badges.push(
      <Badge key="variants" variant="outline">
        {t("variantsCount", { count: product.variants?.length ?? 0 })}
      </Badge>
    );
  }

  if (product.collection?.title) {
    badges.push(
      <Badge key="collection" variant="soft">
        {product.collection.title}
      </Badge>
    );
  }

  if (product.material) {
    badges.push(
      <Badge key="material" variant="outline">
        {product.material}
      </Badge>
    );
  }

  const setOptionValue = (id: string, value: string) => {
    const nextOptions = { ...options, [id]: value };
    const nextVariant = product.variants?.find((variant) =>
      isEqual(optionsAsKeymap(variant.options), nextOptions)
    );

    setOptions(nextOptions);
    if (nextVariant) onVariantChange?.(nextVariant);
  };

  const actionsRef = React.useRef<HTMLDivElement>(null);
  const inView = useIntersection(actionsRef, "0px");

  const findAccessoryVariant = (variantId?: string) => {
    if (!variantId) return undefined;
    return [
      ...compatiblePowerAccessories.batteries,
      ...compatiblePowerAccessories.chargers,
    ]
      .flatMap((accessory) =>
        (accessory.variants ?? []).map((variant) => ({ accessory, variant }))
      )
      .find(({ variant }) => variant.id === variantId);
  };

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return;
    setIsAdding(true);

    const accessoryItems = [selectedBatteryId, selectedChargerId].flatMap(
      (variantId) => {
        if (!showPowerConfigurator || !variantId) return [];
        const match = findAccessoryVariant(variantId);
        if (!match) return [];

        return [
          {
            variantId,
            productHandle: match.accessory.handle ?? "",
            title: match.accessory.title ?? "",
            variantTitle: match.variant.title ?? undefined,
            thumbnail: match.accessory.thumbnail ?? undefined,
            quantity: 1,
            unitPrice: match.variant.calculated_price?.calculated_amount ?? 0,
            currencyCode:
              match.variant.calculated_price?.currency_code ?? "mdl",
          } satisfies OptimisticCartItem,
        ];
      }
    );

    try {
      await addItems(
        {
          items: [
            { variantId: selectedVariant.id, quantity },
            ...accessoryItems.map(({ variantId, quantity }) => ({
              variantId,
              quantity,
            })),
          ],
        },
        [
          {
            variantId: selectedVariant.id,
            productHandle: product.handle ?? "",
            title: product.title ?? "",
            variantTitle: selectedVariant.title ?? undefined,
            thumbnail: product.thumbnail ?? undefined,
            quantity,
            unitPrice: displayPrice?.calculated_price_number ?? 0,
            currencyCode: displayPrice?.currency_code ?? "mdl",
          },
          ...accessoryItems,
        ]
      );
    } finally {
      setIsAdding(false);
    }
  };

  const selectedAccessoryProducts = [
    ...compatiblePowerAccessories.batteries,
    ...compatiblePowerAccessories.chargers,
  ].filter((accessory) =>
    accessory.variants?.some(
      (variant) =>
        variant.id === selectedBatteryId || variant.id === selectedChargerId
    )
  );
  const selectedAccessoryTotal = selectedAccessoryProducts.reduce(
    (total, accessory) =>
      total +
      (accessory.variants?.find(
        (variant) =>
          variant.id === selectedBatteryId || variant.id === selectedChargerId
      )?.calculated_price?.calculated_amount ?? 0),
    0
  );
  const configuredTotal =
    (displayPrice?.calculated_price_number ?? 0) * quantity +
    selectedAccessoryTotal;
  const selectedAccessoryCount =
    Number(Boolean(showPowerConfigurator && selectedBatteryId)) +
    Number(Boolean(showPowerConfigurator && selectedChargerId));
  const ctaLabel = !selectedVariant
    ? t("selectVariant")
    : !inStock
      ? t("soldOut")
      : selectedAccessoryCount > 0
        ? t("addWithAccessories", {
            count: selectedAccessoryCount + 1,
            price: formatMdl(configuredTotal, displayPrice?.currency_code),
          })
        : t("addToCart");

  const showFromPrefix = !selectedVariant;
  const isSale = displayPrice?.price_type === "sale";
  const priceLabel =
    displayPrice?.calculated_price_number != null
      ? formatMdl(
          displayPrice.calculated_price_number,
          displayPrice.currency_code
        )
      : "—";
  const originalLabel =
    isSale && displayPrice?.original_price_number != null
      ? formatMdl(
          displayPrice.original_price_number,
          displayPrice.currency_code
        )
      : null;
  const isActionable = inStock && !!selectedVariant && !disabled;

  return (
    <div
      data-tmp-id="pdp-buy-card"
      className="clip-corner-cut-lg clip-shadow-xl bg-card ring-border small:p-6 medium:p-7 large:p-8 flex flex-col gap-5 p-5 ring-1 md:p-6"
      ref={actionsRef}
    >
      <div className="grid gap-5">
        <div className="small:grid small:grid-cols-[minmax(0,1fr)_auto] small:gap-x-5 small:gap-y-2 flex flex-col gap-2">
          <h1
            className="font-display text-foreground xsmall:text-2xl small:col-start-1 small:row-start-1 medium:text-[1.625rem] medium:leading-[1.15] max-w-[24ch] text-xl leading-snug font-bold tracking-tight text-balance"
            data-testid="product-title"
          >
            {getVariantDisplayTitle(product, selectedVariant)}
          </h1>

          <div className="small:col-start-1 small:row-start-2 flex flex-wrap items-baseline gap-x-2 gap-y-2">
            {showFromPrefix && (
              <span className="text-muted-foreground text-sm font-medium">
                {t("fromPricePrefix")}
              </span>
            )}
            <span
              data-testid="product-price"
              className={cn(
                "clip-corner-cut-sm font-display xsmall:text-4xl medium:text-[2.5rem] inline-flex px-4 py-2.5 text-3xl leading-none font-bold tracking-tight",
                isSale
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-foreground text-background"
              )}
            >
              {priceLabel}
            </span>
            {originalLabel && (
              <span className="text-muted-foreground text-base line-through">
                {originalLabel}
              </span>
            )}
          </div>

          <span
            className={cn(
              "small:col-start-2 small:row-start-1 small:self-start small:justify-self-end inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              inStock
                ? "border-success/20 bg-success/10 text-success"
                : "border-destructive/20 bg-destructive/10 text-destructive"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                inStock ? "bg-success" : "bg-destructive"
              )}
            />
            {inStock ? t("inStock") : t("outOfStock")}
          </span>

          {selectedVariant?.sku ? (
            <div className="small:col-start-2 small:row-start-2 small:justify-self-end flex items-center gap-2 text-xs">
              <span className="text-muted-foreground/60 font-medium tracking-wide uppercase">
                SKU
              </span>
              <span className="text-muted-foreground font-medium">
                {selectedVariant.sku}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-border/60 small:block h-px w-full md:hidden" />

          <div className="flex flex-col gap-4">
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-2">{badges}</div>
            )}

            {(product.variants?.length ?? 0) > 1 && (
              <div className="flex flex-col gap-4">
                {(product.options || []).map((option) =>
                  isConfigurationOption(option.title) ? (
                    <ConfigurationSelect
                      key={option.id}
                      product={product}
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  ) : (
                    <OptionSelect
                      key={option.id}
                      product={product}
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  )
                )}
              </div>
            )}

            {showPowerConfigurator ? (
              <PowerSupplyConfigurator
                batteries={compatiblePowerAccessories.batteries}
                chargers={compatiblePowerAccessories.chargers}
                selectedBatteryId={selectedBatteryId}
                selectedChargerId={selectedChargerId}
                onBatteryChange={setSelectedBatteryId}
                onChargerChange={setSelectedChargerId}
              />
            ) : null}

            <div className="xsmall:gap-4 flex items-stretch gap-2">
              <QuantityStepper
                value={quantity}
                onChange={setQuantity}
                max={20}
                disabled={!inStock || !!disabled}
              />

              <Button
                onClick={handleAddToCart}
                disabled={!isActionable || isAdding}
                isLoading={isAdding}
                variant={isActionable ? "brand" : "secondary"}
                className="xsmall:px-6 h-12 min-w-0 flex-1 rounded-md px-3"
                data-testid="add-product-button"
              >
                {isActionable && <ShoppingBag className="size-4" />}
                <span className="xsmall:hidden">
                  {isActionable ? t("addShort") : ctaLabel}
                </span>
                <span className="xsmall:inline hidden">{ctaLabel}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <MobileActions
        product={product}
        variant={selectedVariant}
        options={options}
        updateOptions={setOptionValue}
        inStock={inStock}
        handleAddToCart={handleAddToCart}
        isAdding={isAdding}
        show={!inView}
        optionsDisabled={!!disabled || isAdding}
      />
    </div>
  );
}
