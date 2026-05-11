import { Suspense } from "react";

import PlpShell from "@modules/store/components/plp-shell";
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid";
import { type SortOptions } from "@modules/store/components/refinement-list/sort-products";

import PaginatedProducts from "./paginated-products";

type Props = {
  sortBy?: SortOptions;
  page?: string;
};

export default function StoreTemplate({ sortBy, page }: Props) {
  const pageNumber = page ? parseInt(page) : 1;
  const sort = sortBy || "created_at";

  return (
    <PlpShell
      title="Toate produsele"
      description="Explorează gama completă de scule, accesorii și echipamente DYLLU."
      crumbs={[
        { label: "Acasă", href: "/" },
        { label: "Magazin" },
      ]}
      sortBy={sort}
    >
      <Suspense fallback={<SkeletonProductGrid />}>
        <PaginatedProducts sortBy={sort} page={pageNumber} />
      </Suspense>
    </PlpShell>
  );
}
