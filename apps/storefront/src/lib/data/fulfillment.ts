"use server";

import { sdk } from "@lib/config";
import { HttpTypes } from "@medusajs/types";
import { getAuthHeaders } from "./cookies";
import { isShippingOptionAllowedForAddress } from "@lib/shipping/delivery-area";

export const listCartShippingMethods = async (cart: HttpTypes.StoreCart) => {
  const headers = {
    ...(await getAuthHeaders()),
  };

  const response =
    await sdk.client.fetch<HttpTypes.StoreShippingOptionListResponse>(
      `/store/shipping-options`,
      {
        method: "GET",
        query: {
          cart_id: cart.id,
        },
        headers,
        cache: "no-store",
      }
    );

  return response.shipping_options.filter((option) =>
    isShippingOptionAllowedForAddress(option, cart.shipping_address)
  );
};
