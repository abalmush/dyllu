import type { MetadataRoute } from "next";

import { getCategoryTree, type CategoryNode } from "@lib/data/categories";
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

const flattenCategories = (categories: CategoryNode[]): CategoryNode[] =>
  categories.flatMap((category) => [
    category,
    ...flattenCategories(category.children),
  ]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseURL();

  const [categoryTree, collections, productsResponse] = await Promise.all([
    getCategoryTree().catch(() => []),
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

  const categoryEntries = flattenCategories(categoryTree)
    .filter((category) => category.handle)
    .map((category) => ({
      url: `${baseUrl}/categories/${category.handle}`,
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
