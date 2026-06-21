import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { revalidateStorefront } from "./_revalidate";

type MergedVariant = {
  title: string;
  sku: string;
  article: string;
  priceMdl: number;
};

type MergedProduct = {
  kind: "single" | "multi";
  handle: string;
  name: string;
  optionTitle: string;
  variants: MergedVariant[];
  attributes: Array<{ key: string; value: string }>;
  sourceCategories: string[];
  sourceCategorySlugs: string[];
  breadcrumbs: string[];
};

type Classification = {
  platform: string;
  requires_battery: boolean;
  tool_kind: string;
  accessory_kind: string;
  battery_voltage?: string;
  battery_capacity_ah?: string;
};

const VOLTAGE_PATTERNS = [
  { re: /\b20\s*v\b/i, voltage: "20" },
  { re: /\b12\s*v\b/i, voltage: "12" },
  { re: /\b24\s*v\b/i, voltage: "24" },
  { re: /\b40\s*v\b/i, voltage: "40" },
  { re: /\b18\s*v\b/i, voltage: "18" },
  { re: /\b16\s*v\b/i, voltage: "16" },
];

const TOOL_KIND_PATTERNS: Array<{ re: RegExp; kind: string }> = [
  { re: /\bbormaș|burghiu|gaurire/i, kind: "drill" },
  { re: /\bmașin[ăa] de găurit|mașin[ăa] de înșurubat/i, kind: "drill" },
  { re: /\bpolizor/i, kind: "grinder" },
  { re: /\bferestrău|fierăstrău|ferăstrau|circular/i, kind: "saw" },
  { re: /\bdemolator/i, kind: "demolition_hammer" },
  { re: /\brotopercutor/i, kind: "rotary_hammer" },
  { re: /\bciocan/i, kind: "hammer" },
  { re: /\btopor/i, kind: "axe" },
  { re: /\bcheie/i, kind: "wrench" },
  { re: /\bclește|cleste/i, kind: "pliers" },
  { re: /\bșurubelni|surubelnita|șurubelnita/i, kind: "screwdriver" },
  { re: /\bdaltă|dalta/i, kind: "chisel" },
  { re: /\bspaclu|șpaclu/i, kind: "scraper" },
  { re: /\btrimer|cositoare/i, kind: "trimmer" },
  { re: /\bmotocultor|minitractor/i, kind: "tiller" },
  { re: /\bcompresor/i, kind: "compressor" },
  { re: /\baparat de sudat|sudur[ăa]/i, kind: "welder" },
  { re: /\bgenerator/i, kind: "generator" },
  { re: /\bpomp[ăa]/i, kind: "pump" },
  { re: /\bpulverizator/i, kind: "sprayer" },
  { re: /\bnivel[ăa]/i, kind: "level" },
  { re: /\bruletă|ruleta/i, kind: "tape_measure" },
  { re: /\bbocanci|cizme/i, kind: "footwear" },
  { re: /\bmască|masc[ăa]|ochelari/i, kind: "ppe" },
  { re: /\bmănuși/i, kind: "gloves" },
];

const ACCESSORY_PATTERNS: Array<{ re: RegExp; kind: string }> = [
  { re: /^acumulator/i, kind: "battery" },
  { re: /^(incarcator|încărcător)/i, kind: "charger" },
  { re: /^(disc|hartie abraziv|hârtie abraziv)/i, kind: "abrasive" },
  { re: /^burghi|^bit/i, kind: "drill_bit" },
  { re: /^lama|^lamă/i, kind: "blade" },
  { re: /^cap (cheie|chei)|^biti/i, kind: "socket" },
];

function classify(p: MergedProduct): Classification {
  const name = p.name;
  const attrs = new Map(p.attributes.map((a) => [a.key.toLowerCase(), a.value]));

  // 1. accessory_kind first — if it's a battery/charger/consumable
  let accessory_kind = "";
  for (const { re, kind } of ACCESSORY_PATTERNS) {
    if (re.test(name)) {
      accessory_kind = kind;
      break;
    }
  }

  // 2. detect voltage — prefer the name (it's customer-facing and usually
  // accurate), fall back to attributes if the name has none
  let voltage: string | undefined;
  for (const { re, voltage: v } of VOLTAGE_PATTERNS) {
    if (re.test(name)) {
      voltage = v;
      break;
    }
  }
  if (!voltage) {
    const voltageAttr =
      attrs.get("tensiunea bateriei") ??
      attrs.get("tensiune baterie") ??
      attrs.get("tensiune") ??
      attrs.get("voltaj");
    if (voltageAttr) {
      const m = voltageAttr.match(/(\d{2})/);
      if (m) voltage = m[1];
    }
  }

  // 3. requires_battery — bare cordless tool that needs a battery
  const requires_battery =
    accessory_kind === "" &&
    /\b(compatibil cu acumulator|pe acumulator|pe baterie|li-?ion)\b/i.test(name) &&
    voltage != null;

  // 4. platform
  let platform = "hand";
  if (accessory_kind === "battery" || accessory_kind === "charger") {
    platform = voltage ? `dyllu-${voltage}v` : "battery-system";
  } else if (requires_battery) {
    platform = voltage ? `dyllu-${voltage}v` : "battery-tool";
  } else if (/\bpe benzin/i.test(name)) {
    platform = "gasoline";
  } else if (attrs.has("tensiune ac")) {
    // corded = explicitly has a mains-voltage attribute; "wattage in name"
    // is unreliable (drill bits mention drill wattage in descriptions)
    platform = "corded";
  } else if (accessory_kind) {
    platform = "consumable";
  } else {
    platform = "hand";
  }

  // 5. tool_kind
  let tool_kind = "";
  if (!accessory_kind) {
    for (const { re, kind } of TOOL_KIND_PATTERNS) {
      if (re.test(name)) {
        tool_kind = kind;
        break;
      }
    }
  }

  // 6. battery capacity (only meaningful on actual batteries)
  let battery_capacity_ah: string | undefined;
  if (accessory_kind === "battery") {
    const capAttr =
      attrs.get("capacitatea bateriei") ?? attrs.get("capacitate baterie");
    if (capAttr) {
      battery_capacity_ah = capAttr;
    } else {
      const m = name.match(/(\d+(?:[.,]\d+)?)\s*ah\b/i);
      if (m) battery_capacity_ah = m[1].replace(",", ".");
    }
  }

  return {
    platform,
    requires_battery,
    tool_kind,
    accessory_kind,
    battery_voltage: voltage,
    battery_capacity_ah,
  };
}

