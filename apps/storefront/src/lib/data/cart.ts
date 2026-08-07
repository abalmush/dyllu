"use server";

import { sdk } from "@lib/config";
import medusaError from "@lib/util/medusa-error";
import { HttpTypes } from "@medusajs/types";
import { refresh, updateTag } from "next/cache";
import { getLocale as getUiLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { CartView } from "@lib/cart/cart-view";
import { toCartView } from "@lib/cart/cart-view.mapper";
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
import {
  canonicalizeShippingAddress,
  isShippingOptionAllowedForAddress,
} from "@lib/shipping/delivery-area";
import {
  findPayOnDeliveryProviderId,
  isPayOnDeliveryProvider,
} from "@lib/checkout/payment";
import { hasCheckoutDetails, hasReadyPayOnDelivery } from "@lib/checkout/state";
import { isValidMoldovaPostalCode } from "@lib/checkout/address";
import { findDefaultShippingOptionId } from "@lib/checkout/shipping";
import compareAddresses from "@lib/util/compare-addresses";
import { listCartShippingMethods } from "./fulfillment";

export type CheckoutActionState = {
  error: string | null;
};

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
    throw new Error("Completează toate câmpurile obligatorii.");
  }
  if (value.length > max) {
    throw new Error("Una dintre valorile introduse este prea lungă.");
  }

  return value;
}

function addressFromForm(formData: FormData, prefix: "shipping" | "billing") {
  const countryCode = formString(formData, `${prefix}_address.country_code`, {
    required: true,
    max: 2,
  }).toLowerCase();
  if (!/^[a-z]{2}$/.test(countryCode)) {
    throw new Error("Țara selectată nu este validă.");
  }

  const address = {
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
    address_2: formString(formData, `${prefix}_address.address_2`, {
      max: 200,
    }),
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
    phone: formString(formData, `${prefix}_address.phone`, {
      required: prefix === "shipping",
      max: 40,
    }),
  };

  if (
    address.country_code === "md" &&
    !isValidMoldovaPostalCode(address.postal_code)
  ) {
    throw new Error(
      "Introdu un cod poștal valid din Moldova: 4 cifre, opțional cu prefixul MD-."
    );
  }

  return prefix === "shipping" ? canonicalizeShippingAddress(address) : address;
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

async function assertShippingOptionAvailableForCart({
  cartId,
  shippingOptionId,
  shippingAddress,
  headers,
}: {
  cartId: string;
  shippingOptionId: string;
  shippingAddress?: HttpTypes.StoreCartAddress | null;
  headers: Record<string, string>;
}) {
  const { shipping_options: shippingOptions } = await sdk.client.fetch<{
    shipping_options: HttpTypes.StoreCartShippingOption[];
  }>("/store/shipping-options", {
    query: { cart_id: cartId },
    headers,
    cache: "no-store",
  });
  const selectedOption = shippingOptions.find(
    (option) => option.id === shippingOptionId
  );

  if (
    !selectedOption ||
    !isShippingOptionAllowedForAddress(selectedOption, shippingAddress)
  ) {
    throw new Error(
      "Metoda de livrare selectată nu mai este disponibilă pentru această adresă."
    );
  }
}

export async function retrieveCart() {
  return retrieveCartByCookie();
}

// Cart item CRUD returns CartView instead of calling refresh()/syncCartStorefront
// so a mutation only performs cart-related work, not a full route re-render.
// Medusa's mutation responses aren't guaranteed to carry every field CartView
// needs, so we do one targeted, fully-specified cart read instead of trusting
// the mutation response shape.
async function retrieveCartViewOrThrow(): Promise<CartView> {
  const cart = await retrieveCartByCookie();
  if (!cart) {
    throw new Error("Cart not found after mutation");
  }
  return toCartView(cart);
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
}): Promise<CartView> {
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
    .catch(medusaError);

  return retrieveCartViewOrThrow();
}

export async function addItemsToCart({
  items,
}: {
  items: Array<{ variantId: string; quantity: number }>;
}): Promise<CartView> {
  if (items.length === 0) {
    throw new Error("No items provided when adding to cart");
  }

  for (const item of items) {
    assertIdentifier(item.variantId, "variant ID");
    assertQuantity(item.quantity);
  }

  const cart = await getOrSetCart();

  if (!cart) {
    throw new Error("Error retrieving or creating cart");
  }

  const headers = {
    ...(await getAuthHeaders()),
  };

  for (const item of items) {
    await sdk.store.cart
      .createLineItem(
        cart.id,
        {
          variant_id: item.variantId,
          quantity: item.quantity,
        },
        {},
        headers
      )
      .catch(medusaError);
  }

  return retrieveCartViewOrThrow();
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string;
  quantity: number;
}): Promise<CartView> {
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
    .catch(medusaError);

  return retrieveCartViewOrThrow();
}

export async function deleteLineItem(lineId: string): Promise<CartView> {
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
    .catch(medusaError);

  return retrieveCartViewOrThrow();
}

async function listAvailablePaymentProviders(
  regionId: string,
  headers: Record<string, string>
) {
  return sdk.client
    .fetch<HttpTypes.StorePaymentProviderListResponse>(
      "/store/payment-providers",
      {
        query: { region_id: regionId },
        headers,
        cache: "no-store",
      }
    )
    .then(({ payment_providers: paymentProviders }) => paymentProviders)
    .catch(medusaError);
}

