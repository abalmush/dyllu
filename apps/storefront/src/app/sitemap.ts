import type { MetadataRoute } from "next";

import { listCategories } from "@lib/data/categories";
import { listCollections } from "@lib/data/collections";
import { listProducts } from "@lib/data/products";
import { getBaseURL } from "@lib/util/env";

const STATIC_ROUTES = [
  "/",
  "/store",
  "/contact",
  "/livrare",
  "/returnari",
  "/termeni",
  "/confidentialitate",
  "/branduri",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseURL();

  const [categories, collections, productsResponse] = await Promise.all([
    listCategories().catch(() => []),
    listCollections({
      fields: "handle,updated_at,created_at",
      limit: "200",
    }).catch(() => ({ collections: [] })),
    listProducts({
      queryParams: {
        limit: 500,
        fields: "handle,updated_at,created_at",
      },
    }).catch(() => ({ response: { products: [], count: 0 }, nextPage: null })),
  ]);

  const staticEntries = STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  })) satisfies MetadataRoute.Sitemap;

  const categoryEntries = categories
    .filter((category) => category.handle)
    .map((category) => ({
      url: `${baseUrl}/categories/${category.handle}`,
      lastModified: category.updated_at ?? category.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const collectionEntries = collections.collections
    .filter((collection) => collection.handle)
    .map((collection) => ({
      url: `${baseUrl}/collections/${collection.handle}`,
      lastModified: collection.updated_at ?? collection.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  const productEntries = productsResponse.response.products
    .filter((product) => product.handle)
    .map((product) => ({
      url: `${baseUrl}/products/${product.handle}`,
      lastModified: product.updated_at ?? product.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }));

  return [
    ...staticEntries,
    ...categoryEntries,
    ...collectionEntries,
    ...productEntries,
  ];
}
