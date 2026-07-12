"use server";

import { sdk } from "@lib/config";
import { sortProducts } from "@lib/util/sort-products";
import { HttpTypes } from "@medusajs/types";
import { SortOptions } from "@modules/store/components/refinement-list/sort-products";
import { getAuthHeaders, getCacheOptions } from "./cookies";
import { getRegion, retrieveRegion } from "./regions";

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
      const nextPage = count > offset + limit ? pageParam + 1 : null;

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
  page = 0,
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

  const {
    response: { products },
  } = await listProducts({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      limit: 100,
    },
  });

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

  const pageParam = (page - 1) * limit;

  const nextPage =
    filteredProducts.length > pageParam + limit ? page + 1 : null;

  const paginatedProducts = filteredProducts.slice(
    pageParam,
    pageParam + limit
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
