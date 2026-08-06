import {
  IInventoryService,
  IPricingModuleService,
  RemoteQueryFunction,
} from "@medusajs/framework/types";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "@medusajs/framework/zod";

import {
  MedusaCatalogApplyReader,
  MedusaCatalogReader,
  OneCSyncStore,
  VariantApplyData,
} from "../application/ports";
import {
  APPLIED_CHANGES_LOOKUP_LIMIT,
  dedupeLatestAppliedChanges,
} from "../domain/apply-status";
import OneCSyncModuleService from "../modules/one-c-sync/service";

const PAGE_SIZE = 200;
const MAX_VARIANTS = 100_000;

const productSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  status: z.string(),
  updated_at: z.coerce.date(),
  variants: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        sku: z.string().nullable().optional(),
        updated_at: z.coerce.date(),
        price_set: z
          .object({
            prices: z
              .array(
                z.object({
                  id: z.string(),
                  currency_code: z.string(),
                  amount: z.number(),
                  updated_at: z.coerce.date(),
                  min_quantity: z.number().nullable().optional(),
                  max_quantity: z.number().nullable().optional(),
                  price_list_id: z.string().nullable().optional(),
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

export class MedusaOneCCatalogReader implements MedusaCatalogReader {
  constructor(private readonly query: Pick<RemoteQueryFunction, "graph">) {}

  async listVariants(salePriceListId: string) {
    const variants: Awaited<ReturnType<MedusaCatalogReader["listVariants"]>> =
      [];
    let skip = 0;
    while (variants.length < MAX_VARIANTS) {
      const { data } = await this.query.graph({
        entity: "product",
        fields: [
          "id",
          "title",
          "description",
          "status",
          "updated_at",
          "variants.id",
          "variants.title",
          "variants.sku",
          "variants.updated_at",
          "variants.price_set.prices.id",
          "variants.price_set.prices.currency_code",
          "variants.price_set.prices.amount",
          "variants.price_set.prices.updated_at",
          "variants.price_set.prices.min_quantity",
          "variants.price_set.prices.max_quantity",
          "variants.price_set.prices.price_list_id",
          "variants.price_set.prices.rules.*",
        ],
        pagination: { take: PAGE_SIZE, skip, order: { id: "ASC" } },
      });
      const products = z.array(productSchema).parse(data);
      for (const product of products) {
        for (const variant of product.variants ?? []) {
          const prices = variant.price_set?.prices ?? [];
          const salePrice = prices.find(
            (price) => price.price_list_id === salePriceListId
          );
          variants.push({
            productId: product.id,
            productTitle: product.title,
            productDescription: product.description ?? null,
            productStatus: product.status,
            productUpdatedAt: product.updated_at,
            variantId: variant.id,
            variantTitle: variant.title,
            variantUpdatedAt: variant.updated_at,
            sku: variant.sku ?? null,
            prices: prices.filter(isDefaultPrice).map((price) => ({
              id: price.id,
              currencyCode: price.currency_code.toLowerCase(),
              amount: price.amount,
              updatedAt: price.updated_at,
            })),
            salePriceListEntry: salePrice
              ? { id: salePrice.id, amount: salePrice.amount }
              : null,
          });
        }
      }
      if (products.length < PAGE_SIZE) break;
      skip += products.length;
    }
    if (variants.length >= MAX_VARIANTS) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Medusa catalog exceeds the 1C comparison limit"
      );
    }
    return variants;
  }
}

const ONE_C_SALE_PRICE_LIST_TITLE = "1C sale prices";

function isDefaultPrice(price: {
  min_quantity?: number | null;
  max_quantity?: number | null;
  price_list_id?: string | null;
  rules?: unknown[];
}) {
  return (
    price.min_quantity == null &&
    price.max_quantity == null &&
    price.price_list_id == null &&
    (price.rules?.length ?? 0) === 0
  );
}

const variantApplySchema = z.object({
  id: z.string(),
  product_id: z.string(),
  price_set: z
    .object({
      prices: z
        .array(
          z.object({
            id: z.string(),
            currency_code: z.string(),
            amount: z.number(),
            price_list_id: z.string().nullable().optional(),
            min_quantity: z.number().nullable().optional(),
            max_quantity: z.number().nullable().optional(),
            rules: z.array(z.unknown()).optional(),
          })
        )
        .optional(),
    })
    .nullable()
    .optional(),
  inventory_items: z
    .array(
      z.object({
        inventory_item_id: z.string(),
      })
    )
    .optional(),
});

export class MedusaOneCApplyReader implements MedusaCatalogApplyReader {
  constructor(
    private readonly query: Pick<RemoteQueryFunction, "graph">,
    private readonly pricing: Pick<
      IPricingModuleService,
      "listPriceLists" | "createPriceLists"
    >,
    private readonly inventory: Pick<IInventoryService, "listInventoryLevels">,
    private readonly stockLocationId: string
  ) {}

  async ensureSalePriceList() {
    // FilterablePriceListProps has no `title` filter, so narrow with fuzzy `q` and confirm an exact title match below.
    const candidates = await this.pricing.listPriceLists(
      { q: ONE_C_SALE_PRICE_LIST_TITLE },
      { take: 100 }
    );
    const existing = candidates.find(
      (list) => list.title === ONE_C_SALE_PRICE_LIST_TITLE
    );
    if (existing) return existing.id;
    const [created] = await this.pricing.createPriceLists([
      {
        title: ONE_C_SALE_PRICE_LIST_TITLE,
        description:
          "Sale prices mirrored from active 1C promotions. A row's presence means 1C currently reports a sale for that variant.",
        type: "sale",
        status: "active",
      },
    ]);
    return created!.id;
  }

  async getVariantForApply(
    variantId: string
  ): Promise<VariantApplyData | null> {
    const salePriceListId = await this.ensureSalePriceList();
    const { data } = await this.query.graph({
      entity: "product_variant",
      fields: [
        "id",
        "product_id",
        "price_set.prices.id",
        "price_set.prices.currency_code",
        "price_set.prices.amount",
        "price_set.prices.price_list_id",
        "price_set.prices.min_quantity",
        "price_set.prices.max_quantity",
        "price_set.prices.rules.*",
        "inventory_items.inventory_item_id",
      ],
      filters: { id: variantId },
      pagination: { take: 1 },
    });
    const parsed = z.array(variantApplySchema).parse(data)[0];
    if (!parsed) return null;

    const prices = parsed.price_set?.prices ?? [];
    const regularPrice = prices.find(
      (price) =>
        price.currency_code.toLowerCase() === "mdl" && isDefaultPrice(price)
    );
    const salePrice = prices.find(
      (price) => price.price_list_id === salePriceListId
    );
    const inventoryItemId =
      parsed.inventory_items?.[0]?.inventory_item_id ?? null;
    let stockedQuantity: number | null = null;
    if (inventoryItemId) {
      const levels = await this.inventory.listInventoryLevels(
        {
          inventory_item_id: inventoryItemId,
          location_id: this.stockLocationId,
        },
        { take: 1 }
      );
      stockedQuantity = levels[0]?.stocked_quantity ?? null;
    }

    return {
      variantId: parsed.id,
      productId: parsed.product_id,
      regularPrice: regularPrice
        ? { id: regularPrice.id, amount: regularPrice.amount }
        : null,
      salePriceListEntry: salePrice
        ? { id: salePrice.id, amount: salePrice.amount }
        : null,
      inventoryItemId,
      stockedQuantity,
    };
  }
}

export class MedusaOneCSyncStore implements OneCSyncStore {
  constructor(private readonly service: OneCSyncModuleService) {}

  async listMappings() {
    const mappings = await this.service.listOneCProductMappings(
      { active: true },
      { take: 100_000 }
    );
    return mappings.map((mapping) => ({
      externalId: mapping.external_id,
      medusaVariantId: mapping.medusa_variant_id,
      medusaSku: mapping.medusa_sku,
    }));
  }

  createRun(input: Parameters<OneCSyncStore["createRun"]>[0]) {
    return this.service.createOneCSyncRuns({
      id: input.id,
      trigger: input.trigger,
      status: input.status,
      actor_id: input.actorId,
      request_id: input.requestId,
      transport_trusted: input.transportTrusted,
      started_at: input.startedAt,
    });
  }

  updateRun(input: Parameters<OneCSyncStore["updateRun"]>[0]) {
    return this.service.updateOneCSyncRuns({
      id: input.id,
      status: input.status,
      completed_at: input.completedAt,
      ...(input.outboundIp !== undefined
        ? { outbound_ip: input.outboundIp }
        : {}),
      ...(input.counts ? { counts: input.counts } : {}),
      ...(input.errorCode ? { error_code: input.errorCode } : {}),
      ...(input.errorMessage ? { error_message: input.errorMessage } : {}),
    });
  }

  createSnapshots(input: Parameters<OneCSyncStore["createSnapshots"]>[0]) {
    return this.service.createOneCFeedSnapshots(
      input.map((snapshot) => ({
        id: snapshot.id,
        run_id: snapshot.runId,
        endpoint: snapshot.endpoint,
        batch: snapshot.batch,
        url: snapshot.url,
        response_hash: snapshot.responseHash,
        raw_body: snapshot.rawBody,
        status_code: snapshot.statusCode,
        elapsed_ms: snapshot.elapsedMs,
      }))
    );
  }

  createItems(input: Parameters<OneCSyncStore["createItems"]>[0]) {
    return this.service.createOneCSyncItems(
      input.map((item) => ({
        id: item.id,
        run_id: item.runId,
        external_id: item.externalId,
        sku: item.sku,
        name: item.name,
        mapping_status: item.mappingStatus,
        preparation_status: item.preparationStatus,
        medusa_product_id: item.medusaProductId,
        medusa_variant_id: item.medusaVariantId,
        medusa_product_title: item.medusaProductTitle,
        source: item.source,
        normalized: item.normalized,
        differences: item.differences,
        hidden: item.hidden,
        deleted: item.deleted,
      }))
    );
  }

  createAppliedChanges(
    input: Parameters<OneCSyncStore["createAppliedChanges"]>[0]
  ) {
    return this.service.createOneCAppliedChanges(
      input.map((change) => ({
        id: change.id,
        run_id: change.runId,
        sync_item_id: change.syncItemId,
        medusa_variant_id: change.medusaVariantId,
        field: change.field,
        // JSONProperty types the column as Record<string, unknown>, but audited values are often bare numbers.
        before: change.before as Record<string, unknown> | null,
        after: change.after as Record<string, unknown> | null,
        actor_id: change.actorId,
        applied_at: change.appliedAt,
        status: change.status,
        error_message: change.errorMessage ?? null,
      }))
    );
  }

  async listLatestAppliedChanges(syncItemIds: string[]) {
    if (syncItemIds.length === 0) return [];
    const changes = await this.service.listOneCAppliedChanges(
      { sync_item_id: syncItemIds },
      { take: APPLIED_CHANGES_LOOKUP_LIMIT, order: { applied_at: "DESC" } }
    );
    return dedupeLatestAppliedChanges(
      changes.map((change) => ({
        syncItemId: change.sync_item_id,
        field: change.field,
        status: change.status,
      }))
    );
  }
}
