"use server";

import { sdk } from "@lib/config";
import medusaError from "@lib/util/medusa-error";
import { getAuthHeaders, getOrderConfirmationId } from "./cookies";
import { HttpTypes } from "@medusajs/types";

const isIdentifier = (value: string) => /^[A-Za-z0-9_:-]{1,128}$/.test(value);
const transferError = {
  success: false as const,
  error: "Solicitarea de transfer nu a putut fi procesată.",
  order: null,
};

export const retrieveOrder = async (id: string) => {
  if (!isIdentifier(id)) {
    throw new Error("Invalid order ID");
  }
  const headers = await getAuthHeaders();
  const fields =
    "*payment_collections.payments,*items,*items.metadata,*items.variant,*items.product";

  if ("authorization" in headers) {
    return sdk.client
      .fetch<HttpTypes.StoreOrderListResponse>("/store/orders", {
        method: "GET",
        query: {
          id,
          limit: 1,
          fields,
        },
        headers,
        cache: "no-store",
      })
      .then(({ orders }) => orders[0] ?? null)
      .catch(handleOrderReadError);
  }

  const confirmationId = await getOrderConfirmationId();
  if (confirmationId !== id) {
    return null;
  }

  return sdk.client
    .fetch<HttpTypes.StoreOrderResponse>(`/store/orders/${id}`, {
      method: "GET",
      query: { fields },
      headers,
      cache: "no-store",
    })
    .then(({ order }) => order)
    .catch(handleOrderReadError);
};

function handleOrderReadError(error: unknown): null {
  const status =
    typeof error === "object" && error && "status" in error
      ? error.status
      : undefined;
  if (status === 401 || status === 404) return null;
  return medusaError(error);
}

export const listOrders = async () => {
  const headers = await getAuthHeaders();
  if (!("authorization" in headers)) return [];

  return sdk.client
    .fetch<HttpTypes.StoreOrderListResponse>(`/store/orders`, {
      method: "GET",
      query: {
        limit: 100,
        offset: 0,
        order: "-created_at",
        fields: "*items,+items.metadata,*items.variant,*items.product",
      },
      headers,
      cache: "no-store",
    })
    .then(({ orders }) => orders)
    .catch((error: unknown) => {
      const status =
        typeof error === "object" && error && "status" in error
          ? error.status
          : undefined;
      if (status === 401) return [];
      return medusaError(error);
    });
};

export const createTransferRequest = async (
  _state: {
    success: boolean;
    error: string | null;
    order: HttpTypes.StoreOrder | null;
  },
  formData: FormData
): Promise<{
  success: boolean;
  error: string | null;
  order: HttpTypes.StoreOrder | null;
}> => {
  const rawId = formData.get("order_id");
  const id = typeof rawId === "string" ? rawId.trim() : "";

  if (!isIdentifier(id)) {
    return { success: false, error: "Order ID is required", order: null };
  }

  const headers = await getAuthHeaders();
  if (!("authorization" in headers)) return transferError;

  return await sdk.store.order
    .requestTransfer(
      id,
      {},
      {
        fields: "id, email",
      },
      headers
    )
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch(() => transferError);
};

export const acceptTransferRequest = async (id: string, token: string) => {
  if (!isIdentifier(id) || !token || token.length > 512) return transferError;
  const headers = await getAuthHeaders();

  return await sdk.store.order
    .acceptTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch(() => transferError);
};

export const declineTransferRequest = async (id: string, token: string) => {
  if (!isIdentifier(id) || !token || token.length > 512) return transferError;
  const headers = await getAuthHeaders();

  return await sdk.store.order
    .declineTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch(() => transferError);
};
