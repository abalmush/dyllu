"use client";

import * as React from "react";
import { isEqual } from "lodash";
import { ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { HttpTypes } from "@medusajs/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { addToCart } from "@lib/data/cart";
import { useIntersection } from "@lib/hooks/use-in-view";
import { Button } from "@/components/atoms/button";
import { Separator } from "@/components/atoms/separator";
import { QuantityStepper } from "@/components/molecules/quantity-stepper";

import MobileActions from "./mobile-actions";
import OptionSelect from "./option-select";
import ProductPrice from "../product-price";

type Props = {
  product: HttpTypes.StoreProduct;
  region: HttpTypes.StoreRegion;
  disabled?: boolean;
};

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) =>
  variantOptions?.reduce((acc: Record<string, string>, opt: any) => {
    acc[opt.option_id] = opt.value;
    return acc;
  }, {}) ?? {};

export default function ProductActions({ product, disabled }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [options, setOptions] = React.useState<
    Record<string, string | undefined>
  >({});
  const [quantity, setQuantity] = React.useState(1);
  const [isAdding, setIsAdding] = React.useState(false);

  React.useEffect(() => {
    if (product.variants?.length === 1) {
      setOptions(optionsAsKeymap(product.variants[0].options) ?? {});
    }
  }, [product.variants]);

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
      className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm small:p-7"
      ref={actionsRef}
    >
      <ProductPrice product={product} variant={selectedVariant} />

      {(product.variants?.length ?? 0) > 1 && (
        <div className="flex flex-col gap-5">
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

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Cantitate
        </span>
        <QuantityStepper value={quantity} onChange={setQuantity} max={20} />
      </div>

      <div className="flex flex-col gap-2">
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
          className="rounded-full"
          data-testid="add-product-button"
        >
          <ShoppingBag className="size-4" />
          {ctaLabel}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-full bg-success/10 px-4 py-2 text-xs font-semibold text-success">
        <span
          className={`size-2 rounded-full ${inStock ? "bg-success" : "bg-destructive"}`}
        />
        {inStock ? "În stoc · livrare 24–48h" : "Indisponibil"}
      </div>

      <Separator />

      <ul className="flex flex-col gap-3 text-sm">
        <li className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
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
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="size-4" />
          </span>
          <span className="text-foreground">
            <span className="font-semibold">
              Confirmare înainte de procesare
            </span>
            <span className="text-muted-foreground">
              {" "}
              · metoda de plată se validează la confirmarea comenzii
            </span>
          </span>
        </li>
      </ul>

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
