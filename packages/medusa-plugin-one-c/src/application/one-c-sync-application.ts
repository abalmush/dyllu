import { createHash } from "node:crypto";

import { compareCatalog } from "../domain/compare-catalog";
import { normalizeProductFeed } from "../domain/normalize-product-feed";
import {
  Clock,
  IdGenerator,
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
      const [feed, variants] = await Promise.all([
        this.dependencies.feeds.fetchCatalog(),
        this.dependencies.catalog.listVariants(),
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
      const normalizationResults = productSnapshots.map((snapshot) =>
        normalizeProductFeed(snapshot.data)
      );
      const normalized = normalizationResults.flatMap((result) => result.items);
      const invalid = normalizationResults.reduce(
        (count, result) => count + result.issues.length,
        0
      );
      const comparisons = compareCatalog(normalized, variants);

      await this.dependencies.store.createItems(
        comparisons.map((comparison) => ({
          id: this.dependencies.ids.next("onecitem"),
          runId,
          externalId: comparison.externalId,
          sku: comparison.sku,
          name: comparison.source.name,
          mappingStatus: comparison.mappingStatus,
          preparationStatus: "unreviewed",
          medusaProductId: comparison.medusaProductId,
          medusaVariantId: comparison.medusaVariantId,
          medusaProductTitle: comparison.medusaProductTitle,
          source: comparison.source.source,
          normalized: comparison.source,
          differences: { fields: comparison.differences },
          hidden: comparison.source.hidden,
          deleted: comparison.source.deleted,
        }))
      );

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
