import { z } from "@medusajs/framework/zod";

const MAX_TEXT_LENGTH = 20_000;
const MAX_ITEMS = 100_000;

const priceSchema = z
  .object({
    typeId: z.union([z.string(), z.number()]),
    value: z.union([z.string(), z.number()]),
  })
  .passthrough();

const productSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    name_ro: z.string().max(MAX_TEXT_LENGTH).optional(),
    name: z.string().max(MAX_TEXT_LENGTH).optional(),
    description_ro: z.string().max(MAX_TEXT_LENGTH).optional(),
    description_ru: z.string().max(MAX_TEXT_LENGTH).optional(),
    balance: z.union([z.string(), z.number(), z.null()]).optional(),
    BrandId: z.union([z.string(), z.number(), z.null()]).optional(),
    Prices: z.array(priceSchema).max(100).optional(),
    hidden: z.boolean().optional(),
    deleted: z.boolean().optional(),
  })
  .passthrough();

const feedSchema = z
  .object({
    Items: z.array(z.unknown()).max(MAX_ITEMS),
  })
  .passthrough();

export type NormalizedOneCProduct = {
  externalId: string;
  sku: string;
  name: string;
  description: string;
  regularPriceMdl: number | null;
  balance: number | null;
  brandExternalId: string | null;
  categoryExternalIds: string[];
  hidden: boolean;
  deleted: boolean;
  source: Record<string, unknown>;
};

export type ProductFeedIssue = {
  index: number;
  code: "invalid_product";
  message: string;
};

export function normalizeProductFeed(input: unknown): {
  items: NormalizedOneCProduct[];
  issues: ProductFeedIssue[];
} {
  const feed = feedSchema.parse(input);
  const items: NormalizedOneCProduct[] = [];
  const issues: ProductFeedIssue[] = [];

  feed.Items.forEach((source, index) => {
    const parsed = productSchema.safeParse(source);
    if (!parsed.success) {
      issues.push({
        index,
        code: "invalid_product",
        message: parsed.error.issues[0]?.message ?? "Invalid 1C product",
      });
      return;
    }

    const product = parsed.data;
    const externalId = String(product.id).trim();
    if (!externalId) {
      issues.push({
        index,
        code: "invalid_product",
        message: "1C product id is empty",
      });
      return;
    }

    items.push({
      externalId,
      sku: externalId,
      name: (product.name_ro ?? product.name ?? "").trim(),
      description: (
        product.description_ro ??
        product.description_ru ??
        ""
      ).trim(),
      regularPriceMdl: regularPrice(product.Prices ?? []),
      balance: finiteNumber(product.balance),
      brandExternalId:
        product.BrandId === null || product.BrandId === undefined
          ? null
          : String(product.BrandId).trim() || null,
      categoryExternalIds: [],
      hidden: product.hidden === true,
      deleted: product.deleted === true,
      source: parsed.data,
    });
  });

  return { items, issues };
}

function regularPrice(prices: z.infer<typeof priceSchema>[]) {
  const price = prices.find((candidate) => String(candidate.typeId) === "05");
  return price ? finiteNumber(price.value) : null;
}

function finiteNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(
    typeof value === "string" ? value.trim().replace(",", ".") : value
  );
  return Number.isFinite(number) ? number : null;
}
