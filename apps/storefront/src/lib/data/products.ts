import "server-only";

import { sdk } from "@lib/config";
import { sortProducts } from "@lib/util/sort-products";
import { HttpTypes } from "@medusajs/types";
import { SortOptions } from "@modules/store/components/refinement-list/sort-products";
import { getAuthHeaders, getCacheOptions } from "./cookies";
import { getRegion, retrieveRegion } from "./regions";

const CATALOG_FETCH_LIMIT = 100;
const CATALOG_FETCH_CONCURRENCY = 4;

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  regionId,
}: {
  pageParam?: number;
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams;
  regionId?: string;
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number };
  nextPage: number | null;
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams;
}> => {
  const limit = queryParams?.limit || 12;
  const _pageParam = Math.max(pageParam, 1);
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit;

  const region = regionId ? await retrieveRegion(regionId) : await getRegion();

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    };
  }

  const headers = {
    ...(await getAuthHeaders()),
  };

  const next = {
    ...(await getCacheOptions("products")),
  };

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region.id,
          fields:
            "*options,*variants.options,*variants.calculated_price,+variants.inventory_quantity,*variants.images,+variants.metadata,+metadata,+tags,",
          ...queryParams,
        },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ products, count }) => {
      const nextPage = count > offset + limit ? _pageParam + 1 : null;

      return {
        response: {
          products,
          count,
        },
        nextPage: nextPage,
        queryParams,
      };
    });
};

export const listProductsWithSort = async ({
  page = 1,
  queryParams,
  sortBy = "created_at",
  onlyOnSale = false,
}: {
  page?: number;
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams;
  sortBy?: SortOptions;
  onlyOnSale?: boolean;
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number };
  nextPage: number | null;
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams;
}> => {
  const limit = queryParams?.limit || 12;
  const normalizedPage = Number.isFinite(page)
    ? Math.max(1, Math.floor(page))
    : 1;

  if (sortBy === "created_at" && !onlyOnSale) {
    const pageResult = await listProducts({
      pageParam: normalizedPage,
      queryParams: {
        ...queryParams,
        limit,
        order: "-created_at",
      } as HttpTypes.FindParams & HttpTypes.StoreProductListParams,
    });

    return {
      response: pageResult.response,
      nextPage: pageResult.nextPage,
      queryParams,
    };
  }

  const bulkQueryParams = {
    ...queryParams,
    limit: CATALOG_FETCH_LIMIT,
  } as HttpTypes.FindParams & HttpTypes.StoreProductListParams;

  const firstPage = await listProducts({
    pageParam: 1,
    queryParams: bulkQueryParams,
  });
  const productsById = new Map(
    firstPage.response.products.map((product) => [product.id, product])
  );
  const totalPages = Math.ceil(firstPage.response.count / CATALOG_FETCH_LIMIT);

  for (
    let firstPendingPage = 2;
    firstPendingPage <= totalPages;
    firstPendingPage += CATALOG_FETCH_CONCURRENCY
  ) {
    const lastPendingPage = Math.min(
      totalPages,
      firstPendingPage + CATALOG_FETCH_CONCURRENCY - 1
    );
    const pages = await Promise.all(
      Array.from(
        { length: lastPendingPage - firstPendingPage + 1 },
        (_, index) =>
          listProducts({
            pageParam: firstPendingPage + index,
            queryParams: bulkQueryParams,
          })
      )
    );

    for (const productPage of pages) {
      for (const product of productPage.response.products) {
        productsById.set(product.id, product);
      }
    }
  }

  const products = Array.from(productsById.values());

  const sortedProducts = sortProducts(products, sortBy);
  const filteredProducts = onlyOnSale
    ? sortedProducts.filter(
        (product) =>
          product.variants?.some(
            (variant) =>
              (variant.calculated_price?.original_amount ?? 0) >
              (variant.calculated_price?.calculated_amount ?? 0)
          ) ?? false
      )
    : sortedProducts;

  const pageOffset = (normalizedPage - 1) * limit;

  const nextPage =
    filteredProducts.length > pageOffset + limit ? normalizedPage + 1 : null;

  const paginatedProducts = filteredProducts.slice(
    pageOffset,
    pageOffset + limit
  );

  return {
    response: {
      products: paginatedProducts,
      count: filteredProducts.length,
    },
    nextPage,
    queryParams,
  };
};
