import { createHash } from "node:crypto";

import { compareCatalog } from "../domain/compare-catalog";
import { normalizeProductFeed } from "../domain/normalize-product-feed";
import { normalizePromoFeed } from "../domain/normalize-promo-feed";
import {
  Clock,
  IdGenerator,
  MedusaCatalogApplyReader,
  MedusaCatalogReader,
  OneCFeeds,
  OneCSyncStore,
  SyncRunCounts,
} from "./ports";

export type ReceiveSyncInput = {
  actorId: string;
  requestId: string;
  trigger: "manual" | "mcp";
};

type OneCSyncApplicationDependencies = {
  feeds: OneCFeeds;
  catalog: MedusaCatalogReader;
  applyReader: Pick<MedusaCatalogApplyReader, "ensureSalePriceList">;
  store: OneCSyncStore;
  ids: IdGenerator;
  clock: Clock;
};

export class OneCSyncApplication {
  constructor(private readonly dependencies: OneCSyncApplicationDependencies) {}

  async receive(input: ReceiveSyncInput) {
    const runId = this.dependencies.ids.next("onecrun");
    await this.dependencies.store.createRun({
      id: runId,
      trigger: input.trigger,
      status: "fetching",
      actorId: input.actorId,
      requestId: input.requestId,
      transportTrusted: false,
      startedAt: this.dependencies.clock.now(),
    });

    try {
      const salePriceListId =
        await this.dependencies.applyReader.ensureSalePriceList();
      const [feed, variants, mappings] = await Promise.all([
        this.dependencies.feeds.fetchCatalog(),
        this.dependencies.catalog.listVariants(salePriceListId),
        this.dependencies.store.listMappings(),
      ]);
      await this.dependencies.store.createSnapshots(
        feed.snapshots.map((snapshot) => ({
          id: this.dependencies.ids.next("onecsnap"),
          runId,
          endpoint: snapshot.endpoint,
          batch: snapshot.batch,
          url: snapshot.url,
          responseHash: `sha256:${createHash("sha256")
            .update(snapshot.rawBody)
            .digest("hex")}`,
          rawBody: snapshot.rawBody,
          statusCode: snapshot.statusCode,
          elapsedMs: snapshot.elapsedMs,
        }))
      );

      const productSnapshots = feed.snapshots.filter(
        (snapshot) => snapshot.endpoint === "products"
      );
      const normalizationResults = productSnapshots.map((snapshot) => ({
        snapshot,
        result: normalizeProductFeed(snapshot.data),
      }));
      const dylluBrandIds = getDylluBrandIds(feed.snapshots);
      const promoSnapshot = feed.snapshots.find(
        (snapshot) => snapshot.endpoint === "promo"
      );
      const promotions = normalizePromoFeed(
        promoSnapshot?.data ?? { Items: [] }
      );
      const normalized = normalizationResults
        .flatMap(({ result }) => result.items)
        .filter(
          (product) =>
            product.brandExternalId !== null &&
            dylluBrandIds.has(product.brandExternalId)
        )
        .map((product) => {
          const promotion = promotions.get(product.externalId);
          return {
            ...product,
            salePriceMdl: promotion?.salePriceMdl ?? null,
            saleStartsAt: promotion?.startsAt ?? null,
            saleEndsAt: promotion?.endsAt ?? null,
          };
        });
      const comparisons = compareCatalog(normalized, variants, mappings);
      const invalidItems = normalizationResults.flatMap(
        ({ snapshot, result }) =>
          result.issues
            .filter((issue) => {
              const brandExternalId = sourceBrandExternalId(issue.source);
              return (
                brandExternalId !== null && dylluBrandIds.has(brandExternalId)
              );
            })
            .map((issue) => {
              const externalId = sourceExternalId(issue.source);
              const fallbackId = `invalid:${snapshot.batch ?? "unknown"}:${issue.index}`;
              return {
                id: this.dependencies.ids.next("onecitem"),
                runId,
                externalId: externalId ?? fallbackId,
                sku: "",
                name: sourceProductName(issue.source),
                mappingStatus: "ambiguous" as const,
                preparationStatus: "unreviewed" as const,
                medusaProductId: null,
                medusaVariantId: null,
                medusaProductTitle: null,
                source: issue.source,
                normalized: {
                  issueCode: issue.code,
                  issueMessage: issue.message,
                  brandExternalId: sourceBrandExternalId(issue.source),
                },
                differences: {
                  fields: [
                    { field: "source", source: "invalid", target: null },
                  ],
                  issue: issue.message,
                },
                hidden: issue.source.hidden === true,
                deleted: issue.source.deleted === true,
              };
            })
      );

      await this.dependencies.store.createItems([
        ...comparisons.map((comparison) => ({
          id: this.dependencies.ids.next("onecitem"),
          runId,
          externalId: comparison.externalId,
          sku: comparison.sku,
          name: comparison.source.name,
          mappingStatus: comparison.mappingStatus,
          preparationStatus: "unreviewed" as const,
          medusaProductId: comparison.medusaProductId,
          medusaVariantId: comparison.medusaVariantId,
          medusaProductTitle: comparison.medusaProductTitle,
          source: comparison.source.source,
          normalized: {
            ...comparison.source,
            suggestedMedusaSku: comparison.suggestedMedusaSku,
          },
          differences: { fields: comparison.differences },
          hidden: comparison.source.hidden,
          deleted: comparison.source.deleted,
        })),
        ...invalidItems,
      ]);

      const invalid = invalidItems.length;
      const counts: SyncRunCounts = {
        total: normalized.length + invalid,
        matched: comparisons.filter((item) => item.mappingStatus === "matched")
          .length,
        missingMedusa: comparisons.filter(
          (item) => item.mappingStatus === "missing_medusa"
        ).length,
        ambiguous: comparisons.filter(
          (item) => item.mappingStatus === "ambiguous"
        ).length,
        excluded: comparisons.filter(
          (item) => item.mappingStatus === "excluded"
        ).length,
        invalid,
        changed: comparisons.filter((item) => item.differences.length > 0)
          .length,
      };
      const completedAt = this.dependencies.clock.now();
      await this.dependencies.store.updateRun({
        id: runId,
        status: "ready",
        completedAt,
        outboundIp: feed.outboundIp,
        counts,
      });
      return {
        id: runId,
        status: "ready" as const,
        transportTrusted: false as const,
        outboundIp: feed.outboundIp,
        completedAt,
        counts,
      };
    } catch (error) {
      await this.dependencies.store.updateRun({
        id: runId,
        status: "failed",
        completedAt: this.dependencies.clock.now(),
        errorCode:
          typeof error === "object" && error && "code" in error
            ? String(error.code)
            : "receive_failed",
        errorMessage:
          error instanceof Error ? error.message : "1C receive failed",
      });
      throw error;
    }
  }
}

