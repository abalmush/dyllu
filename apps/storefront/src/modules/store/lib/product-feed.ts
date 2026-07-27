import "server-only";

import { listProductsWithSort } from "@lib/data/products";
import { toPlpProducts } from "@modules/store/lib/to-plp-product";
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
    queryParams.order = "created_at";
  }

  return queryParams;
}

async function fetchProductFeedPage(
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
