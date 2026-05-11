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
    { label: "Magazin", href: "/store" },
    ...(category
      ? [{ label: category.name, href: `/categories/${category.handle}` }]
      : []),
    { label: product.title },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumbs items={crumbs} />
      <div className="flex flex-wrap items-center gap-2">
        {collection && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {collection.title}
          </span>
        )}
        {product.material && (
          <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {product.material}
          </span>
        )}
      </div>
      <h1
        className="font-display text-3xl font-extrabold leading-tight tracking-tight text-foreground small:text-display-md"
        data-testid="product-title"
      >
        {product.title}
      </h1>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-0.5 text-warning">
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
          <span className="font-semibold text-foreground">4.8</span>
          <span className="text-muted-foreground"> · 124 recenzii</span>
        </span>
      </div>
      {product.description && (
        <p
          className="whitespace-pre-line text-base text-muted-foreground"
          data-testid="product-description"
        >
          {product.description}
        </p>
      )}
    </div>
  );
}
