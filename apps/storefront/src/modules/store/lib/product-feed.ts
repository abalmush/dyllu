import { listProductsWithSort } from "@lib/data/products";
import { toPlpProduct } from "@modules/store/lib/to-plp-product";

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

type ProductFeedQueryParams = {
  limit: number;
  collection_id?: string[];
  category_id?: string[];
  tag_id?: string[];
  id?: string[];
  order?: string;
  q?: string;
};

type NormalizedProductFeedRequest = {
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

export function normalizeProductFeedRequest(
  request: ProductFeedRequest
): NormalizedProductFeedRequest {
  const page = Number.isFinite(request.page)
    ? Math.max(1, Math.floor(request.page ?? 1))
    : 1;
  const sortBy = isProductFeedSort(request.sortBy)
    ? request.sortBy
    : DEFAULT_SORT;
  const query = request.query?.trim() || undefined;
  const productsIds = request.productsIds?.filter(Boolean);

  return {
    page,
    sortBy,
    collectionId: request.collectionId || undefined,
    categoryId: request.categoryId || undefined,
    tagId: request.tagId || undefined,
    productsIds: productsIds && productsIds.length > 0 ? productsIds : undefined,
    query,
    onSale: request.onSale === true,
  };
}

export async function getProductFeedPage(
  request: ProductFeedRequest
): Promise<ProductFeedResponse> {
  const normalizedRequest = normalizeProductFeedRequest(request);
  const currentPage = await fetchProductFeedPage(normalizedRequest);

  if (
    normalizedRequest.page > 1 &&
    currentPage.products.length === 0 &&
    currentPage.count > 0
  ) {
    return fetchProductFeedPage({ ...normalizedRequest, page: 1 });
  }

  return currentPage;
}

export function parseProductFeedRequest(
  searchParams: URLSearchParams
): ProductFeedRequest {
  const sortBy = searchParams.get("sortBy");
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const productsIds = searchParams.getAll("id").filter(Boolean);

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

function buildProductQueryParams(
  request: NormalizedProductFeedRequest
): ProductFeedQueryParams {
  const queryParams: ProductFeedQueryParams = {
    limit: PRODUCT_LIMIT,
  };

  if (request.collectionId) {
    queryParams.collection_id = [request.collectionId];
  }

  if (request.categoryId) {
    queryParams.category_id = [request.categoryId];
  }

  if (request.tagId) {
    queryParams.tag_id = [request.tagId];
  }

  if (request.productsIds) {
    queryParams.id = request.productsIds;
  }

  if (request.query) {
    queryParams.q = request.query;
  }

  if (request.sortBy === "created_at") {
    queryParams.order = "created_at";
  }

  return queryParams;
}

async function fetchProductFeedPage(
  request: NormalizedProductFeedRequest
): Promise<ProductFeedResponse> {
  const {
    response: { products, count },
  } = await listProductsWithSort({
    page: request.page,
    queryParams: buildProductQueryParams(request),
    sortBy: request.sortBy,
    onlyOnSale: request.onSale,
  });

  const totalPages = count > 0 ? Math.ceil(count / PRODUCT_LIMIT) : 0;

  return {
    products: products.map(toPlpProduct),
    count,
    currentPage: request.page,
    nextPage:
      totalPages > 0 && request.page < totalPages ? request.page + 1 : null,
    totalPages,
    pageSize: PRODUCT_LIMIT,
  };
}
