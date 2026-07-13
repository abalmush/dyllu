"use server";

import { sdk } from "@lib/config";
import { revalidateTag as nextRevalidateTag } from "next/cache";
import { cookies as nextCookies } from "next/headers";
import { getAuthHeaders, getCacheTag, getCartId } from "./cookies";

const LOCALE_COOKIE_NAME = "_medusa_locale";
const LOCALE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

const revalidateTag = (tag: string) => nextRevalidateTag(tag, "max");

export const getLocale = async (): Promise<string | null> => {
  try {
    const cookies = await nextCookies();
    const locale = cookies.get(LOCALE_COOKIE_NAME)?.value;
    return locale && locale.length <= 35 && LOCALE_PATTERN.test(locale)
      ? locale
      : null;
  } catch {
    return null;
  }
};

export const setLocaleCookie = async (locale: string) => {
  if (locale.length > 35 || !LOCALE_PATTERN.test(locale)) {
    throw new Error("Invalid locale");
  }
  const cookies = await nextCookies();
  cookies.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
};

export const updateLocale = async (localeCode: string): Promise<string> => {
  await setLocaleCookie(localeCode);

  const cartId = await getCartId();
  if (cartId) {
    const headers = {
      ...(await getAuthHeaders()),
    };

    await sdk.store.cart.update(cartId, { locale: localeCode }, {}, headers);

    const cartCacheTag = await getCacheTag("carts");
    if (cartCacheTag) {
      revalidateTag(cartCacheTag);
    }
  }

  const productsCacheTag = await getCacheTag("products");
  if (productsCacheTag) {
    revalidateTag(productsCacheTag);
  }

  const categoriesCacheTag = await getCacheTag("categories");
  if (categoriesCacheTag) {
    revalidateTag(categoriesCacheTag);
  }

  const collectionsCacheTag = await getCacheTag("collections");
  if (collectionsCacheTag) {
    revalidateTag(collectionsCacheTag);
  }

  return localeCode;
};
