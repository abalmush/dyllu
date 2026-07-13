import "server-only";

import { sdk } from "@lib/config";
import { getAuthHeaders, getCacheOptions } from "./cookies";
import { HttpTypes } from "@medusajs/types";

export const listCartPaymentMethods = async (regionId: string) => {
  if (!/^[A-Za-z0-9_:-]{1,128}$/.test(regionId)) return [];

  const headers = {
    ...(await getAuthHeaders()),
  };

  const next = {
    ...(await getCacheOptions("payment_providers")),
  };

  return sdk.client
    .fetch<HttpTypes.StorePaymentProviderListResponse>(
      `/store/payment-providers`,
      {
        method: "GET",
        query: { region_id: regionId },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ payment_providers }) =>
      payment_providers.sort((a, b) => {
        return a.id > b.id ? 1 : -1;
      })
    );
};
