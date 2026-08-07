import { MedusaContainer } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  QueryContext,
} from "@medusajs/framework/utils";

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
  "variants.sku",
  "variants.title",
  "variants.updated_at",
  "variants.calculated_price.calculated_amount",
  "variants.calculated_price.original_amount",
  "variants.prices.updated_at",
];

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

  const { data: products } = await query.graph({
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

  const reindexInputs: (ReindexInput & { raw: (typeof products)[number] })[] =
    products.map((product) => ({
      id: product.id,
      updatedAt: new Date(product.updated_at),
      deletedAt: product.deleted_at
        ? new Date(product.deleted_at)
        : product.status !== "published"
          ? new Date(product.updated_at)
          : null,
      variants: (product.variants ?? []).map((variant) => ({
        updatedAt: new Date(variant.updated_at),
        prices: (variant.prices ?? []).map((price) => ({
          updatedAt: new Date(price.updated_at),
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
      created_at: raw.created_at,
      metadata: raw.metadata,
      tags: raw.tags ?? [],
      categories: raw.categories ?? [],
      variants: (raw.variants ?? []).map((v) => ({
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