function getDylluBrandIds(
  snapshots: Awaited<ReturnType<OneCFeeds["fetchCatalog"]>>["snapshots"]
) {
  const brands = snapshots.find((snapshot) => snapshot.endpoint === "brands");
  const items =
    isRecord(brands?.data) && Array.isArray(brands.data.Items)
      ? brands.data.Items
      : [];
  const ids = new Set<string>();

  for (const item of items) {
    if (!isRecord(item)) continue;
    const id = item.id ?? item.Id;
    const name = item.name ?? item.Name;
    if (
      (typeof id === "string" || typeof id === "number") &&
      typeof name === "string" &&
      name.trim().toLocaleLowerCase("en-US") === "dyllu"
    ) {
      ids.add(String(id).trim());
    }
  }

  if (ids.size === 0) {
    const error = new Error("The 1C brands feed has no DYLLU brand");
    Object.assign(error, { code: "brand_scope_not_found" });
    throw error;
  }

  return ids;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sourceBrandExternalId(source: Record<string, unknown>) {
  const value = source.BrandId;
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim() || null
    : null;
}

function sourceExternalId(source: Record<string, unknown>) {
  const value = source.id;
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim() || null
    : null;
}

function sourceProductName(source: Record<string, unknown>) {
  const value = source.name_ro ?? source.name;
  return typeof value === "string" && value.trim()
    ? value.trim()
    : "Invalid 1C product";
}
