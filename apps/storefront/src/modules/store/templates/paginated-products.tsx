import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PackageSearch } from "lucide-react";

import { Button } from "@/components/atoms/button";
import { SortOptions } from "@modules/store/components/refinement-list/sort-products";
import InfiniteProductsGrid from "@modules/store/components/infinite-products-grid";
import { getProductFeedPage } from "@modules/store/lib/product-feed";
import {
  getProductFeedRequestKey,
  type ProductFeedRequest,
} from "@modules/store/lib/product-feed-contract";

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryIds,
  tagId,
  productsIds,
  query,
  onSale,
}: {
  sortBy?: SortOptions;
  page: number;
  collectionId?: string;
  categoryIds?: string[];
  tagId?: string;
  productsIds?: string[];
  query?: string;
  onSale?: boolean;
}) {
  const request: ProductFeedRequest = {
    sortBy,
    page,
    collectionId,
    categoryIds,
    tagId,
    productsIds,
    query,
    onSale,
  };

  const { products, count, currentPage, nextPage } =
    await getProductFeedPage(request);

  if (products.length === 0) {
    const t = await getTranslations("Store");
    const emptyTitle = query
      ? t("emptySearchTitle", { query })
      : onSale
        ? t("emptySaleTitle")
        : t("emptyCategoryTitle");
    const emptyDescription = query
      ? t("emptySearchDescription")
      : onSale
        ? t("emptySaleDescription")
        : t("emptyCategoryDescription");

    return (
      <div className="border-border bg-muted/30 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-16 text-center">
        <div className="bg-primary/10 text-primary grid size-14 place-items-center rounded-full">
          <PackageSearch className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-xl font-semibold">{emptyTitle}</h2>
          <p className="text-muted-foreground max-w-md text-sm">
            {emptyDescription}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <Button asChild>
            <Link href="/store">{t("viewAllProducts")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">{t("requestQuote")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <InfiniteProductsGrid
      key={getProductFeedRequestKey({ ...request, page: currentPage })}
      initialProducts={products}
      initialNextPage={nextPage}
      totalCount={count}
      request={{
        sortBy,
        collectionId,
        categoryIds,
        tagId,
        productsIds,
        query,
        onSale,
      }}
    />
  );
}
