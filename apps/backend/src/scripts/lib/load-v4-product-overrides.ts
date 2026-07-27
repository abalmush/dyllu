import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type CsvRow = Record<string, string>;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r\n|\n/).filter((l) => l.length > 0);
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: CsvRow = {};
    header.forEach((key, i) => (row[key] = values[i] ?? ""));
    return row;
  });
}

export type V4Override = {
  title: string;
  handle: string;
  categoryKey: string;
};

// Same alias already used by ingco-sync-bundle-components.ts for this one SKU.
const SKU_ALIASES = new Map([["DTCD1B1285", "DTCD1B12856"]]);

export async function loadV4Overrides(
  mappingPath?: string
): Promise<Map<string, V4Override>> {
  const path =
    mappingPath ??
    resolve(
      process.cwd(),
      "data",
      "ingco",
      "project",
      "Dyllu_Taxonomy_v4_Package",
      "Dyllu_Product_Mapping_v4.csv"
    );
  const rows = parseCsv(await readFile(path, "utf8"));
  const map = new Map<string, V4Override>();
  for (const row of rows) {
    const sku = row.sku.trim().toUpperCase();
    map.set(sku, {
      title: row.product_name,
      handle: row.canonical_id,
      // L3 is intentionally dropped (site has no 3rd category level) — key
      // matches generate-category-tree-v4.ts's terminalHandleByPath keys.
      categoryKey: `${row.v4_level_1}|${row.v4_level_2}`,
    });
  }
  return map;
}

export function resolveV4Override(
  overrides: Map<string, V4Override>,
  variantSku: string
): V4Override | undefined {
  const upper = variantSku.toUpperCase();
  return overrides.get(upper) ?? overrides.get(SKU_ALIASES.get(upper) ?? upper);
}

export async function loadTerminalHandles(): Promise<Map<string, string>> {
  const path = resolve(
    process.cwd(),
    "data",
    "ingco",
    "category-terminal-handles-v4.json"
  );
  const raw = JSON.parse(await readFile(path, "utf8")) as Record<
    string,
    string
  >;
  return new Map(Object.entries(raw));
}
