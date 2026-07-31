import "server-only";

import { cache } from "react";
import { sdk } from "@lib/config";
import { getCacheOptions } from "@lib/data/cookies";
import { listNavigationProducts } from "@lib/data/navigation-products";
import { HttpTypes } from "@medusajs/types";

const CATEGORY_TREE_REVALIDATE_SECONDS = 300;

export type CategoryNode = {
  id: string;
  name: string;
  handle: string;
  navThumbnailUrl?: string;
  children: CategoryNode[];
};

const REPRESENTATIVE_PRODUCT_SKUS: Record<string, string> = {
  "accesorii-si-consumabile": "DTHD6B06",
  "accesorii-si-consumabile-pentru-scule": "DTHD6B06",
  "atelier-depozitare-si-manipulare": "DTCS5A05",
  "capsatoare-si-nituitoare-manuale": "DTGU3614",
  "capsatoare-si-pistoale-de-cuie": "DTBJ1308",
  "casa-si-gospodarie": "DVCW1001",
  "chei-si-surubelnite-cu-impact": "DTCD1B1285",
  "compresoare-si-pneumatice": "DTAP4A13",
  "constructii-si-finisaje": "DTCM2A160",
  "fixare-si-capsare": "DTBJ1308",
  "gaurire-si-insurubare-scule-electrice": "DTCDP7281",
  "masini-de-gaurit-si-insurubat": "DTCDP7281",
  "masurare-si-trasare": "DTMT4340",
  "truse-si-seturi": "DTHS3B85",
  "truse-si-seturi-de-scule": "DTHS3B85",
};

export const listCategories = async (query?: Record<string, any>) => {
  const limit = query?.limit || 100;

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        query: {
          fields:
            "*category_children, *products, *parent_category, *parent_category.parent_category",
          limit,
          ...query,
        },
        cache: "no-store",
      }
    )
    .then(({ product_categories }) => product_categories);
};

const toVisibleNode = (
  category: HttpTypes.StoreProductCategory,
  visibleCategoryIds: Set<string>,
  representativeImages: Map<string, string>,
  pinnedImages: Map<string, string>
): CategoryNode | null => {
  if (category.metadata?.navigation_hidden === true) return null;

  const children = [...(category.category_children ?? [])]
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .flatMap((child) => {
      const node = toVisibleNode(
        child,
        visibleCategoryIds,
        representativeImages,
        pinnedImages
      );
      return node ? [node] : [];
    });

  if (!visibleCategoryIds.has(category.id) && children.length === 0) {
    return null;
  }

  const navThumbnailUrl = category.metadata?.nav_thumbnail_url;
  const representativeImage =
    pinnedImages.get(category.handle) ??
    representativeImages.get(category.id) ??
    children.find((child) => child.navThumbnailUrl)?.navThumbnailUrl;
  const configuredImage =
    typeof navThumbnailUrl === "string" ? navThumbnailUrl : undefined;

  return {
    id: category.id,
    name: category.name,
    handle: category.handle,
    navThumbnailUrl: configuredImage ?? representativeImage,
    children,
  };
};

export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  const categoryCacheOptions = await getCacheOptions("categories");

  const [{ product_categories }, products] = await Promise.all([
    sdk.client.fetch<{
      product_categories: HttpTypes.StoreProductCategory[];
    }>("/store/product-categories", {
      query: {
        fields:
          "id,name,handle,rank,metadata,*category_children,category_children.metadata",
        parent_category_id: "null",
        include_descendants_tree: true,
        limit: 200,
      },
      headers: { "x-medusa-locale": "ro" },
      cache: "force-cache",
      next: {
        ...categoryCacheOptions,
        revalidate: CATEGORY_TREE_REVALIDATE_SECONDS,
      },
    }),
    listNavigationProducts(),
  ]);

  const visibleCategoryIds = new Set(
    products.flatMap(
      (product) => product.categories?.map((category) => category.id) ?? []
    )
  );
  const representativeImages = new Map<string, string>();
  const pinnedImages = new Map<string, string>();
  for (const product of products) {
    if (!product.thumbnail) continue;
    const productSkus = new Set(
      product.variants?.flatMap((variant) =>
        variant.sku ? [variant.sku.toUpperCase()] : []
      ) ?? []
    );
    for (const [handle, sku] of Object.entries(REPRESENTATIVE_PRODUCT_SKUS)) {
      if (productSkus.has(sku)) pinnedImages.set(handle, product.thumbnail);
    }
    for (const category of product.categories ?? []) {
      if (!representativeImages.has(category.id)) {
        representativeImages.set(category.id, product.thumbnail);
      }
    }
  }

  return [...product_categories]
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .flatMap((category) => {
      const node = toVisibleNode(
        category,
        visibleCategoryIds,
        representativeImages,
        pinnedImages
      );
      return node ? [node] : [];
    });
});

export const findCategoryInTree = (
  categories: CategoryNode[],
  handle: string
): CategoryNode | undefined => {
  for (const category of categories) {
    if (category.handle === handle) return category;

    const match = findCategoryInTree(category.children, handle);
    if (match) return match;
  }

  return undefined;
};

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join("/")}`;

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: "*category_children",
          handle,
        },
        cache: "no-store",
      }
    )
    .then(({ product_categories }) => product_categories[0]);
};
