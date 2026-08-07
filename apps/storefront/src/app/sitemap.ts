import type { MetadataRoute } from "next";

import { getCategoryTree, type CategoryNode } from "@lib/data/categories";
import { listCollections } from "@lib/data/collections";
import { listProducts } from "@lib/data/products";
import { getBaseURL } from "@lib/util/env";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

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

async function alternatesFor(href: string) {
  const languages = Object.fromEntries(
    await Promise.all(
      routing.locales.map(async (locale) => [
        locale,
        getBaseURL() + (await getPathname({ locale, href })),
      ])
    )
  );
  return { languages };
}

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

  const staticEntries = await Promise.all(
    STATIC_ROUTES.map(async (route) => ({
      url: `${baseUrl}${route}`,
      changeFrequency: route === "/" ? ("daily" as const) : ("weekly" as const),
      priority: route === "/" ? 1 : 0.7,
      alternates: await alternatesFor(route),
    }))
  );

  const categoryEntries = await Promise.all(
    flattenCategories(categoryTree)
      .filter((category) => category.handle)
      .map(async (category) => ({
        url: `${baseUrl}/categories/${category.handle}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
        alternates: await alternatesFor(`/categories/${category.handle}`),
      }))
  );

  const collectionEntries = await Promise.all(
    collections.collections
      .filter((collection) => collection.handle)
      .map(async (collection) => ({
        url: `${baseUrl}/collections/${collection.handle}`,
        lastModified: collection.updated_at ?? collection.created_at,
        changeFrequency: "weekly" as const,
        priority: 0.7,
        alternates: await alternatesFor(`/collections/${collection.handle}`),
      }))
  );

  const productEntries = await Promise.all(
    productsResponse.response.products
      .filter((product) => product.handle)
      .map(async (product) => ({
        url: `${baseUrl}/products/${product.handle}`,
        lastModified: product.updated_at ?? product.created_at,
        changeFrequency: "weekly" as const,
        priority: 0.9,
        alternates: await alternatesFor(`/products/${product.handle}`),
      }))
  );

  return [
    ...staticEntries,
    ...categoryEntries,
    ...collectionEntries,
    ...productEntries,
  ];
}
