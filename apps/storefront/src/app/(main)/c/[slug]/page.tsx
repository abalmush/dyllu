import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";

import { getPromoBySlug } from "@lib/promos";
import { getProductTagByValue } from "@lib/data/product-tags";
import PlpShell from "@modules/store/components/plp-shell";
import PaginatedProducts from "@modules/store/templates/paginated-products";
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid";
import { SortOptions } from "@modules/store/components/refinement-list/sort-products";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sortBy?: SortOptions }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const promo = getPromoBySlug(slug);

  if (!promo || !promo.active) {
    notFound();
  }

  return {
    title: promo.title,
    description: promo.subtitle ?? `Descoperă selecția DYLLU: ${promo.title}.`,
  };
}

export default async function PromoPage(props: Props) {
  const { slug } = await props.params;
  const { page, sortBy } = await props.searchParams;

  const promo = getPromoBySlug(slug);
  if (!promo || !promo.active) {
    notFound();
  }

  const tag = await getProductTagByValue(promo.tag).catch(() => undefined);
  const pageNumber = page ? parseInt(page) : 1;
  const sort = sortBy || "created_at";

  const crumbs = [
    { label: "Acasă", href: "/" },
    { label: "Magazin", href: "/store" },
    { label: promo.title },
  ];

  return (
    <PlpShell
      title={promo.title}
      description={promo.subtitle ?? undefined}
      crumbs={crumbs}
      sortBy={sort}
    >
      {tag ? (
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts sortBy={sort} page={pageNumber} tagId={tag.id} />
        </Suspense>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-xl font-semibold">
              Selecția „{promo.title}” se pregătește
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Adăugăm în curând produse marcate pentru această colecție. Revino
              curând sau explorează întreaga gamă.
            </p>
          </div>
        </div>
      )}
    </PlpShell>
  );
}
