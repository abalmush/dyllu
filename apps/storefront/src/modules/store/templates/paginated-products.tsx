import Link from "next/link";
import { PackageSearch } from "lucide-react";

import { Button } from "@/components/atoms/button";
import { SortOptions } from "@modules/store/components/refinement-list/sort-products";
import InfiniteProductsGrid from "@modules/store/components/infinite-products-grid";
import {
  getProductFeedPage,
  getProductFeedRequestKey,
  type ProductFeedRequest,
} from "@modules/store/lib/product-feed";

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  tagId,
  productsIds,
  query,
  onSale,
}: {
  sortBy?: SortOptions;
  page: number;
  collectionId?: string;
  categoryId?: string;
  tagId?: string;
  productsIds?: string[];
  query?: string;
  onSale?: boolean;
}) {
  const request: ProductFeedRequest = {
    sortBy,
    page,
    collectionId,
    categoryId,
    tagId,
    productsIds,
    query,
    onSale,
  };

  const { products, count, currentPage, nextPage } = await getProductFeedPage(
    request
  );

  if (products.length === 0) {
    const emptyTitle = query
      ? `Nu am găsit produse pentru „${query}”`
      : onSale
        ? "Nu există reduceri active în acest moment"
        : "Categoria încă nu are produse";
    const emptyDescription = query
      ? "Încearcă alt termen de căutare, verifică o categorie apropiată sau cere ajutorul echipei DYLLU."
      : onSale
        ? "Promoțiile se actualizează constant. Revino curând sau vezi gama completă disponibilă acum."
        : "Stocul se actualizează constant. Între timp, descoperă restul gamei sau contactează-ne pentru o cotație personalizată.";

    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
        <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
          <PackageSearch className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-xl font-semibold">{emptyTitle}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {emptyDescription}
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
    <InfiniteProductsGrid
      key={getProductFeedRequestKey({ ...request, page: currentPage })}
      initialProducts={products}
      initialNextPage={nextPage}
      totalCount={count}
      request={{
        sortBy,
        collectionId,
        categoryId,
        tagId,
        productsIds,
        query,
        onSale,
      }}
    />
  );
}
