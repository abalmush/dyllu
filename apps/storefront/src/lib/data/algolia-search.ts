import "server-only";

import { sdk } from "@lib/config";

export type AlgoliaSearchRequest = {
  query?: string;
  categoryIds?: string[];
  onSale?: boolean;
  sort?: "relevance" | "price_asc" | "price_desc" | "created_at";
  page?: number;
  hitsPerPage?: number;
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
};

export type AlgoliaSearchResponse = {
  hits: AlgoliaProductHit[];
  nbHits: number;
  page: number;
  nbPages: number;
};

export async function searchProducts(
  request: AlgoliaSearchRequest
): Promise<AlgoliaSearchResponse> {
  return sdk.client.fetch<AlgoliaSearchResponse>("/store/products/search", {
    method: "POST",
    body: request,
    cache: "no-store",
  });
}
