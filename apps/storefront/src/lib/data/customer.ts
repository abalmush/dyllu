"use server";

import { sdk } from "@lib/config";
import medusaError from "@lib/util/medusa-error";
import { HttpTypes } from "@medusajs/types";
import { revalidateTag as nextRevalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  getAuthHeaders,
  getCacheTag,
  getCartId,
  removeAuthToken,
  removeCartId,
  setAuthToken,
} from "./cookies";

const revalidateTag = (tag: string) => nextRevalidateTag(tag, "max");
type AddressActionResult = Record<string, unknown> & {
  success: boolean;
  error: string | null;
};

function boundedString(
  value: unknown,
  label: string,
  { required = false, max = 200 }: { required?: boolean; max?: number } = {}
) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (required && !normalized) throw new Error(`${label} is required`);
  if (normalized.length > max) throw new Error(`${label} is too long`);
  return normalized;
}

function formString(
  formData: FormData,
  key: string,
  options?: { required?: boolean; max?: number }
) {
  return boundedString(formData.get(key), key, options);
}

function assertIdentifier(value: string, label: string) {
  if (!/^[A-Za-z0-9_:-]{1,128}$/.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
}

function customerAddressFromForm(formData: FormData) {
  const countryCode = formString(formData, "country_code", {
    required: true,
    max: 2,
  }).toLowerCase();
  if (!/^[a-z]{2}$/.test(countryCode)) {
    throw new Error("country_code is invalid");
  }

  return {
    first_name: formString(formData, "first_name", {
      required: true,
      max: 100,
    }),
    last_name: formString(formData, "last_name", { required: true, max: 100 }),
    company: formString(formData, "company", { max: 200 }),
    address_1: formString(formData, "address_1", { required: true, max: 200 }),
    address_2: formString(formData, "address_2", { max: 200 }),
    city: formString(formData, "city", { required: true, max: 100 }),
    postal_code: formString(formData, "postal_code", {
      required: true,
      max: 32,
    }),
    province: formString(formData, "province", { max: 100 }),
    country_code: countryCode,
    phone: formString(formData, "phone", { max: 40 }),
  };
}

async function requireCustomerAuth() {
  const headers = await getAuthHeaders();
  if (!("authorization" in headers)) {
    throw new Error("Authentication required");
  }
  return headers;
}

async function revalidateCustomerScope(tag: string) {
  const cacheTag = await getCacheTag(tag);
  if (cacheTag) revalidateTag(cacheTag);
}

export const retrieveCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders();

    if (!("authorization" in authHeaders)) return null;

    const headers = {
      ...authHeaders,
    };

    return await sdk.client
      .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
        method: "GET",
        query: {
          fields: "*orders",
        },
        headers,
        cache: "no-store",
      })
      .then(({ customer }) => customer)
      .catch((error: unknown) => {
        const status =
          typeof error === "object" && error && "status" in error
            ? error.status
            : undefined;
        if (status === 401 || status === 404) return null;
        throw error;
      });
  };

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = await requireCustomerAuth();
  const update: HttpTypes.StoreUpdateCustomer = {};
  if (body.first_name !== undefined) {
    update.first_name = boundedString(body.first_name, "first_name", {
      required: true,
      max: 100,
    });
  }
  if (body.last_name !== undefined) {
    update.last_name = boundedString(body.last_name, "last_name", {
      required: true,
      max: 100,
    });
  }
  if (body.phone !== undefined) {
    update.phone = boundedString(body.phone, "phone", { max: 40 });
  }
  if (body.company_name !== undefined) {
    update.company_name = boundedString(body.company_name, "company_name", {
      max: 200,
    });
  }
  if (Object.keys(update).length === 0) {
    throw new Error("No supported customer fields provided");
  }

  const updateRes = await sdk.store.customer
    .update(update, {}, headers)
    .then(({ customer }) => customer)
    .catch(medusaError);

  await revalidateCustomerScope("customers");

  return updateRes;
};

