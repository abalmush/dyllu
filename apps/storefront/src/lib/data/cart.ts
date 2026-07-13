"use server";

import { sdk } from "@lib/config";
import medusaError from "@lib/util/medusa-error";
import { HttpTypes } from "@medusajs/types";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  assertOrderAccessConfigured,
  getAuthHeaders,
  getCacheTag,
  getCartId,
  removeCartId,
  setCartId,
  setOrderConfirmationId,
} from "./cookies";
import { getRegion } from "./regions";
import { getLocale } from "@lib/data/locale-actions";

async function updateTaggedCache(...tags: string[]) {
  const nextTags = new Set<string>();

  for (const tag of tags) {
    if (!tag) {
      continue;
    }

    const scopedTag = await getCacheTag(tag);
    if (scopedTag) {
      nextTags.add(scopedTag);
    }
  }

  for (const tag of nextTags) {
    updateTag(tag);
  }
}

async function syncCartStorefront(...tags: string[]) {
  await updateTaggedCache("carts", ...tags);
  refresh();
}

function assertIdentifier(value: string, label: string) {
  if (!/^[A-Za-z0-9_:-]{1,128}$/.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
}

function assertQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    throw new Error("Quantity must be an integer between 1 and 100");
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "A apărut o eroare neașteptată";
}

function errorStatus(error: unknown) {
  return typeof error === "object" && error && "status" in error
    ? error.status
    : undefined;
}

function formString(
  formData: FormData,
  key: string,
  options: { required?: boolean; max?: number } = {}
) {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? raw.trim() : "";
  const max = options.max ?? 200;

  if (options.required && !value) {
    throw new Error(`${key} is required`);
  }
  if (value.length > max) {
    throw new Error(`${key} is too long`);
  }

  return value;
}

function addressFromForm(formData: FormData, prefix: "shipping" | "billing") {
  const countryCode = formString(formData, `${prefix}_address.country_code`, {
    required: true,
    max: 2,
  }).toLowerCase();
  if (!/^[a-z]{2}$/.test(countryCode)) {
    throw new Error(`${prefix}_address.country_code is invalid`);
  }

  return {
    first_name: formString(formData, `${prefix}_address.first_name`, {
      required: true,
      max: 100,
    }),
    last_name: formString(formData, `${prefix}_address.last_name`, {
      required: true,
      max: 100,
    }),
    address_1: formString(formData, `${prefix}_address.address_1`, {
      required: true,
      max: 200,
    }),
    address_2: "",
    company: formString(formData, `${prefix}_address.company`, { max: 200 }),
    postal_code: formString(formData, `${prefix}_address.postal_code`, {
      required: true,
      max: 32,
    }),
    city: formString(formData, `${prefix}_address.city`, {
      required: true,
      max: 100,
    }),
    country_code: countryCode,
    province: formString(formData, `${prefix}_address.province`, { max: 100 }),
    phone: formString(formData, `${prefix}_address.phone`, { max: 40 }),
  };
}

async function retrieveCartByCookie(fields?: string) {
  const id = await getCartId();
  fields ??=
    "*items, *region, *items.product, *items.variant, *items.thumbnail, *items.metadata, +items.total, *promotions, +shipping_methods.name";

  if (!id) {
    return null;
  }

  const headers = {
    ...(await getAuthHeaders()),
  };

  return await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "GET",
      query: {
        fields,
      },
      headers,
      cache: "no-store",
    })
    .then(({ cart }: { cart: HttpTypes.StoreCart }) => cart)
    .catch((error: unknown) => {
      if (errorStatus(error) === 404) return null;
      throw error;
    });
}

export async function retrieveCart() {
  return retrieveCartByCookie();
}

async function getOrSetCart() {
  const region = await getRegion();

  if (!region) {
    throw new Error("No region configured for the store");
  }

  let cart = await retrieveCartByCookie("id,region_id");

  const headers = {
    ...(await getAuthHeaders()),
  };

  if (!cart) {
    const locale = await getLocale();
    const cartResp = await sdk.store.cart.create(
      { region_id: region.id, locale: locale || undefined },
      {},
      headers
    );
    cart = cartResp.cart;

    await setCartId(cart.id);
    await updateTaggedCache("carts");
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(cart.id, { region_id: region.id }, {}, headers);
    await updateTaggedCache("carts");
  }

  return cart;
}

async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartId();

  if (!cartId) {
    throw new Error(
      "No existing cart found, please create one before updating"
    );
  }

  const headers = {
    ...(await getAuthHeaders()),
  };

  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(async ({ cart }: { cart: HttpTypes.StoreCart }) => {
      await syncCartStorefront("fulfillment", "shippingOptions");
      return cart;
    })
    .catch(medusaError);
}

export async function addToCart({
  variantId,
  quantity,
}: {
  variantId: string;
  quantity: number;
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart");
  }
  assertIdentifier(variantId, "variant ID");
  assertQuantity(quantity);

  const cart = await getOrSetCart();

  if (!cart) {
    throw new Error("Error retrieving or creating cart");
  }

  const headers = {
    ...(await getAuthHeaders()),
  };

  await sdk.store.cart
    .createLineItem(
      cart.id,
      {
        variant_id: variantId,
        quantity,
      },
      {},
      headers
    )
    .then(async () => {
      await syncCartStorefront("fulfillment", "shippingOptions");
    })
    .catch(medusaError);
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string;
  quantity: number;
}) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when updating line item");
  }
  assertIdentifier(lineId, "line item ID");
  assertQuantity(quantity);

  const cartId = await getCartId();

  if (!cartId) {
    throw new Error("Missing cart ID when updating line item");
  }

  const headers = {
    ...(await getAuthHeaders()),
  };

  await sdk.store.cart
    .updateLineItem(cartId, lineId, { quantity }, {}, headers)
    .then(async () => {
      await syncCartStorefront("fulfillment", "shippingOptions");
    })
    .catch(medusaError);
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when deleting line item");
  }
  assertIdentifier(lineId, "line item ID");

  const cartId = await getCartId();

  if (!cartId) {
    throw new Error("Missing cart ID when deleting line item");
  }

  const headers = {
    ...(await getAuthHeaders()),
  };

  await sdk.store.cart
    .deleteLineItem(cartId, lineId, {}, headers)
    .then(async () => {
      await syncCartStorefront("fulfillment", "shippingOptions");
    })
    .catch(medusaError);
}