async function initiatePaymentSessionForCart(
  cart: HttpTypes.StoreCart,
  providerId: string,
  headers: Record<string, string>
) {
  return sdk.store.payment
    .initiatePaymentSession(cart, { provider_id: providerId }, {}, headers)
    .catch(medusaError);
}

// Only used by the checkout DiscountCode widget today, which reads
// promotions off the server-rendered cart prop rather than a CartView -
// kept on the refresh() path per the checkout-mutation exception.
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

async function updateCheckoutAddresses(
  formData: FormData,
  currentCart?: HttpTypes.StoreCart
) {
  if (!formData) {
    throw new Error("Nu am primit datele formularului. Încearcă din nou.");
  }

  const email = formString(formData, "email", { required: true, max: 254 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Introdu o adresă de email validă.");
  }

  const shippingAddress = addressFromForm(formData, "shipping");
  const billingAddress =
    formData.get("same_as_billing") === "on"
      ? shippingAddress
      : addressFromForm(formData, "billing");
  const data: HttpTypes.StoreUpdateCart = {
    shipping_address: shippingAddress,
    billing_address: billingAddress,
    email,
  };

  if (
    currentCart &&
    currentCart.email === email &&
    compareAddresses(currentCart.shipping_address, shippingAddress) &&
    compareAddresses(currentCart.billing_address, billingAddress)
  ) {
    return false;
  }

  await updateCart(data);
  return true;
}

async function prepareCartForOrder(formData: FormData) {
  const currentCart = await retrieveCartByCookie();
  if (!currentCart?.items?.length) {
    throw new Error("Coșul este gol. Adaugă produse înainte de finalizare.");
  }

  const addressesChanged = await updateCheckoutAddresses(formData, currentCart);
  const cartWithAddress = addressesChanged
    ? await retrieveCartByCookie()
    : currentCart;
  if (!cartWithAddress?.region_id) {
    throw new Error("Regiunea comenzii nu este disponibilă.");
  }

  const shippingOptions = await listCartShippingMethods(cartWithAddress);
  const shippingOptionId = findDefaultShippingOptionId(shippingOptions);
  if (!shippingOptionId) {
    throw new Error(
      "Livrarea standard nu este disponibilă pentru această adresă. Verifică localitatea și codul poștal."
    );
  }

  const headers = { ...(await getAuthHeaders()) };
  await assertShippingOptionAvailableForCart({
    cartId: cartWithAddress.id,
    shippingOptionId,
    shippingAddress: cartWithAddress.shipping_address,
    headers,
  });

  const selectedShippingOptionId =
    cartWithAddress.shipping_methods?.at(-1)?.shipping_option_id;
  if (selectedShippingOptionId !== shippingOptionId) {
    await sdk.store.cart
      .addShippingMethod(
        cartWithAddress.id,
        { option_id: shippingOptionId },
        {},
        headers
      )
      .catch(medusaError);
    await updateTaggedCache("carts", "fulfillment", "shippingOptions");
  }

  const preparedCart =
    selectedShippingOptionId === shippingOptionId
      ? cartWithAddress
      : await retrieveCartByCookie();
  if (!preparedCart?.region_id || !hasCheckoutDetails(preparedCart)) {
    throw new Error("Datele de livrare nu au putut fi pregătite.");
  }

  if (!hasReadyPayOnDelivery(preparedCart)) {
    const paymentProviders = await listAvailablePaymentProviders(
      preparedCart.region_id,
      headers
    );
    const providerId = findPayOnDeliveryProviderId(paymentProviders);
    if (!providerId || !isPayOnDeliveryProvider(providerId)) {
      throw new Error(
        "Plata la livrare nu este disponibilă momentan. Încearcă din nou sau contactează echipa DYLLU."
      );
    }

    await initiatePaymentSessionForCart(preparedCart, providerId, headers);
    await updateTaggedCache("carts");
  }
}

async function completeCheckoutOrder() {
  assertOrderAccessConfigured();
  const id = await getCartId();

  if (!id) {
    throw new Error("No existing cart found when placing an order");
  }

  const headers = {
    ...(await getAuthHeaders()),
  };

  const cart = await retrieveCartByCookie();
  const shippingOptionId = cart?.shipping_methods?.at(-1)?.shipping_option_id;
  if (!cart?.items?.length) {
    throw new Error("Coșul este gol. Adaugă produse înainte de finalizare.");
  }
  if (!hasCheckoutDetails(cart) || !shippingOptionId) {
    throw new Error(
      "Completează datele de contact, adresa și metoda de livrare."
    );
  }
  if (!hasReadyPayOnDelivery(cart)) {
    throw new Error(
      "Plata la livrare nu este pregătită. Revino la detalii și încearcă din nou."
    );
  }
  await assertShippingOptionAvailableForCart({
    cartId: id,
    shippingOptionId,
    shippingAddress: cart.shipping_address,
    headers,
  });

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
    return cartRes.order.id;
  }

  refresh();
  throw new Error(
    "Comanda nu a putut fi finalizată. Verifică detaliile și încearcă din nou."
  );
}

export async function placeOrder(
  currentState: CheckoutActionState,
  formData: FormData
): Promise<CheckoutActionState> {
  void currentState;

  let orderId: string;
  try {
    assertOrderAccessConfigured();
    await prepareCartForOrder(formData);
    orderId = await completeCheckoutOrder();
  } catch (error: unknown) {
    return { error: errorMessage(error) };
  }

  return redirect({
    href: `/order/${orderId}/confirmed`,
    locale: await getUiLocale(),
  });
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
