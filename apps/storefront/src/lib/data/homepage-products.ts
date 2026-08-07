import "server-only";

import { getLocale } from "next-intl/server";
import { sdk } from "@lib/config";
import { getCacheOptions } from "@lib/data/cookies";
import { toMedusaLocale } from "@/i18n/medusa-locale";

const PAGE_LIMIT = 100;
const PAGE_CONCURRENCY = 4;
const CANDIDATES_REVALIDATE_SECONDS = 300;

export type HomepageProductCandidate = {
  id: string;
  title: string;
};

async function fetchCandidatePage(
  collectionId: string,
  regionId: string,
  offset: number,
  locale: string,
  tags: string[]
) {
  return sdk.client.fetch<{
    products: HomepageProductCandidate[];
    count: number;
  }>("/store/products", {
    method: "GET",
    query: {
      limit: PAGE_LIMIT,
      offset,
      collection_id: collectionId,
      region_id: regionId,
      fields: "id,title",
      locale,
    },
    cache: "force-cache",
    next: { tags, revalidate: CANDIDATES_REVALIDATE_SECONDS },
  });
}

// Cross-request cached list of a collection's lightweight product candidates,
// used to pick diverse merchandising representatives without paying for a
// fresh, price-bearing full-catalogue-style scan on every homepage render.
export async function listCollectionProductCandidates(
  collectionId: string,
  regionId: string
): Promise<HomepageProductCandidate[]> {
  const productsCacheOptions = await getCacheOptions("products");
  const collectionsCacheOptions = await getCacheOptions("collections");
  const tags = [
    ...new Set([
      ...(productsCacheOptions.tags ?? []),
      ...(collectionsCacheOptions.tags ?? []),
    ]),
  ];

  const locale = toMedusaLocale(await getLocale());
  const firstPage = await fetchCandidatePage(
    collectionId,
    regionId,
    0,
    locale,
    tags
  );
  const products = [...firstPage.products];
  const totalPages = Math.ceil(firstPage.count / PAGE_LIMIT);

  for (
    let nextPageIndex = 1;
    nextPageIndex < totalPages;
    nextPageIndex += PAGE_CONCURRENCY
  ) {
    const lastPageIndex =
      Math.min(totalPages, nextPageIndex + PAGE_CONCURRENCY) - 1;
    const pages = await Promise.all(
      Array.from({ length: lastPageIndex - nextPageIndex + 1 }, (_, index) =>
        fetchCandidatePage(
          collectionId,
          regionId,
          (nextPageIndex + index) * PAGE_LIMIT,
          locale,
          tags
        )
      )
    );
    for (const page of pages) products.push(...page.products);
  }

  return products;
}
