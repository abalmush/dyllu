"use client";

import * as React from "react";
import { ChevronUp, ShoppingBag } from "lucide-react";
import { HttpTypes } from "@medusajs/types";

import { cn } from "@lib/utils";
import { isSimpleProduct } from "@lib/util/product";
import { getProductPrice } from "@lib/util/get-product-price";
import { Button } from "@/components/atoms/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/atoms/sheet";
import { PriceBlock } from "@/components/molecules/price-block";
import { getVariantDisplayTitle } from "@modules/products/lib/product-presentation";

import OptionSelect from "./option-select";
import ConfigurationSelect from "./configuration-select";

const isConfigurationOption = (title?: string | null) =>
  (title ?? "").trim().toLowerCase() === "configurație";

type Props = {
  product: HttpTypes.StoreProduct;
  variant?: HttpTypes.StoreProductVariant;
  options: Record<string, string | undefined>;
  updateOptions: (title: string, value: string) => void;
  inStock?: boolean;
  handleAddToCart: () => void;
  isAdding?: boolean;
  show: boolean;
  optionsDisabled: boolean;
};

export default function MobileActions({
  product,
  variant,
  options,
  updateOptions,
  inStock,
  handleAddToCart,
  isAdding,
  show,
  optionsDisabled,
}: Props) {
  const [open, setOpen] = React.useState(false);

  const { variantPrice, cheapestPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  });
  const price = variantPrice || cheapestPrice;
  const simple = isSimpleProduct(product);
  const hasOptions = (product.variants?.length ?? 0) > 1;

  return (
    <>
      <div
        className={cn(
          "border-border bg-background/95 small:hidden fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-[0_-12px_30px_-15px_rgba(15,23,42,0.25)] backdrop-blur-sm transition-transform duration-300",
          show ? "translate-y-0" : "pointer-events-none translate-y-full"
        )}
        data-testid="mobile-actions"
      >
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p
              className="text-muted-foreground line-clamp-1 text-xs font-medium"
              data-testid="mobile-title"
            >
              {getVariantDisplayTitle(product, variant)}
            </p>
            {price && <PriceBlock price={price} size="md" />}
          </div>
          {hasOptions && !simple ? (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setOpen(true)}
                className="rounded-full"
                data-testid="mobile-actions-button"
              >
                <ChevronUp className="size-4" />
                Opțiuni
              </Button>
              <Button
                variant="brand"
                size="lg"
                onClick={handleAddToCart}
                disabled={!inStock || !variant}
                isLoading={isAdding}
                className="clip-corner-cut-sm rounded-none"
                data-testid="mobile-cart-button"
              >
                <ShoppingBag className="size-4" />
                {!inStock ? "Stoc epuizat" : "Adaugă"}
              </Button>
            </>
          ) : (
            <Button
              variant="brand"
              size="lg"
              onClick={handleAddToCart}
              disabled={!inStock || !variant}
              isLoading={isAdding}
              className="clip-corner-cut-sm rounded-none"
              data-testid="mobile-cart-button"
            >
              <ShoppingBag className="size-4" />
              {!inStock ? "Stoc epuizat" : "Adaugă în coș"}
            </Button>
          )}
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Alege opțiuni</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-6">
            {(product.options || []).map((option) =>
              isConfigurationOption(option.title) ? (
                <ConfigurationSelect
                  key={option.id}
                  product={product}
                  option={option}
                  current={options[option.id]}
                  updateOption={updateOptions}
                  disabled={optionsDisabled}
                />
              ) : (
                <OptionSelect
                  key={option.id}
                  product={product}
                  option={option}
                  current={options[option.id]}
                  updateOption={updateOptions}
                  title={option.title ?? ""}
                  disabled={optionsDisabled}
                />
              )
            )}
            <Button
              variant="brand"
              size="lg"
              onClick={() => {
                handleAddToCart();
                setOpen(false);
              }}
              disabled={!inStock || !variant}
              isLoading={isAdding}
              className="clip-corner-cut-sm mt-2 rounded-none"
            >
              <ShoppingBag className="size-4" />
              {!variant
                ? "Selectează varianta"
                : !inStock
                  ? "Stoc epuizat"
                  : "Adaugă în coș"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
