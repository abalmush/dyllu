"use server";

import { sdk } from "@lib/config";
import { HttpTypes } from "@medusajs/types";
import { getAuthHeaders, getCartId } from "./cookies";

export const listCartShippingMethods = async () => {
  const cartId = await getCartId();
  if (!cartId) return [];

  const headers = {
    ...(await getAuthHeaders()),
  };

  return sdk.client
    .fetch<HttpTypes.StoreShippingOptionListResponse>(
      `/store/shipping-options`,
      {
        method: "GET",
        query: {
          cart_id: cartId,
        },
        headers,
        cache: "no-store",
      }
    )
    .then(({ shipping_options }) => shipping_options);
};

export const calculatePriceForShippingOption = async (optionId: string) => {
  if (!/^[A-Za-z0-9_:-]{1,128}$/.test(optionId)) {
    throw new Error("Invalid shipping option ID");
  }
  const cartId = await getCartId();
  if (!cartId) {
    throw new Error("No existing cart found");
  }

  const headers = {
    ...(await getAuthHeaders()),
  };

  return sdk.client
    .fetch<{ shipping_option: HttpTypes.StoreCartShippingOption }>(
      `/store/shipping-options/${optionId}/calculate`,
      {
        method: "POST",
        body: { cart_id: cartId },
        headers,
        cache: "no-store",
      }
    )
    .then(({ shipping_option }) => shipping_option);
};
