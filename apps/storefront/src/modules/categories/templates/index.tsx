import { Suspense } from "react";
import { notFound } from "next/navigation";
import { HttpTypes } from "@medusajs/types";

import PlpShell from "@modules/store/components/plp-shell";
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid";
import PaginatedProducts from "@modules/store/templates/paginated-products";
import { type SortOptions } from "@modules/store/components/refinement-list/sort-products";
import { findCategoryInTree, type CategoryNode } from "@lib/data/categories";

type Props = {
  category: HttpTypes.StoreProductCategory;
  sortBy?: SortOptions;
  page?: string;
  categories: CategoryNode[];
};

export default function CategoryTemplate({
  category,
  sortBy,
  page,
  categories,
}: Props) {
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
    ...parents.map((p) => ({ label: p.name, href: `/categories/${p.handle}` })),
    { label: category.name },
  ];

  const visibleCategory = findCategoryInTree(categories, category.handle);
  const childrenLinks = visibleCategory?.children.map((c) => ({
    name: c.name,
    handle: c.handle,
  }));
  const categoryIds = [
    category.id,
    ...(category.category_children ?? []).map((child) => child.id),
  ];

  return (
    <PlpShell
      title={category.name}
      description={category.description ?? undefined}
      crumbs={crumbs}
      sortBy={sort}
      categories={categories}
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
          categoryIds={categoryIds}
        />
      </Suspense>
    </PlpShell>
  );
}
