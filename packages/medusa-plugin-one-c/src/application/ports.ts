import { MedusaCatalogVariant } from "../domain/compare-catalog";

export type OneCFeedSnapshotInput = {
  endpoint: "product_batches" | "products" | "categories" | "brands" | "promo";
  batch: number | null;
  url: string;
  rawBody: string;
  data: unknown;
  statusCode: number;
  elapsedMs: number;
};

export interface OneCFeeds {
  fetchCatalog(): Promise<{
    outboundIp: string | null;
    snapshots: OneCFeedSnapshotInput[];
  }>;
}

export interface MedusaCatalogReader {
  listVariants(): Promise<MedusaCatalogVariant[]>;
}

export type SyncRunCounts = {
  total: number;
  matched: number;
  missingMedusa: number;
  ambiguous: number;
  excluded: number;
  invalid: number;
  changed: number;
};

export interface OneCSyncStore {
  listMappings(): Promise<
    Array<{
      externalId: string;
      medusaVariantId: string;
      medusaSku: string;
    }>
  >;
  createRun(input: {
    id: string;
    trigger: "manual" | "mcp";
    status: "fetching";
    actorId: string;
    requestId: string;
    transportTrusted: false;
    startedAt: Date;
  }): Promise<unknown>;
  updateRun(input: {
    id: string;
    status: "ready" | "failed";
    completedAt: Date;
    outboundIp?: string | null;
    counts?: SyncRunCounts;
    errorCode?: string;
    errorMessage?: string;
  }): Promise<unknown>;
  createSnapshots(
    input: Array<{
      id: string;
      runId: string;
      endpoint: OneCFeedSnapshotInput["endpoint"];
      batch: number | null;
      url: string;
      responseHash: string;
      rawBody: string;
      statusCode: number;
      elapsedMs: number;
    }>
  ): Promise<unknown>;
  createItems(
    input: Array<{
      id: string;
      runId: string;
      externalId: string;
      sku: string;
      name: string;
      mappingStatus: "matched" | "missing_medusa" | "ambiguous" | "excluded";
      preparationStatus: "unreviewed";
      medusaProductId: string | null;
      medusaVariantId: string | null;
      medusaProductTitle: string | null;
      source: Record<string, unknown>;
      normalized: Record<string, unknown>;
      differences: Record<string, unknown>;
      hidden: boolean;
      deleted: boolean;
    }>
  ): Promise<unknown>;
}

export interface IdGenerator {
  next(prefix: "onecrun" | "onecsnap" | "onecitem"): string;
}

export interface Clock {
  now(): Date;
}
