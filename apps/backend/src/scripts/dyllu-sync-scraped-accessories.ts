import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ExecArgs, RemoteQueryFunction } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows";

type Component = {
  qty: number;
  unit: string;
  name: string;
  sku: string | null;
  resolution: "linked" | "loose";
};

type ManifestEntry = {
  source_id: string;
  source_url: string;
  components: Component[];
};

type VariantRow = {
  id: string;
  sku: string | null;
  metadata: Record<string, unknown> | null;
};

const BATTERY_RE =
  /\b(acumulator(?:i)?|bater(?:ie|ii)|battery|batteries|battery\s+pack)\b/i;
const CHARGER_RE = /\b(încărcător|incarcator|charger)\b/i;

function parseArgs(args: string[]) {
  const parsed: { source?: string; confirmed: boolean } = { confirmed: false };
  for (const arg of args) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key === "source" && value) parsed.source = value;
    if (key === "confirm" && value === "SYNC_SCRAPED_ACCESSORIES") {
      parsed.confirmed = true;
    }
  }
  return parsed;
}

function hasRelationships(metadata: Record<string, unknown>) {
  return ["bundle_components", "included_items"].some((key) => {
    const value = metadata[key];
    if (typeof value !== "string") return false;
    try {
      return Array.isArray(JSON.parse(value)) && JSON.parse(value).length > 0;
    } catch {
      return false;
    }
  });
}

export default async function syncScrapedAccessories({
  container,
  args,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Omit<
    RemoteQueryFunction,
    symbol
  >;
  const flags = parseArgs(args ?? []);
  if (!flags.source)
    throw new Error("source=<absolute-manifest-path> is required");

  const manifest = JSON.parse(
    await readFile(resolve(flags.source), "utf8")
  ) as ManifestEntry[];
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error("source manifest must be a non-empty array");
  }
  const bySourceId = new Map(
    manifest.map((entry) => [entry.source_id, entry] as const)
  );
  if (bySourceId.size !== manifest.length) {
    throw new Error("source manifest contains duplicate source IDs");
  }

  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "metadata"],
    pagination: { skip: 0, take: 5000 },
  });
  const variants = data as VariantRow[];
  const updates = variants.flatMap((variant) => {
    const metadata = variant.metadata ?? {};
    if (hasRelationships(metadata)) return [];
    const sourceId = String(metadata.ingco_source_id ?? "");
    const entry = bySourceId.get(sourceId);
    if (!entry) return [];
    const batteries = entry.components.filter((component) =>
      BATTERY_RE.test(component.name)
    );
    const chargers = entry.components.filter((component) =>
      CHARGER_RE.test(component.name)
    );
    if (batteries.length === 0 && chargers.length === 0) return [];

    return [
      {
        id: variant.id,
        sku: variant.sku,
        metadata: {
          ...metadata,
          bundle_components: JSON.stringify(entry.components),
          battery_included:
            batteries.length > 0 ? "yes" : metadata.battery_included,
          battery_count:
            batteries.reduce((total, component) => total + component.qty, 0) ||
            metadata.battery_count,
          charger_included:
            chargers.length > 0 ? "yes" : metadata.charger_included,
        },
      },
    ];
  });

  logger.info(
    `[scraped-accessories] manifest=${manifest.length} updates=${updates.length}`
  );
  if (!flags.confirmed) {
    logger.info(
      `[scraped-accessories] SKUs: ${updates.map((update) => update.sku).join(", ")}`
    );
    logger.info(
      "[scraped-accessories] DRY RUN — pass confirm=SYNC_SCRAPED_ACCESSORIES to apply"
    );
    return;
  }

  await updateProductVariantsWorkflow(container).run({
    input: {
      product_variants: updates.map(({ id, metadata }) => ({ id, metadata })),
    },
  });
  logger.info(`[scraped-accessories] updated=${updates.length}`);
}
