import { Star } from "lucide-react";
import { HttpTypes } from "@medusajs/types";

import { Breadcrumbs } from "@/components/molecules/breadcrumbs";

type Props = {
  product: HttpTypes.StoreProduct;
};

export default function ProductInfo({ product }: Props) {
  const collection = product.collection;
  const category = product.categories?.[0];
  const crumbs = [
    { label: "Acasă", href: "/" },
    ...(category
      ? [{ label: category.name, href: `/categories/${category.handle}` }]
      : []),
    { label: product.title },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={crumbs} />
      <div className="flex flex-wrap items-center gap-2">
        {collection && (
          <span className="bg-primary/15 text-2xs text-brand-900 inline-flex items-center rounded-full px-2.5 py-1 font-semibold tracking-[0.18em] uppercase">
            {collection.title}
          </span>
        )}
        {product.material && (
          <span className="border-border text-2xs text-muted-foreground inline-flex items-center rounded-full border px-2.5 py-1 font-medium">
            {product.material}
          </span>
        )}
      </div>
      <h1
        className="font-display text-foreground small:text-display-md text-3xl leading-tight font-extrabold tracking-tight"
        data-testid="product-title"
      >
        {product.title}
      </h1>
      <div className="text-muted-foreground flex items-center gap-4 text-sm">
        <div className="text-warning flex items-center gap-0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              className="size-4"
              fill="currentColor"
              strokeWidth={0}
            />
          ))}
        </div>
        <span>
          <span className="text-foreground font-semibold">4.8</span>
          <span className="text-muted-foreground"> · 124 recenzii</span>
        </span>
      </div>
      {product.description && (
        <p
          className="text-muted-foreground text-base whitespace-pre-line"
          data-testid="product-description"
        >
          {product.description}
        </p>
      )}
    </div>
  );
}
