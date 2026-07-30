import { RemoteQueryFunction } from "@medusajs/framework/types";
import { z } from "@medusajs/framework/zod";

import {
  ProductCatalog,
  ProductSearch,
  UserDirectory,
} from "../application/ports";

const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
});

const productSchema = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string(),
  status: z.string(),
  description: z.string().nullable(),
  updated_at: z.coerce.date(),
  variants: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        sku: z.string().nullable(),
        updated_at: z.coerce.date(),
        price_set: z
          .object({
            prices: z
              .array(
                z.object({
                  id: z.string(),
                  amount: z.number(),
                  currency_code: z.string(),
                  min_quantity: z.number().nullable().optional(),
                  max_quantity: z.number().nullable().optional(),
                  updated_at: z.coerce.date(),
                  rules: z.array(z.unknown()).optional(),
                })
              )
              .optional(),
          })
          .nullable()
          .optional(),
      })
    )
    .optional(),
});

export class MedusaUserDirectory implements UserDirectory {
  constructor(private readonly query: Pick<RemoteQueryFunction, "graph">) {}

  async findActiveUser(userId: string) {
    const { data } = await this.query.graph({
      entity: "user",
      fields: ["id", "email", "first_name", "last_name"],
      filters: { id: userId },
      pagination: { take: 1, skip: 0 },
    });
    const parsed = userSchema.safeParse(data[0]);
    if (!parsed.success) {
      return null;
    }

    const name = [parsed.data.first_name, parsed.data.last_name]
      .filter((part): part is string => Boolean(part))
      .join(" ");
    return {
      id: parsed.data.id,
      email: parsed.data.email,
      name: name || parsed.data.email,
    };
  }
}

export class MedusaProductCatalog implements ProductCatalog {
  constructor(private readonly query: Pick<RemoteQueryFunction, "graph">) {}

  async findById(productId: string) {
    const { data } = await this.query.graph({
      entity: "product",
      fields: productFields,
      filters: { id: productId },
      pagination: { take: 1, skip: 0 },
    });
    const parsed = productSchema.safeParse(data[0]);
    return parsed.success ? this.toProduct(parsed.data) : null;
  }

  async findVariantPrice(
    input: Parameters<ProductCatalog["findVariantPrice"]>[0]
  ) {
    const product = await this.findById(input.productId);
    const variant = product?.variants.find(
      (candidate) => candidate.id === input.variantId
    );
    const price = variant?.prices.find(
      (candidate) =>
        candidate.id === input.priceId &&
        candidate.currencyCode === input.currencyCode
    );
    if (!product || !variant || !price) {
      return null;
    }
    return {
      productId: product.id,
      productTitle: product.title,
      variantId: variant.id,
      variantTitle: variant.title,
      sku: variant.sku,
      priceId: price.id,
      amount: price.amount,
      currencyCode: price.currencyCode,
      updatedAt: price.updatedAt,
    };
  }

  async search(input: ProductSearch) {
    const { data } = await this.query.graph({
      entity: "product",
      fields: productFields,
      filters: { q: input.query },
      pagination: {
        take: input.limit,
        skip: 0,
        order: { updated_at: "DESC" },
      },
    });
    return z
      .array(productSchema)
      .parse(data)
      .map((product) => this.toProduct(product));
  }

  private toProduct(product: z.infer<typeof productSchema>) {
    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      status: product.status,
      description: product.description,
      updatedAt: product.updated_at,
      variants: (product.variants ?? []).map((variant) => ({
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        updatedAt: variant.updated_at,
        prices: (variant.price_set?.prices ?? [])
          .filter(
            (price) =>
              price.min_quantity == null &&
              price.max_quantity == null &&
              (price.rules?.length ?? 0) === 0
          )
          .map((price) => ({
            id: price.id,
            amount: price.amount,
            currencyCode: price.currency_code.toLowerCase(),
            updatedAt: price.updated_at,
          })),
      })),
    };
  }
}

const productFields = [
  "id",
  "title",
  "handle",
  "status",
  "description",
  "updated_at",
  "variants.id",
  "variants.title",
  "variants.sku",
  "variants.updated_at",
  "variants.price_set.prices.id",
  "variants.price_set.prices.amount",
  "variants.price_set.prices.currency_code",
  "variants.price_set.prices.min_quantity",
  "variants.price_set.prices.max_quantity",
  "variants.price_set.prices.updated_at",
  "variants.price_set.prices.rules.*",
];