export default async function ingcoClassify({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const flags = parseArgs(args ?? []);
  const dryRun = flags.dryRun ?? false;
  const dataDir = resolve(
    process.cwd(),
    "data",
    "ingco",
    "products-merged"
  );

  const files = (await readdir(dataDir)).filter((f) => f.endsWith(".json"));
  logger.info(`[classify] reading ${files.length} merged products`);

  // Build (handle → classification) map and tally stats
  const byHandle = new Map<string, { product: MergedProduct; cls: Classification }>();
  const stats: Record<string, Record<string, number>> = {
    platform: {},
    accessory_kind: {},
    tool_kind: {},
  };
  let requiresBatteryCount = 0;
  for (const f of files) {
    const product = JSON.parse(
      await readFile(join(dataDir, f), "utf8")
    ) as MergedProduct;
    const cls = classify(product);
    byHandle.set(product.handle, { product, cls });
    stats.platform[cls.platform] = (stats.platform[cls.platform] ?? 0) + 1;
    if (cls.accessory_kind) {
      stats.accessory_kind[cls.accessory_kind] =
        (stats.accessory_kind[cls.accessory_kind] ?? 0) + 1;
    }
    if (cls.tool_kind) {
      stats.tool_kind[cls.tool_kind] = (stats.tool_kind[cls.tool_kind] ?? 0) + 1;
    }
    if (cls.requires_battery) requiresBatteryCount++;
  }

  logger.info(
    `[classify] classified ${byHandle.size} products, ${requiresBatteryCount} require a battery`
  );
  for (const [key, counts] of Object.entries(stats)) {
    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
    logger.info(
      `[classify] ${key}: ${sorted.map(([k, n]) => `${k}=${n}`).join(", ")}`
    );
  }

  if (dryRun) {
    logger.info("[classify] DRY RUN — not writing to DB");
    return;
  }

  // Pull all existing products by handle
  const handles = [...byHandle.keys()];
  const handleChunks: string[][] = [];
  for (let i = 0; i < handles.length; i += 200) {
    handleChunks.push(handles.slice(i, i + 200));
  }
  const existing: Array<{ id: string; handle: string; metadata: Record<string, unknown> | null }> = [];
  for (const chunk of handleChunks) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "handle", "metadata"],
      filters: { handle: chunk },
    });
    for (const p of data as Array<{ id: string; handle: string; metadata: Record<string, unknown> | null }>) {
      existing.push(p);
    }
  }
  logger.info(`[classify] matched ${existing.length}/${byHandle.size} products in DB`);

  // Build update payloads
  const updates: Array<{ id: string; metadata: Record<string, unknown> }> = [];
  for (const e of existing) {
    const entry = byHandle.get(e.handle);
    if (!entry) continue;
    const { cls } = entry;
    const merged: Record<string, unknown> = {
      ...(e.metadata ?? {}),
      platform: cls.platform,
      requires_battery: cls.requires_battery,
      tool_kind: cls.tool_kind,
      accessory_kind: cls.accessory_kind,
    };
    if (cls.battery_voltage) merged.battery_voltage = cls.battery_voltage;
    if (cls.battery_capacity_ah) merged.battery_capacity_ah = cls.battery_capacity_ah;
    updates.push({ id: e.id, metadata: merged });
  }

  const batchSize = Number(flags.batch ?? 50);
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    try {
      await updateProductsWorkflow(container).run({
        input: { products: batch },
      });
      logger.info(
        `[classify] batch ${i / batchSize + 1}: updated ${batch.length} (total ${i + batch.length}/${updates.length})`
      );
    } catch (err) {
      logger.error(
        `[classify] batch ${i / batchSize + 1} FAILED: ${err instanceof Error ? err.message : err}`
      );
      throw err;
    }
  }
  logger.info(`[classify] done — updated ${updates.length} products`);

  await revalidateStorefront(logger);
}

function parseArgs(args: string[]) {
  const out: { dryRun?: boolean; batch?: number } = {};
  for (const a of args) {
    const stripped = a.replace(/^--/, "");
    const [key, rawValue] = stripped.split("=");
    if (key === "dryRun") out.dryRun = rawValue !== "false";
    else if (key === "batch" && rawValue) out.batch = Number(rawValue);
  }
  return out;
}
