import { Suspense } from "react";

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid";
import RefinementList from "@modules/store/components/refinement-list";
import { SortOptions } from "@modules/store/components/refinement-list/sort-products";
import PaginatedProducts from "@modules/store/templates/paginated-products";
import { HttpTypes } from "@medusajs/types";
import { getCategoryTree } from "@lib/data/categories";

export default async function CollectionTemplate({
  sortBy,
  collection,
  page,
}: {
  sortBy?: SortOptions;
  collection: HttpTypes.StoreCollection;
  page?: string;
}) {
  const categories = await getCategoryTree();
  const pageNumber = page ? parseInt(page) : 1;
  const sort = sortBy || "created_at";

  return (
    <div className="content-container small:flex-row small:items-start flex flex-col py-6">
      <RefinementList sortBy={sort} categories={categories} />
      <div className="w-full">
        <div className="text-2xl-semi mb-8">
          <h1>{collection.title}</h1>
        </div>
        <Suspense
          fallback={
            <SkeletonProductGrid
              numberOfProducts={collection.products?.length}
            />
          }
        >
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            collectionId={collection.id}
          />
        </Suspense>
      </div>
    </div>
  );
}
