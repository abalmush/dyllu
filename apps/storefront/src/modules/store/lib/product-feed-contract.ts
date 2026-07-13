import type { toPlpProduct } from "@modules/store/lib/to-plp-product";

export const PRODUCT_LIMIT = 12;

export type ProductFeedSort = "price_asc" | "price_desc" | "created_at";

export type ProductFeedRequest = {
  page?: number;
  sortBy?: ProductFeedSort;
  collectionId?: string;
  categoryId?: string;
  tagId?: string;
  productsIds?: string[];
  query?: string;
  onSale?: boolean;
};

export type NormalizedProductFeedRequest = {
  page: number;
  sortBy: ProductFeedSort;
  collectionId?: string;
  categoryId?: string;
  tagId?: string;
  productsIds?: string[];
  query?: string;
  onSale: boolean;
};

export type ProductFeedItem = ReturnType<typeof toPlpProduct>;

export type ProductFeedResponse = {
  products: ProductFeedItem[];
  count: number;
  currentPage: number;
  nextPage: number | null;
  totalPages: number;
  pageSize: number;
};

const DEFAULT_SORT: ProductFeedSort = "created_at";
const MAX_PAGE = 10_000;
const MAX_QUERY_LENGTH = 120;
const MAX_PRODUCT_IDS = 50;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_:-]{1,128}$/;

export function normalizeProductFeedRequest(
  request: ProductFeedRequest
): NormalizedProductFeedRequest {
  const page = Number.isFinite(request.page)
    ? Math.min(MAX_PAGE, Math.max(1, Math.floor(request.page ?? 1)))
    : 1;
  const sortBy = isProductFeedSort(request.sortBy)
    ? request.sortBy
    : DEFAULT_SORT;
  const query = request.query?.trim().slice(0, MAX_QUERY_LENGTH) || undefined;
  const productsIds = request.productsIds
    ?.filter((id) => IDENTIFIER_PATTERN.test(id))
    .slice(0, MAX_PRODUCT_IDS);
  const identifier = (value: string | undefined) =>
    value && IDENTIFIER_PATTERN.test(value) ? value : undefined;

  return {
    page,
    sortBy,
    collectionId: identifier(request.collectionId),
    categoryId: identifier(request.categoryId),
    tagId: identifier(request.tagId),
    productsIds:
      productsIds && productsIds.length > 0 ? productsIds : undefined,
    query,
    onSale: request.onSale === true,
  };
}

export function parseProductFeedRequest(
  searchParams: URLSearchParams
): ProductFeedRequest {
  const sortBy = searchParams.get("sortBy");
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const productsIds = searchParams
    .getAll("id")
    .filter(Boolean)
    .slice(0, MAX_PRODUCT_IDS);

  return normalizeProductFeedRequest({
    page: Number.isFinite(page) ? page : 1,
    sortBy: isProductFeedSort(sortBy) ? sortBy : undefined,
    collectionId: searchParams.get("collectionId") || undefined,
    categoryId: searchParams.get("categoryId") || undefined,
    tagId: searchParams.get("tagId") || undefined,
    productsIds: productsIds.length > 0 ? productsIds : undefined,
    query: searchParams.get("q") || undefined,
    onSale: searchParams.get("onSale") === "true",
  });
}

export function toProductFeedSearchParams(
  request: ProductFeedRequest
): URLSearchParams {
  const normalizedRequest = normalizeProductFeedRequest(request);
  const params = new URLSearchParams();

  params.set("page", normalizedRequest.page.toString());

  if (normalizedRequest.sortBy !== DEFAULT_SORT) {
    params.set("sortBy", normalizedRequest.sortBy);
  }

  if (normalizedRequest.collectionId) {
    params.set("collectionId", normalizedRequest.collectionId);
  }

  if (normalizedRequest.categoryId) {
    params.set("categoryId", normalizedRequest.categoryId);
  }

  if (normalizedRequest.tagId) {
    params.set("tagId", normalizedRequest.tagId);
  }

  if (normalizedRequest.query) {
    params.set("q", normalizedRequest.query);
  }

  if (normalizedRequest.onSale) {
    params.set("onSale", "true");
  }

  for (const id of normalizedRequest.productsIds ?? []) {
    params.append("id", id);
  }

  return params;
}

export function getProductFeedRequestKey(request: ProductFeedRequest): string {
  return JSON.stringify(normalizeProductFeedRequest(request));
}

function isProductFeedSort(
  value: ProductFeedRequest["sortBy"] | string | null | undefined
): value is ProductFeedSort {
  return (
    value === "created_at" || value === "price_asc" || value === "price_desc"
  );
}
