import { ExecArgs, RemoteQueryFunction } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  updateProductCategoriesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";

import { revalidateStorefront } from "../_revalidate";

type ProductRow = {
  id: string;
  title: string;
  categories: Array<{ id: string }>;
};

type ManagedCategoryConfig = {
  handle: string;
  name: string;
  description: string;
  confirmation: string;
  logPrefix: string;
  matches: (title: string) => boolean;
};

export async function syncManagedProductCategory(
  { container, args }: ExecArgs,
  config: ManagedCategoryConfig
) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Omit<
    RemoteQueryFunction,
    symbol
  >;
  const confirmed = (args ?? [])
    .map((arg) => arg.replace(/^--/, ""))
    .includes(`confirm=${config.confirmation}`);

  const [{ data: categories }, { data: productData }] = await Promise.all([
    query.graph({
      entity: "product_category",
      fields: ["id", "handle", "name", "metadata"],
      filters: { handle: config.handle },
    }),
    query.graph({
      entity: "product",
      fields: ["id", "title", "categories.id"],
      pagination: { skip: 0, take: 5000 },
    }),
  ]);
  const products = productData as ProductRow[];
  const targets = products.filter((product) => config.matches(product.title));
  const existingCategory = categories[0] as { id: string } | undefined;
  const stale = existingCategory
    ? products.filter(
        (product) =>
          product.categories.some(
            (category) => category.id === existingCategory.id
          ) && !config.matches(product.title)
      )
    : [];
  logger.info(
    `[${config.logPrefix}] ${targets.length} tools; ${stale.length} stale members`
  );
  if (!confirmed) {
    logger.info(
      `[${config.logPrefix}] DRY RUN — pass confirm=${config.confirmation} to apply`
    );
    return;
  }

  let categoryId = existingCategory?.id;
  const categoryData = {
    name: config.name,
    handle: config.handle,
    is_active: true,
    is_internal: false,
    metadata: {
      description: config.description,
      navigation_hidden: true,
      managed_by: "catalog-sync",
    },
  };
  if (!categoryId) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: [categoryData] },
    });
    categoryId = result[0]?.id;
    if (!categoryId) {
      throw new Error(`[${config.logPrefix}] category creation failed`);
    }
  } else {
    await updateProductCategoriesWorkflow(container).run({
      input: {
        selector: { id: categoryId },
        update: categoryData,
      },
    });
  }

  const updates = [
    ...targets
      .filter(
        (product) =>
          !product.categories.some((category) => category.id === categoryId)
      )
      .map((product) => ({
        id: product.id,
        category_ids: [
          ...product.categories.map((category) => category.id),
          categoryId,
        ],
      })),
    ...stale.map((product) => ({
      id: product.id,
      category_ids: product.categories
        .filter((category) => category.id !== categoryId)
        .map((category) => category.id),
    })),
  ];
  for (let index = 0; index < updates.length; index += 50) {
    await updateProductsWorkflow(container).run({
      input: { products: updates.slice(index, index + 50) },
    });
  }
  logger.info(
    `[${config.logPrefix}] category ${config.handle} synchronized with ${targets.length} products`
  );
  await revalidateStorefront(logger);
}
