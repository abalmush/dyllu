"use client";

import * as React from "react";
import { isEqual } from "lodash";
import { ShoppingBag } from "lucide-react";
import { HttpTypes } from "@medusajs/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { addToCart } from "@lib/data/cart";
import { useIntersection } from "@lib/hooks/use-in-view";
import { cn } from "@lib/utils";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { PriceBlock } from "@/components/molecules/price-block";
import { PurchaseTrustGrid } from "@/components/organisms/purchase-trust-grid";
import { ProductTypeBadge } from "@/components/organisms/product-type-badge";
import { QuantityStepper } from "@/components/molecules/quantity-stepper";
import { getProductUiType } from "@modules/products/lib/product-presentation";

import MobileActions from "./mobile-actions";
import OptionSelect from "./option-select";
import { getProductPrice } from "@lib/util/get-product-price";

type Props = {
  product: HttpTypes.StoreProduct;
  region: HttpTypes.StoreRegion;
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

export default function ProductActions({ product, disabled }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [options, setOptions] = React.useState<
    Record<string, string | undefined>
  >(() => {
    if ((product.variants?.length ?? 0) === 1 && product.variants?.[0]) {
      return optionsAsKeymap(product.variants[0].options) ?? {};
    }

    return {};
  });
  const [quantity, setQuantity] = React.useState(1);
  const [isAdding, setIsAdding] = React.useState(false);
  const productType = getProductUiType(product);

  const selectedVariant = React.useMemo(() => {
    if (!product.variants?.length) return undefined;
    return product.variants.find((v) =>
      isEqual(optionsAsKeymap(v.options), options)
    );
  }, [product.variants, options]);

  const isValidVariant = React.useMemo(
    () =>
      product.variants?.some((v) =>
        isEqual(optionsAsKeymap(v.options), options)
      ),
    [product.variants, options]
  );

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const value = isValidVariant ? selectedVariant?.id : null;
    if (params.get("v_id") === value) return;
    if (value) params.set("v_id", value);
    else params.delete("v_id");
    router.replace(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariant, isValidVariant]);

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

  if (productType === "needs-battery") {
    badges.push(<ProductTypeBadge key="type" type={productType} />);
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

  const setOptionValue = (id: string, value: string) =>
    setOptions((prev) => ({ ...prev, [id]: value }));

  const actionsRef = React.useRef<HTMLDivElement>(null);
  const inView = useIntersection(actionsRef, "0px");

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return;
    setIsAdding(true);
    try {
      await addToCart({ variantId: selectedVariant.id, quantity });
    } finally {
      setIsAdding(false);
    }
  };

  const ctaLabel = !selectedVariant
    ? "Selectează varianta"
    : !inStock || !isValidVariant
      ? "Stoc epuizat"
      : "Adaugă în coș";

  return (
    <div
      className="clip-corner-cut-lg clip-shadow-lg flex flex-col gap-4 bg-card p-6 ring-1 ring-border small:gap-5 small:p-7"
      ref={actionsRef}
    >
      <div className="flex flex-col gap-2">
        <PriceBlock
          price={displayPrice}
          prefix={!selectedVariant ? "de la" : undefined}
          size="xl"
          className="[&_span[data-testid='product-price']]:font-display [&_span[data-testid='product-price']]:text-[2.9rem] [&_span[data-testid='product-price']]:font-extrabold [&_span[data-testid='product-price']]:leading-none small:[&_span[data-testid='product-price']]:text-[3.2rem] medium:[&_span[data-testid='product-price']]:text-[3.35rem]"
        />

        <span
          className={cn(
            "clip-corner-cut-xs inline-flex w-fit items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
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

      <div className="clip-corner-cut-md flex flex-col gap-4 bg-surface-subtle/70 p-4 ring-1 ring-border/70 small:p-5">
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2">{badges}</div>
        )}

        {(product.variants?.length ?? 0) > 1 && (
          <div className="flex flex-col gap-4">
            {(product.options || []).map((option) => (
              <OptionSelect
                key={option.id}
                option={option}
                current={options[option.id]}
                updateOption={setOptionValue}
                title={option.title ?? ""}
                data-testid="product-options"
                disabled={!!disabled || isAdding}
              />
            ))}
          </div>
        )}

        <div className="grid gap-3 small:grid-cols-[132px_minmax(0,1fr)] small:items-end">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Cantitate
            </span>
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              max={20}
              className="w-full justify-between"
            />
          </div>

          <Button
            onClick={handleAddToCart}
            disabled={
              !inStock ||
              !selectedVariant ||
              !!disabled ||
              isAdding ||
              !isValidVariant
            }
            isLoading={isAdding}
            size="xl"
            variant="brand"
            className="clip-corner-cut-sm min-h-14 rounded-none px-8 shadow-[0_20px_40px_-24px_rgba(201,255,46,0.95)]"
            data-testid="add-product-button"
          >
            <ShoppingBag className="size-4" />
            {ctaLabel}
          </Button>
        </div>
      </div>

      {product.description && (
        <p
          className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground"
          data-testid="product-description"
        >
          {product.description}
        </p>
      )}

      <PurchaseTrustGrid />

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
