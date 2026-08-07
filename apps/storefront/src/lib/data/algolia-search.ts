import "server-only";

import { sdk } from "@lib/config";

export type AlgoliaSearchRequest = {
  query?: string;
  categoryIds?: string[];
  onSale?: boolean;
  sort?: "relevance" | "price_asc" | "price_desc" | "created_at";
  page?: number;
  hitsPerPage?: number;
  // Route Handlers under app/api/** sit outside the [locale] segment, so
  // next-intl's request-scoped locale isn't resolvable there the way it is
  // in Server Components — callers reached from a Route Handler must pass
  // the active locale through explicitly instead of relying on the SDK's
  // usual global x-medusa-locale default.
  locale?: string;
};

export type AlgoliaProductHit = {
  objectID: string;
  title: string;
  description: string;
  handle: string;
  thumbnail: string | null;
  price: number | null;
  original_price: number | null;
  on_sale: boolean;
  variant_id: string | null;
  variant_title: string | null;
};

export type AlgoliaSearchResponse = {
  hits: AlgoliaProductHit[];
  nbHits: number;
  page: number;
  nbPages: number;
};

export async function searchProducts({
  locale,
  ...body
}: AlgoliaSearchRequest): Promise<AlgoliaSearchResponse> {
  return sdk.client.fetch<AlgoliaSearchResponse>("/store/products/search", {
    method: "POST",
    body,
    cache: "no-store",
    ...(locale ? { headers: { "x-medusa-locale": locale } } : {}),
  });
}
