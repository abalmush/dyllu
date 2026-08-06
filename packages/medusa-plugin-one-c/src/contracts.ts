export const ONE_C_SYNC_MODULE_KEY = "dylluOneCSync";

export type OneCMappingStatus =
  | "matched"
  | "missing_medusa"
  | "ambiguous"
  | "excluded";

export type OneCSyncReadInput = {
  runId?: string;
  mappingStatus?: OneCMappingStatus;
  sku?: string;
  limit: number;
  offset: number;
};

export type OneCSyncSalesReadInput = {
  runId?: string;
  limit: number;
  offset: number;
};

export interface OneCSyncAccess {
  getLatest(): Promise<unknown | null>;
  listComparisons(input: OneCSyncReadInput): Promise<unknown>;
  listSales(input: OneCSyncSalesReadInput): Promise<unknown>;
  receive(input: { actorId: string; requestId: string }): Promise<unknown>;
}
