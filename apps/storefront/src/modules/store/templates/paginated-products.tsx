import Link from "next/link";
import { PackageSearch } from "lucide-react";

import { listProductsWithSort } from "@lib/data/products";
import { getRegion } from "@lib/data/regions";
import { Button } from "@/components/atoms/button";
import ProductPreview from "@modules/products/components/product-preview";
import { Pagination } from "@modules/store/components/pagination";
import { SortOptions } from "@modules/store/components/refinement-list/sort-products";

const PRODUCT_LIMIT = 12;

type PaginatedProductsParams = {
  limit: number;
  collection_id?: string[];
  category_id?: string[];
  id?: string[];
  order?: string;
};

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  productsIds,
}: {
  sortBy?: SortOptions;
  page: number;
  collectionId?: string;
  categoryId?: string;
  productsIds?: string[];
}) {
  const queryParams: PaginatedProductsParams = {
    limit: 12,
  };

  if (collectionId) {
    queryParams["collection_id"] = [collectionId];
  }

  if (categoryId) {
    queryParams["category_id"] = [categoryId];
  }

  if (productsIds) {
    queryParams["id"] = productsIds;
  }

  if (sortBy === "created_at") {
    queryParams["order"] = "created_at";
  }

  const region = await getRegion();

  if (!region) {
    return null;
  }

  const {
    response: { products, count },
  } = await listProductsWithSort({
    page,
    queryParams,
    sortBy,
  });

  const totalPages = Math.ceil(count / PRODUCT_LIMIT);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
        <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
          <PackageSearch className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-xl font-semibold">
            Categoria încă nu are produse
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Stocul se actualizează constant. Între timp, descoperă restul gamei
            sau contactează-ne pentru o cotație personalizată.
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/store">Vezi toate produsele</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Cere o ofertă</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ul
        className="grid w-full grid-cols-2 gap-4 small:grid-cols-3 medium:grid-cols-4"
        data-testid="products-list"
      >
        {products.map((p) => (
          <li key={p.id}>
            <ProductPreview product={p} region={region} />
          </li>
        ))}
      </ul>
      {totalPages > 1 && (
        <div className="mt-12">
          <Pagination
            data-testid="product-pagination"
            page={page}
            totalPages={totalPages}
          />
        </div>
      )}
    </>
  );
}
