import "server-only";

import { listProductsWithSort } from "@lib/data/products";
import { toPlpProduct } from "@modules/store/lib/to-plp-product";
import {
  PRODUCT_LIMIT,
  normalizeProductFeedRequest,
  type NormalizedProductFeedRequest,
  type ProductFeedRequest,
  type ProductFeedResponse,
} from "@modules/store/lib/product-feed-contract";

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
