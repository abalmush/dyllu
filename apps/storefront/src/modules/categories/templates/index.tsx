import { Suspense } from "react";
import { notFound } from "next/navigation";
import { HttpTypes } from "@medusajs/types";

import PlpShell from "@modules/store/components/plp-shell";
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid";
import PaginatedProducts from "@modules/store/templates/paginated-products";
import { type SortOptions } from "@modules/store/components/refinement-list/sort-products";

type Props = {
  category: HttpTypes.StoreProductCategory;
  sortBy?: SortOptions;
  page?: string;
};

export default function CategoryTemplate({ category, sortBy, page }: Props) {
  const pageNumber = page ? parseInt(page) : 1;
  const sort = sortBy || "created_at";

  if (!category) notFound();

  const parents: HttpTypes.StoreProductCategory[] = [];
  const collectParents = (c: HttpTypes.StoreProductCategory) => {
    if (c.parent_category) {
      parents.unshift(c.parent_category);
      collectParents(c.parent_category);
    }
  };
  collectParents(category);

  const crumbs = [
    { label: "Acasă", href: "/" },
    { label: "Magazin", href: "/store" },
    ...parents.map((p) => ({ label: p.name, href: `/categories/${p.handle}` })),
    { label: category.name },
  ];

  const childrenLinks = category.category_children?.map((c) => ({
    name: c.name,
    handle: c.handle,
  }));

  return (
    <PlpShell
      title={category.name}
      description={category.description ?? undefined}
      crumbs={crumbs}
      sortBy={sort}
      activeCategoryHandle={category.handle}
      childrenLinks={childrenLinks}
    >
      <Suspense
        fallback={
          <SkeletonProductGrid
            numberOfProducts={category.products?.length ?? 8}
          />
        }
      >
        <PaginatedProducts
          sortBy={sort}
          page={pageNumber}
          categoryId={category.id}
        />
      </Suspense>
    </PlpShell>
  );
}
