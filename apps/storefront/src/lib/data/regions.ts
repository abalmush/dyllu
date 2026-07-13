import "server-only";

import { sdk } from "@lib/config";
import medusaError from "@lib/util/medusa-error";
import { HttpTypes } from "@medusajs/types";
import { getCacheOptions } from "./cookies";

export const listRegions = async () => {
  const next = {
    ...(await getCacheOptions("regions")),
  };

  return sdk.client
    .fetch<{ regions: HttpTypes.StoreRegion[] }>(`/store/regions`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ regions }) => regions)
    .catch(medusaError);
};

export const retrieveRegion = async (id: string) => {
  const next = {
    ...(await getCacheOptions(["regions", id].join("-"))),
  };

  return sdk.client
    .fetch<{ region: HttpTypes.StoreRegion }>(`/store/regions/${id}`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ region }) => region)
    .catch(medusaError);
};

export const getRegion = async () => {
  try {
    const regions = await listRegions();
    return regions?.[0] ?? null;
  } catch {
    return null;
  }
};