export async function signup(_currentState: unknown, formData: FormData) {
  const password = formString(formData, "password", {
    required: true,
    max: 128,
  });
  if (password.length < 8) {
    return "Parola trebuie să aibă cel puțin 8 caractere.";
  }
  const email = formString(formData, "email", {
    required: true,
    max: 254,
  }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Adresa de email nu este validă.";
  }
  const customerForm = {
    email,
    first_name: formString(formData, "first_name", {
      required: true,
      max: 100,
    }),
    last_name: formString(formData, "last_name", {
      required: true,
      max: 100,
    }),
    phone: formString(formData, "phone", { max: 40 }),
  };

  try {
    const token = await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password: password,
    });

    await setAuthToken(token as string);

    const headers = {
      ...(await getAuthHeaders()),
    };

    await sdk.store.customer.create(customerForm, {}, headers);

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: customerForm.email,
      password,
    });

    await setAuthToken(loginToken as string);

    await revalidateCustomerScope("customers");

    await transferCart();
  } catch (error: unknown) {
    console.error("Customer registration failed", error);
    return "Contul nu a putut fi creat. Verifică datele și încearcă din nou.";
  }

  redirect("/account");
}

export async function login(_currentState: unknown, formData: FormData) {
  const email = formString(formData, "email", {
    required: true,
    max: 254,
  }).toLowerCase();
  const password = formString(formData, "password", {
    required: true,
    max: 128,
  });

  try {
    await sdk.auth
      .login("customer", "emailpass", { email, password })
      .then(async (token) => {
        await setAuthToken(token as string);
        await revalidateCustomerScope("customers");
      });
  } catch {
    return "Email sau parolă incorectă.";
  }

  try {
    await transferCart();
  } catch (error: unknown) {
    console.error("Cart transfer after login failed", error);
    return "Autentificarea a reușit, dar coșul nu a putut fi transferat.";
  }
}

export async function signout() {
  await sdk.auth.logout();

  await removeAuthToken();

  await revalidateCustomerScope("customers");

  await removeCartId();

  await revalidateCustomerScope("carts");

  redirect("/account");
}

export async function transferCart() {
  const cartId = await getCartId();

  if (!cartId) {
    return;
  }

  const headers = await requireCustomerAuth();

  await sdk.store.cart.transferCart(cartId, {}, headers);

  await revalidateCustomerScope("carts");
}

export const addCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<AddressActionResult> => {
  const isDefaultBilling = (currentState.isDefaultBilling as boolean) || false;
  const isDefaultShipping =
    (currentState.isDefaultShipping as boolean) || false;

  const address = {
    ...customerAddressFromForm(formData),
    is_default_billing: isDefaultBilling,
    is_default_shipping: isDefaultShipping,
  };

  const headers = await requireCustomerAuth();

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(async () => {
      await revalidateCustomerScope("customers");
      return { success: true, error: null };
    })
    .catch(() => {
      return {
        ...currentState,
        success: false,
        error: "Adresa nu a putut fi salvată.",
      };
    });
};

export const deleteCustomerAddress = async (
  addressId: string
): Promise<AddressActionResult> => {
  assertIdentifier(addressId, "address ID");
  const headers = await requireCustomerAuth();

  return sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(async () => {
      await revalidateCustomerScope("customers");
      return { success: true, error: null };
    })
    .catch(() => {
      return { success: false, error: "Adresa nu a putut fi ștearsă." };
    });
};

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<AddressActionResult> => {
  const addressId =
    (currentState.addressId as string) || (formData.get("addressId") as string);

  if (!addressId) {
    return {
      ...currentState,
      success: false,
      error: "Address ID is required",
    };
  }

  assertIdentifier(addressId, "address ID");
  const address: HttpTypes.StoreUpdateCustomerAddress =
    customerAddressFromForm(formData);
  const headers = await requireCustomerAuth();

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(async () => {
      await revalidateCustomerScope("customers");
      return { ...currentState, success: true, error: null };
    })
    .catch(() => {
      return {
        ...currentState,
        success: false,
        error: "Adresa nu a putut fi actualizată.",
      };
    });
};
