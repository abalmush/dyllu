import { createStorefrontApiClient } from "@shopify/storefront-api-client";

const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!;
const storefrontAccessToken =
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN!;

export const storefront = createStorefrontApiClient({
  storeDomain: `https://${domain}`,
  apiVersion: "2025-01",
  publicAccessToken: storefrontAccessToken,
});
