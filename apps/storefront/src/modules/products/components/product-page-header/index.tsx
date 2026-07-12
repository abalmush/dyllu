import { HttpTypes } from "@medusajs/types";

import { Breadcrumbs } from "@/components/molecules/breadcrumbs";
import { cn } from "@lib/utils";
import {
  buildProductBreadcrumbs,
  getProductEyebrow,
} from "@modules/products/lib/product-presentation";

type Props = {
  product: HttpTypes.StoreProduct;
  className?: string;
};

export default function ProductPageHeader({ product, className }: Props) {
  const eyebrow = getProductEyebrow(product);

  return (
    <header className={cn("space-y-4", className)}>
      <Breadcrumbs items={buildProductBreadcrumbs(product)} />
      {eyebrow ? (
        <p className="text-sm font-semibold tracking-wide text-brand-800">
          {eyebrow}
        </p>
      ) : null}
      <h1
        className="max-w-[24ch] text-balance font-display text-[2.35rem] font-extrabold leading-[1.02] tracking-tight text-foreground small:text-[2.8rem] medium:text-[3.35rem]"
        data-testid="product-title"
      >
        {product.title}
      </h1>
    </header>
  );
}
