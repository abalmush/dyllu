"use client";

import { HttpTypes } from "@medusajs/types";
import { useTranslations } from "next-intl";

import { Breadcrumbs } from "@/components/molecules/breadcrumbs";
import { buildProductBreadcrumbs } from "@modules/products/lib/product-presentation";

type Props = {
  product: HttpTypes.StoreProduct;
  variant?: HttpTypes.StoreProductVariant;
  className?: string;
};

export default function ProductPageHeader({
  product,
  variant,
  className,
}: Props) {
  const t = useTranslations("Breadcrumbs");
  return (
    <header className={className}>
      <Breadcrumbs
        items={buildProductBreadcrumbs(product, variant, t("home"))}
      />
    </header>
  );
}
