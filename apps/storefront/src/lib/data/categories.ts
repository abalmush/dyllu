import { sdk } from "@lib/config";
import { HttpTypes } from "@medusajs/types";
import { getCacheOptions } from "./cookies";

export type CategoryNode = {
  id: string;
  name: string;
  handle: string;
  children: CategoryNode[];
};

export const listCategories = async (query?: Record<string, any>) => {
  const next = {
    ...(await getCacheOptions("categories")),
  };

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
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories);
};

const toNode = (category: HttpTypes.StoreProductCategory): CategoryNode => {
  const children = [...(category.category_children ?? [])].sort(
    (a, b) => (a.rank ?? 0) - (b.rank ?? 0)
  );
  return {
    id: category.id,
    name: category.name,
    handle: category.handle,
    children: children.map(toNode),
  };
};

export const getCategoryTree = async (): Promise<CategoryNode[]> => {
  const next = {
    ...(await getCacheOptions("categories")),
  };

  const { product_categories } = await sdk.client.fetch<{
    product_categories: HttpTypes.StoreProductCategory[];
  }>("/store/product-categories", {
    query: {
      fields: "id,name,handle,rank,*category_children",
      parent_category_id: "null",
      include_descendants_tree: true,
      limit: 200,
    },
    next,
    cache: "force-cache",
  });

  return [...product_categories]
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .map(toNode);
};

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join("/")}`;

  const next = {
    ...(await getCacheOptions("categories")),
  };

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: "*category_children, *products",
          handle,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories[0]);
};
