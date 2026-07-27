import { Suspense } from "react";

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

export default function StoreTemplate({
  sortBy,
  page,
  query,
  onSale,
  categories,
}: Props) {
  const pageNumber = page ? parseInt(page) : 1;
  const sort = sortBy || "created_at";
  const trimmedQuery = query?.trim();

  const title = trimmedQuery
    ? `Rezultate pentru „${trimmedQuery}”`
    : onSale
      ? "Reduceri active"
      : "Toate produsele";

  const description = trimmedQuery
    ? "Produse DYLLU relevante pentru căutarea ta, pregătite pentru livrare sau confirmare rapidă."
    : onSale
      ? "Vezi produsele și ofertele disponibile acum în magazinul online DYLLU."
      : "Explorează gama completă de scule, accesorii și echipamente DYLLU.";

  return (
    <PlpShell
      title={title}
      description={description}
      crumbs={[{ label: "Acasă", href: "/" }, { label: "Magazin" }]}
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
