import { MedusaContainer } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  QueryContext,
} from "@medusajs/framework/utils";
import { z } from "@medusajs/framework/zod";

import { ALGOLIA_MODULE } from "../modules/algolia";
import type AlgoliaModuleService from "../modules/algolia/service";
import { buildAlgoliaRecord } from "../modules/algolia/lib/build-record";
import {
  planReindex,
  type ReindexInput,
} from "../modules/algolia/lib/plan-reindex";

const PRODUCT_FIELDS = [
  "id",
  "title",
  "description",
  "handle",
  "thumbnail",
  "status",
  "created_at",
  "updated_at",
  "deleted_at",
  "metadata",
  "tags.value",
  "categories.id",
  "categories.name",
  "categories.parent_category.name",
  "variants.id",
  "variants.sku",
  "variants.title",
  "variants.updated_at",
  "variants.calculated_price.calculated_amount",
  "variants.calculated_price.original_amount",
  "variants.price_set.prices.updated_at",
];

const indexableProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  handle: z.string(),
  thumbnail: z.string().nullable(),
  status: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  deleted_at: z.coerce.date().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  tags: z.array(z.object({ value: z.string() })).optional(),
  categories: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        parent_category: z.object({ name: z.string() }).nullable().optional(),
      })
    )
    .optional(),
  variants: z
    .array(
      z.object({
        id: z.string(),
        sku: z.string().nullable(),
        title: z.string(),
        updated_at: z.coerce.date(),
        calculated_price: z
          .object({
            calculated_amount: z.number(),
            original_amount: z.number(),
          })
          .nullable()
          .optional(),
        price_set: z
          .object({
            prices: z.array(z.object({ updated_at: z.coerce.date() })).optional(),
          })
          .nullable()
          .optional(),
      })
    )
    .optional(),
});

type IndexableProduct = z.infer<typeof indexableProductSchema>;

export default async function algoliaReindexJob(container: MedusaContainer) {
  let algoliaModule: AlgoliaModuleService;
  try {
    algoliaModule = container.resolve(ALGOLIA_MODULE);
  } catch {
    return;
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const logger = container.resolve("logger");
  const regionModuleService = container.resolve(Modules.REGION);

  // calculated_price needs pricing context or it resolves to null; DYLLU is single-region, so first region == the region.
  const [region] = await regionModuleService.listRegions(
    {},
    { take: 1, order: { created_at: "ASC" } }
  );
  if (!region) {
    logger.warn("[algolia-reindex] no region configured, skipping");
    return;
  }

  const lastSyncedAt = (await algoliaModule.getLastSyncedAt()) ?? new Date(0);
  const runStartedAt = new Date();

  const { data } = await query.graph({
    entity: "product",
    fields: PRODUCT_FIELDS,
    context: {
      variants: {
        calculated_price: QueryContext({
          region_id: region.id,
          currency_code: region.currency_code,
        }),
      },
    },
    withDeleted: true,
  });
  const products = z.array(indexableProductSchema).parse(data);

  const reindexInputs: (ReindexInput & { raw: IndexableProduct })[] =
    products.map((product) => ({
      id: product.id,
      updatedAt: product.updated_at,
      deletedAt:
        product.deleted_at ??
        (product.status !== "published" ? product.updated_at : null),
      variants: (product.variants ?? []).map((variant) => ({
        updatedAt: variant.updated_at,
        prices: (variant.price_set?.prices ?? []).map((price) => ({
          updatedAt: price.updated_at,
        })),
      })),
      raw: product,
    }));

  const { toUpsert, toDelete } = planReindex(reindexInputs, lastSyncedAt);

  if (toUpsert.length === 0 && toDelete.length === 0) {
    logger.info("[algolia-reindex] no changes since last sync, skipping");
    return;
  }

  const records = toUpsert.map(({ raw }) =>
    buildAlgoliaRecord({
      id: raw.id,
      title: raw.title,
      description: raw.description,
      handle: raw.handle,
      thumbnail: raw.thumbnail,
      status: raw.status,
      created_at: raw.created_at.toISOString(),
      metadata: raw.metadata,
      tags: raw.tags ?? [],
      categories: (raw.categories ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        parentCategoryName: c.parent_category?.name ?? null,
      })),
      variants: (raw.variants ?? []).map((v) => ({
        id: v.id,
        sku: v.sku,
        title: v.title,
        calculated_price: v.calculated_price
          ? {
              calculated_amount: v.calculated_price.calculated_amount,
              original_amount: v.calculated_price.original_amount,
            }
          : null,
      })),
    })
  );

  await algoliaModule.indexData(records);
  await algoliaModule.deleteFromIndex(toDelete.map((p) => p.id));
  await algoliaModule.recordSyncCompleted(runStartedAt);

  logger.info(
    `[algolia-reindex] upserted ${toUpsert.length}, deleted ${toDelete.length}`
  );
}

export const config = {
  name: "algolia-reindex",
  schedule: "0 3 * * *",
};
