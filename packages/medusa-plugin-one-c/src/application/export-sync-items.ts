export type ExportSyncItem = {
  referenceId: string;
  sku: string;
  name: string;
  mappingStatus: string;
  preparationStatus: string;
  regularPriceMdl: number | null;
  salePriceMdl: number | null;
  balance: number | null;
  differences: Record<string, unknown>;
  hidden: boolean;
  deleted: boolean;
};

type ExportInput = {
  runId: string;
  exportedAt: string;
  items: ExportSyncItem[];
};

const CSV_COLUMNS = [
  "run_id",
  "exported_at",
  "reference_id",
  "sku",
  "name",
  "mapping_status",
  "preparation_status",
  "regular_price_mdl",
  "sale_price_mdl",
  "balance",
  "differences_json",
  "hidden",
  "deleted",
] as const;

export function createCsvExport(input: ExportInput) {
  const rows = input.items.map((item) => [
    input.runId,
    input.exportedAt,
    item.referenceId,
    item.sku,
    item.name,
    item.mappingStatus,
    item.preparationStatus,
    item.regularPriceMdl,
    item.salePriceMdl,
    item.balance,
    JSON.stringify(item.differences),
    item.hidden,
    item.deleted,
  ]);
  return `\uFEFF${[CSV_COLUMNS, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")}\r\n`;
}

export function createJsonExport(input: ExportInput) {
  return JSON.stringify(
    {
      schema_version: "1.1",
      run_id: input.runId,
      exported_at: input.exportedAt,
      items: input.items,
    },
    null,
    2
  );
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replaceAll('"', '""')}"`;
  return text;
}
