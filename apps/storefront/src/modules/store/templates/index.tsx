import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import PlpShell from "@modules/store/components/plp-shell";
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid";
import { type SortOptions } from "@modules/store/components/refinement-list/sort-products";
import { type CategoryNode } from "@lib/data/categories";

import PaginatedProducts from "./paginated-products";

type Props = {
  sortBy?: SortOptions;
  page?: string;
  query?: string;
  onSale?: boolean;
  categories: CategoryNode[];
};

export default async function StoreTemplate({
  sortBy,
  page,
  query,
  onSale,
  categories,
}: Props) {
  const t = await getTranslations("Store");
  const tBreadcrumbs = await getTranslations("Breadcrumbs");
  const pageNumber = page ? parseInt(page) : 1;
  const sort = sortBy || "created_at";
  const trimmedQuery = query?.trim();

  const title = trimmedQuery
    ? t("searchResultsTitle", { query: trimmedQuery })
    : onSale
      ? t("saleTitle")
      : t("allProductsTitle");

  const description = trimmedQuery
    ? t("searchResultsDescription")
    : onSale
      ? t("saleDescription")
      : t("allProductsDescription");

  return (
    <PlpShell
      title={title}
      description={description}
      crumbs={[
        { label: tBreadcrumbs("home"), href: "/" },
        { label: tBreadcrumbs("store") },
      ]}
      sortBy={sort}
      categories={categories}
    >
      <Suspense fallback={<SkeletonProductGrid />}>
        <PaginatedProducts
          sortBy={sort}
          page={pageNumber}
          query={trimmedQuery}
          onSale={onSale}
        />
      </Suspense>
    </PlpShell>
  );
}
