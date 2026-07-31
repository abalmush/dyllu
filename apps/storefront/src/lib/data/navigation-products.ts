import "server-only";

import { sdk } from "@lib/config";
import { getCacheOptions } from "@lib/data/cookies";
import { getRegion } from "@lib/data/regions";

const PAGE_LIMIT = 100;
const PAGE_CONCURRENCY = 4;
const NAVIGATION_REVALIDATE_SECONDS = 300;
const NAVIGATION_LOCALE = "ro";

export type NavigationProduct = {
  id: string;
  thumbnail: string | null;
  categories: { id: string }[] | null;
  variants: { sku: string | null }[] | null;
};

async function fetchNavigationProductPage(
  offset: number,
  regionId: string,
  cacheOptions: { tags: string[] } | Record<string, never>
) {
  return sdk.client.fetch<{
    products: NavigationProduct[];
    count: number;
  }>("/store/products", {
    method: "GET",
    query: {
      limit: PAGE_LIMIT,
      offset,
      region_id: regionId,
      fields: "id,thumbnail,categories.id,variants.sku",
    },
    headers: { "x-medusa-locale": NAVIGATION_LOCALE },
    cache: "force-cache",
    next: { ...cacheOptions, revalidate: NAVIGATION_REVALIDATE_SECONDS },
  });
}

export async function listNavigationProducts(): Promise<NavigationProduct[]> {
  const region = await getRegion();
  if (!region) return [];

  const cacheOptions = await getCacheOptions("products");

  const firstPage = await fetchNavigationProductPage(
    0,
    region.id,
    cacheOptions
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
        fetchNavigationProductPage(
          (nextPageIndex + index) * PAGE_LIMIT,
          region.id,
          cacheOptions
        )
      )
    );
    for (const page of pages) products.push(...page.products);
  }

  return products;
}
