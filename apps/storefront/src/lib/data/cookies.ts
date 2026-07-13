import "server-only";
import { cookies as nextCookies } from "next/headers";

const ORDER_CONFIRMATION_TTL_SECONDS = 60 * 60;
const ORDER_ID_PATTERN = /^[A-Za-z0-9_:-]{1,128}$/;
const CACHE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    const cookies = await nextCookies();
    const token = cookies.get("_medusa_jwt")?.value;

    if (!token || token.length > 4_096 || !JWT_PATTERN.test(token)) {
      return {};
    }

    return { authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
};

export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    const cookies = await nextCookies();
    const cacheId = cookies.get("_medusa_cache_id")?.value;

    if (!cacheId || !CACHE_ID_PATTERN.test(cacheId)) {
      return "";
    }

    return `${tag}-${cacheId}`;
  } catch {
    return "";
  }
};

export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[] } | Record<string, never>> => {
  if (typeof window !== "undefined") {
    return {};
  }

  const tags = [tag];
  const cacheTag = await getCacheTag(tag);
  if (cacheTag) tags.push(cacheTag);

  return { tags };
};

export const setAuthToken = async (token: string) => {
  if (token.length > 4_096 || !JWT_PATTERN.test(token)) {
    throw new Error("Invalid authentication token");
  }
  const cookies = await nextCookies();
  cookies.set("_medusa_jwt", token, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
};

export const removeAuthToken = async () => {
  const cookies = await nextCookies();
  cookies.set("_medusa_jwt", "", {
    path: "/",
    maxAge: -1,
  });
};

export const getCartId = async () => {
  const cookies = await nextCookies();
  const cartId = cookies.get("_medusa_cart_id")?.value;
  return cartId && ORDER_ID_PATTERN.test(cartId) ? cartId : undefined;
};

export const setCartId = async (cartId: string) => {
  if (!ORDER_ID_PATTERN.test(cartId)) {
    throw new Error("Invalid cart ID");
  }
  const cookies = await nextCookies();
  cookies.set("_medusa_cart_id", cartId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
};

export const removeCartId = async () => {
  const cookies = await nextCookies();
  cookies.set("_medusa_cart_id", "", {
    path: "/",
    maxAge: -1,
  });
};

export const getOrderConfirmationId = async () => {
  const cookies = await nextCookies();
  const token = cookies.get("_medusa_order_confirmation")?.value;
  const secret = getOrderAccessSecret();
  if (!token || !secret) return undefined;

  const [orderId, rawExpiresAt, actualSignature, ...extraParts] =
    token.split(".");
  const expiresAt = Number.parseInt(rawExpiresAt ?? "", 10);
  const now = Math.floor(Date.now() / 1000);

  if (
    extraParts.length > 0 ||
    !orderId ||
    !ORDER_ID_PATTERN.test(orderId) ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= now ||
    expiresAt > now + ORDER_CONFIRMATION_TTL_SECONDS ||
    !actualSignature
  ) {
    return undefined;
  }

  const expectedSignature = await signOrderAccessToken(
    `${orderId}.${expiresAt}`,
    secret
  );

  return signaturesMatch(actualSignature, expectedSignature)
    ? orderId
    : undefined;
};

export const assertOrderAccessConfigured = () => {
  requireOrderAccessSecret();
};

export const setOrderConfirmationId = async (orderId: string) => {
  if (!ORDER_ID_PATTERN.test(orderId)) {
    throw new Error("Invalid order confirmation ID");
  }

  const secret = requireOrderAccessSecret();

  const expiresAt =
    Math.floor(Date.now() / 1000) + ORDER_CONFIRMATION_TTL_SECONDS;
  const payload = `${orderId}.${expiresAt}`;
  const signature = await signOrderAccessToken(payload, secret);
  const cookies = await nextCookies();
  cookies.set("_medusa_order_confirmation", `${payload}.${signature}`, {
    path: "/",
    maxAge: ORDER_CONFIRMATION_TTL_SECONDS,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
};

function getOrderAccessSecret() {
  const secret = process.env.ORDER_ACCESS_SECRET;
  return secret && secret.length >= 32 ? secret : undefined;
}

function requireOrderAccessSecret() {
  const secret = getOrderAccessSecret();
  if (!secret) {
    throw new Error("Order confirmation access is unavailable");
  }
  return secret;
}

async function signOrderAccessToken(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function signaturesMatch(actual: string, expected: string) {
  if (actual.length !== expected.length) return false;

  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}