export async function setShippingMethod(shippingMethodId: string) {
  assertIdentifier(shippingMethodId, "shipping method ID");
  const cartId = await getCartId();
  if (!cartId) {
    throw new Error("No existing cart found");
  }

  const headers = {
    ...(await getAuthHeaders()),
  };

  const { shipping_options: shippingOptions } = await sdk.client.fetch<{
    shipping_options: HttpTypes.StoreCartShippingOption[];
  }>("/store/shipping-options", {
    query: { cart_id: cartId },
    headers,
    cache: "no-store",
  });
  if (!shippingOptions.some((option) => option.id === shippingMethodId)) {
    throw new Error("Shipping method is not available for this cart");
  }

  return sdk.store.cart
    .addShippingMethod(cartId, { option_id: shippingMethodId }, {}, headers)
    .then(async () => {
      await syncCartStorefront("fulfillment", "shippingOptions");
    })
    .catch(medusaError);
}

export async function initiatePaymentSession(providerId: string) {
  assertIdentifier(providerId, "payment provider ID");
  const cart = await retrieveCartByCookie();
  if (!cart?.region_id) {
    throw new Error("No existing cart found");
  }

  const headers = {
    ...(await getAuthHeaders()),
  };

  const { payment_providers: paymentProviders } =
    await sdk.client.fetch<HttpTypes.StorePaymentProviderListResponse>(
      "/store/payment-providers",
      {
        query: { region_id: cart.region_id },
        headers,
        cache: "no-store",
      }
    );
  if (!paymentProviders.some((provider) => provider.id === providerId)) {
    throw new Error("Payment method is not available for this cart");
  }

  return sdk.store.payment
    .initiatePaymentSession(cart, { provider_id: providerId }, {}, headers)
    .then(async (resp) => {
      await syncCartStorefront();
      return resp;
    })
    .catch(medusaError);
}

export async function applyPromotions(codes: string[]) {
  const cartId = await getCartId();

  if (!cartId) {
    throw new Error("No existing cart found");
  }

  if (!Array.isArray(codes) || codes.length > 10) {
    throw new Error("Invalid promotion codes");
  }
  const normalizedCodes = codes.map((code) => code.trim());
  if (
    normalizedCodes.some(
      (code) => !code || code.length > 64 || !/^[\p{L}\p{N}_-]+$/u.test(code)
    )
  ) {
    throw new Error("Invalid promotion code");
  }

  const headers = {
    ...(await getAuthHeaders()),
  };

  return sdk.store.cart
    .update(cartId, { promo_codes: normalizedCodes }, {}, headers)
    .then(async () => {
      await syncCartStorefront("fulfillment", "shippingOptions");
    })
    .catch(medusaError);
}

export async function submitPromotionForm(
  _currentState: unknown,
  formData: FormData
) {
  const code = formString(formData, "code", { required: true, max: 64 });
  try {
    await applyPromotions([code]);
  } catch (error: unknown) {
    return errorMessage(error);
  }
}

export async function setAddresses(_currentState: unknown, formData: FormData) {
  try {
    if (!formData) {
      throw new Error("No form data found when setting addresses");
    }
    const cartId = await getCartId();
    if (!cartId) {
      throw new Error("No existing cart found when setting addresses");
    }

    const email = formString(formData, "email", { required: true, max: 254 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Email address is invalid");
    }

    const shippingAddress = addressFromForm(formData, "shipping");
    const data: HttpTypes.StoreUpdateCart = {
      shipping_address: shippingAddress,
      email,
    };

    const sameAsBilling = formData.get("same_as_billing");
    if (sameAsBilling === "on") data.billing_address = shippingAddress;

    if (sameAsBilling !== "on") {
      data.billing_address = addressFromForm(formData, "billing");
    }
    await updateCart(data);
  } catch (error: unknown) {
    return errorMessage(error);
  }

  redirect("/checkout?step=delivery");
}

export async function placeOrder() {
  assertOrderAccessConfigured();
  const id = await getCartId();

  if (!id) {
    throw new Error("No existing cart found when placing an order");
  }

  const headers = {
    ...(await getAuthHeaders()),
  };

  const cartRes = await sdk.store.cart
    .complete(id, {}, headers)
    .then(async (cartRes) => {
      await updateTaggedCache("carts");
      return cartRes;
    })
    .catch(medusaError);

  if (cartRes?.type === "order") {
    await updateTaggedCache("orders");

    await setOrderConfirmationId(cartRes.order.id);
    await removeCartId();
    redirect(`/order/${cartRes?.order.id}/confirmed`);
  }

  refresh();
  return cartRes.cart;
}

export async function listCartOptions() {
  const cartId = await getCartId();
  if (!cartId) {
    return { shipping_options: [] };
  }
  const headers = {
    ...(await getAuthHeaders()),
  };

  return await sdk.client.fetch<{
    shipping_options: HttpTypes.StoreCartShippingOption[];
  }>("/store/shipping-options", {
    query: { cart_id: cartId },
    headers,
    cache: "no-store",
  });
}
