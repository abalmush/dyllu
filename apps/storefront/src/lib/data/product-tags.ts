import "server-only";

import { sdk } from "@lib/config";
import { HttpTypes } from "@medusajs/types";

import { getCacheOptions } from "./cookies";

export const getProductTagByValue = async (
  value: string
): Promise<HttpTypes.StoreProductTag | undefined> => {
  const next = {
    ...(await getCacheOptions("product-tags")),
  };

  const { product_tags } = await sdk.client.fetch<{
    product_tags: HttpTypes.StoreProductTag[];
  }>("/store/product-tags", {
    query: { value, limit: 1 },
    next,
    cache: "force-cache",
  });

  return product_tags?.[0];
};
