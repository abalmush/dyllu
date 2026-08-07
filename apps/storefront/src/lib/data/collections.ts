import "server-only";

import { getLocale } from "next-intl/server";
import { sdk } from "@lib/config";
import { HttpTypes } from "@medusajs/types";
import { getCacheOptions } from "./cookies";
import { toMedusaLocale } from "@/i18n/medusa-locale";

export const retrieveCollection = async (id: string) => {
  const next = {
    ...(await getCacheOptions("collections")),
  };
  const locale = toMedusaLocale(await getLocale());

  return sdk.client
    .fetch<{ collection: HttpTypes.StoreCollection }>(
      `/store/collections/${id}`,
      {
        query: { locale },
        next,
        cache: "force-cache",
      }
    )
    .then(({ collection }) => collection);
};

export const listCollections = async (
  queryParams: Record<string, string> = {}
): Promise<{ collections: HttpTypes.StoreCollection[]; count: number }> => {
  const next = {
    ...(await getCacheOptions("collections")),
  };
  const locale = toMedusaLocale(await getLocale());

  queryParams.limit = queryParams.limit || "100";
  queryParams.offset = queryParams.offset || "0";

  return sdk.client
    .fetch<{ collections: HttpTypes.StoreCollection[]; count: number }>(
      "/store/collections",
      {
        query: { ...queryParams, locale },
        next,
        cache: "force-cache",
      }
    )
    .then(({ collections }) => ({ collections, count: collections.length }));
};

export const getCollectionByHandle = async (
  handle: string
): Promise<HttpTypes.StoreCollection> => {
  const next = {
    ...(await getCacheOptions("collections")),
  };
  const locale = toMedusaLocale(await getLocale());

  return sdk.client
    .fetch<HttpTypes.StoreCollectionListResponse>(`/store/collections`, {
      query: { handle, locale },
      next,
      cache: "force-cache",
    })
    .then(({ collections }) => collections[0]);
};
