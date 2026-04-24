import { ApiType, shopifyApiProject } from "@shopify/api-codegen-preset";

export default {
  schema: "https://shopify.dev/storefront-graphql-direct-proxy",
  documents: ["src/**/*.{ts,tsx}"],
  projects: {
    default: shopifyApiProject({
      apiType: ApiType.Storefront,
      apiVersion: "2025-01",
      outputDir: "./src/types",
    }),
  },
};
