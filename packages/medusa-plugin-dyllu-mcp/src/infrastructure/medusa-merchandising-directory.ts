import { RemoteQueryFunction } from "@medusajs/framework/types";
import { z } from "@medusajs/framework/zod";

import { MerchandisingDirectory } from "../application/ports";

const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  parent_category_id: z.string().nullable().optional(),
  is_active: z.boolean(),
  is_internal: z.boolean(),
  rank: z.number().int(),
  updated_at: z.coerce.date(),
});

const productSchema = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string(),
  status: z.string(),
  updated_at: z.coerce.date(),
  categories: z.array(z.object({ id: z.string() })).optional(),
});

const categoryFields = [
  "id",
  "name",
  "handle",
  "parent_category_id",
  "is_active",
  "is_internal",
  "rank",
  "updated_at",
];

const productFields = [
  "id",
  "title",
  "handle",
  "status",
  "updated_at",
  "categories.id",
];

export class MedusaMerchandisingDirectory implements MerchandisingDirectory {
  constructor(private readonly query: Pick<RemoteQueryFunction, "graph">) {}

  async listCategories(input: { limit: number; offset: number }) {
    const { data, metadata } = await this.query.graph({
      entity: "product_category",
      fields: categoryFields,
      pagination: {
        take: input.limit,
        skip: input.offset,
        order: { rank: "ASC" },
      },
    });
    return {
      categories: z.array(categorySchema).parse(data).map(toCategory),
      count: z.number().int().nonnegative().parse(metadata?.count),
    };
  }

  async findCategoryById(categoryId: string) {
    const { data } = await this.query.graph({
      entity: "product_category",
      fields: categoryFields,
      filters: { id: categoryId },
      pagination: { take: 1, skip: 0 },
    });
    const parsed = categorySchema.safeParse(data[0]);
    if (!parsed.success) {
      return null;
    }
    return {
      ...toCategory(parsed.data),
      products: [],
      productCount: 0,
    };
  }

  async listCategoryProducts(
    categoryId: string,
    input: { limit: number; offset: number }
  ) {
    const { data, metadata } = await this.query.graph({
      entity: "product",
      fields: productFields,
      filters: { categories: { id: categoryId } },
      pagination: {
        take: input.limit,
        skip: input.offset,
        order: { title: "ASC" },
      },
    });
    return {
      products: z.array(productSchema).parse(data).map(toProduct),
      count: z.number().int().nonnegative().parse(metadata?.count),
    };
  }

  async findProductTargets(productIds: string[], categoryId: string) {
    if (productIds.length === 0) {
      return [];
    }
    const { data } = await this.query.graph({
      entity: "product",
      fields: productFields,
      filters: { id: productIds },
      pagination: {
        take: productIds.length,
        skip: 0,
        order: { id: "ASC" },
      },
    });
    return z
      .array(productSchema)
      .parse(data)
      .map((product) => ({
        productId: product.id,
        productTitle: product.title,
        productHandle: product.handle,
        productStatus: product.status,
        productUpdatedAt: product.updated_at,
        assigned: (product.categories ?? []).some(
          (category) => category.id === categoryId
        ),
      }));
  }
}

function toCategory(category: z.infer<typeof categorySchema>) {
  return {
    id: category.id,
    name: category.name,
    handle: category.handle,
    parentCategoryId: category.parent_category_id ?? null,
    isActive: category.is_active,
    isInternal: category.is_internal,
    rank: category.rank,
    updatedAt: category.updated_at,
  };
}

function toProduct(product: z.infer<typeof productSchema>) {
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    status: product.status,
    updatedAt: product.updated_at,
  };
}
