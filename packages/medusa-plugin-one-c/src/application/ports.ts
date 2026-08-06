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
  listVariants(salePriceListId: string): Promise<MedusaCatalogVariant[]>;
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

export type AppliedChangeField = "regular_price_mdl" | "sale_price_mdl" | "balance";
export type AppliedChangeStatus = "applied" | "flagged" | "failed";

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
  createAppliedChanges(
    input: Array<{
      id: string;
      runId: string;
      syncItemId: string;
      medusaVariantId: string;
      field: AppliedChangeField;
      before: unknown;
      after: unknown;
      actorId: string;
      appliedAt: Date;
      status: AppliedChangeStatus;
      errorMessage?: string | null;
    }>
  ): Promise<unknown>;
  listLatestAppliedChanges(syncItemIds: string[]): Promise<
    Array<{ syncItemId: string; field: AppliedChangeField; status: AppliedChangeStatus }>
  >;
}

export interface IdGenerator {
  next(prefix: "onecrun" | "onecsnap" | "onecitem" | "onecapplied"): string;
}

export interface Clock {
  now(): Date;
}

export type VariantApplyData = {
  variantId: string;
  productId: string;
  regularPrice: { id: string; amount: number } | null;
  salePriceListEntry: { id: string; amount: number } | null;
  inventoryItemId: string | null;
  stockedQuantity: number | null;
};

export interface MedusaCatalogApplyReader {
  getVariantForApply(variantId: string): Promise<VariantApplyData | null>;
  ensureSalePriceList(): Promise<string>;
}
