import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";

import { getPromoBySlug } from "@lib/promos";
import { getProductTagByValue } from "@lib/data/product-tags";
import { getCategoryTree } from "@lib/data/categories";
import { buildSocialMetadata } from "@/lib/seo/metadata";
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

  return buildSocialMetadata({
    title: promo.title,
    description: promo.subtitle ?? `Descoperă selecția DYLLU: ${promo.title}.`,
    path: `/c/${slug}`,
    imageAlt: `${promo.title} — selecție DYLLU`,
  });
}

export default async function PromoPage(props: Props) {
  const { slug } = await props.params;
  const { page, sortBy } = await props.searchParams;

  const promo = getPromoBySlug(slug);
  if (!promo || !promo.active) {
    notFound();
  }

  const [tag, categories] = await Promise.all([
    getProductTagByValue(promo.tag).catch(() => undefined),
    getCategoryTree(),
  ]);
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
      categories={categories}
    >
      {tag ? (
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts sortBy={sort} page={pageNumber} tagId={tag.id} />
        </Suspense>
      ) : (
        <div className="border-border bg-muted/30 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-16 text-center">
          <div className="bg-primary/10 text-primary grid size-14 place-items-center rounded-full">
            <Sparkles className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-xl font-semibold">
              Selecția „{promo.title}” se pregătește
            </h2>
            <p className="text-muted-foreground max-w-md text-sm">
              Adăugăm în curând produse marcate pentru această colecție. Revino
              curând sau explorează întreaga gamă.
            </p>
          </div>
        </div>
      )}
    </PlpShell>
  );
}
