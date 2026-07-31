import "server-only";

import { listProducts, listProductsWithSort } from "@lib/data/products";
import { HttpTypes } from "@medusajs/types";
import { toPlpProducts } from "@modules/store/lib/to-plp-product";
import {
  PRODUCT_LIMIT,
  normalizeProductFeedRequest,
  type NormalizedProductFeedRequest,
  type ProductFeedRequest,
  type ProductFeedResponse,
} from "@modules/store/lib/product-feed-contract";

const BOUNDED_FETCH_PAGE_SIZE = 100;
const MAX_BOUNDED_FETCH_PRODUCTS = 1_000;

type ProductFeedQueryParams = {
  limit: number;
  collection_id?: string[];
  category_id?: string[];
  tag_id?: string[];
  id?: string[];
  order?: string;
  q?: string;
};

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

function buildProductQueryParams(
  request: NormalizedProductFeedRequest
): ProductFeedQueryParams {
  const queryParams: ProductFeedQueryParams = {
    limit: PRODUCT_LIMIT,
  };

  if (request.collectionId) {
    queryParams.collection_id = [request.collectionId];
  }

  if (request.categoryIds) {
    queryParams.category_id = request.categoryIds;
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
    queryParams.order = "-created_at";
  }

  return queryParams;
}

function usesBoundedFetch(request: NormalizedProductFeedRequest): boolean {
  return request.sortBy === "created_at" && !request.onSale;
}

async function fetchProductFeedPage(
  request: NormalizedProductFeedRequest
): Promise<ProductFeedResponse> {
  return usesBoundedFetch(request)
    ? fetchBoundedCreatedAtPage(request)
    : fetchFullScanPage(request);
}

// Price sort and the on-sale filter cannot be pushed down to the backend
// (calculated price isn't a sortable/filterable column), so they still need
// a full-catalogue scan for correctness. The default created_at browse path
// below is bounded instead.
async function fetchBoundedCreatedAtPage(
  request: NormalizedProductFeedRequest
): Promise<ProductFeedResponse> {
  const queryParams = {
    ...buildProductQueryParams(request),
    limit: BOUNDED_FETCH_PAGE_SIZE,
  };

  const firstPage = await listProducts({ pageParam: 1, queryParams });
  const productCount = firstPage.response.count;
  const collectedProducts: HttpTypes.StoreProduct[] = [
    ...firstPage.response.products,
  ];
  let expandedCards = collectedProducts.flatMap(toPlpProducts);
  const targetCardCount = request.page * PRODUCT_LIMIT + PRODUCT_LIMIT;

  while (
    expandedCards.length < targetCardCount &&
    collectedProducts.length < productCount &&
    collectedProducts.length < MAX_BOUNDED_FETCH_PRODUCTS
  ) {
    const nextPageParam =
      Math.floor(collectedProducts.length / BOUNDED_FETCH_PAGE_SIZE) + 1;
    const { response } = await listProducts({
      pageParam: nextPageParam,
      queryParams,
    });
    collectedProducts.push(...response.products);
    expandedCards = collectedProducts.flatMap(toPlpProducts);
  }

  const offset = (request.page - 1) * PRODUCT_LIMIT;
  const catalogExhausted = collectedProducts.length >= productCount;
  const hasKnownMoreCards = expandedCards.length > offset + PRODUCT_LIMIT;
  const nextPage =
    hasKnownMoreCards || !catalogExhausted ? request.page + 1 : null;

  return {
    products: expandedCards.slice(offset, offset + PRODUCT_LIMIT),
    // Approximates the true card count with the backend product count
    // (cheap, returned by the first bounded page) rather than scanning the
    // whole catalogue to expand every multi-variant product into cards.
    count: productCount,
    currentPage: request.page,
    nextPage,
    totalPages: Math.max(request.page, Math.ceil(productCount / PRODUCT_LIMIT)),
    pageSize: PRODUCT_LIMIT,
  };
}

async function fetchFullScanPage(
  request: NormalizedProductFeedRequest
): Promise<ProductFeedResponse> {
  const {
    response: { products },
  } = await listProductsWithSort({
    page: 1,
    queryParams: buildProductQueryParams(request),
    sortBy: request.sortBy,
    fetchAll: true,
  });

  const expandedProducts = products.flatMap(toPlpProducts);
  const filteredProducts = request.onSale
    ? expandedProducts.filter((product) => product.price?.price_type === "sale")
    : expandedProducts;
  const sortedProducts = sortProductFeedItems(filteredProducts, request.sortBy);
  const count = sortedProducts.length;
  const totalPages = count > 0 ? Math.ceil(count / PRODUCT_LIMIT) : 0;
  const offset = (request.page - 1) * PRODUCT_LIMIT;

  return {
    products: sortedProducts.slice(offset, offset + PRODUCT_LIMIT),
    count,
    currentPage: request.page,
    nextPage:
      totalPages > 0 && request.page < totalPages ? request.page + 1 : null,
    totalPages,
    pageSize: PRODUCT_LIMIT,
  };
}

function sortProductFeedItems(
  products: ReturnType<typeof toPlpProducts>,
  sortBy: NormalizedProductFeedRequest["sortBy"]
) {
  if (sortBy === "created_at") return products;

  return products.toSorted((left, right) => {
    const leftPrice = left.price?.calculated_price_number;
    const rightPrice = right.price?.calculated_price_number;

    if (typeof leftPrice !== "number") return 1;
    if (typeof rightPrice !== "number") return -1;

    return sortBy === "price_asc"
      ? leftPrice - rightPrice
      : rightPrice - leftPrice;
  });
}
