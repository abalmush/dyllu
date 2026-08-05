import { RemoteQueryFunction } from "@medusajs/framework/types";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "@medusajs/framework/zod";

import { MedusaCatalogReader, OneCSyncStore } from "../application/ports";
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

  async listVariants() {
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
          "variants.price_set.prices.rules.*",
        ],
        pagination: { take: PAGE_SIZE, skip, order: { id: "ASC" } },
      });
      const products = z.array(productSchema).parse(data);
      for (const product of products) {
        for (const variant of product.variants ?? []) {
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
            prices: (variant.price_set?.prices ?? [])
              .filter(
                (price) =>
                  price.min_quantity == null &&
                  price.max_quantity == null &&
                  (price.rules?.length ?? 0) === 0
              )
              .map((price) => ({
                id: price.id,
                currencyCode: price.currency_code.toLowerCase(),
                amount: price.amount,
                updatedAt: price.updated_at,
              })),
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
}
