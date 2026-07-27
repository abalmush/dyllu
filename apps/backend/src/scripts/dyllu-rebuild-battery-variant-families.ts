import { ExecArgs, RemoteQueryFunction } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

import dylluSyncCatalogDetails from "./dyllu-sync-catalog-details";
import ingcoIngestMerged from "./ingco-ingest-merged";

const CONFIRMATION = "REBUILD_LOCAL_BATTERY_VARIANTS";
const FAMILY = {
  skus: ["DTBJ1305", "DTBJ1308"],
  source: "data/ingco/products-merged/capsator-cu-acumulator-dtbj1305-20v.json",
};

export default async function dylluRebuildBatteryVariantFamilies({
  container,
  args,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Omit<
    RemoteQueryFunction,
    symbol
  >;
  const scriptArgs = (args ?? []).map((arg) => arg.replace(/^--/, ""));
  const confirmed = scriptArgs.includes(`confirm=${CONFIRMATION}`);
  const catalogSource = scriptArgs
    .find((arg) => arg.startsWith("source="))
    ?.slice("source=".length);

  if (process.env.NODE_ENV === "production") {
    throw new Error("This targeted catalog rebuild is local-only");
  }

  const sourcePath = resolve(process.cwd(), FAMILY.source);
  const source = JSON.parse(await readFile(sourcePath, "utf8")) as {
    variants?: Array<{ sku?: string }>;
  };
  const sourceSkus = new Set(
    (source.variants ?? []).flatMap((variant) =>
      variant.sku ? [variant.sku.toUpperCase()] : []
    )
  );
  if (
    sourceSkus.size !== FAMILY.skus.length ||
    FAMILY.skus.some((sku) => !sourceSkus.has(sku))
  ) {
    throw new Error(
      "The reviewed source family does not contain the expected SKUs"
    );
  }

  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["sku", "product.id", "product.handle"],
    filters: { sku: FAMILY.skus },
  });
  const variants = data as Array<{
    sku: string | null;
    product: { id: string; handle: string } | null;
  }>;
  if (
    variants.length !== FAMILY.skus.length ||
    variants.some((v) => !v.product)
  ) {
    throw new Error(
      "Expected both reviewed SKUs to exist in the local catalog"
    );
  }
  const productIds = [
    ...new Set(variants.map((variant) => variant.product!.id)),
  ];
  if (productIds.length === 1) {
    logger.info(
      `[battery-variants] ${FAMILY.skus.join(" + ")} already grouped`
    );
    return;
  }

  logger.info(
    `[battery-variants] reviewed regroup: ${variants
      .map((variant) => `${variant.sku} (${variant.product!.handle})`)
      .join(" + ")}`
  );
  if (!confirmed) {
    logger.info(
      `[battery-variants] DRY RUN — pass --confirm=${CONFIRMATION} to rebuild locally`
    );
    return;
  }
  if (!catalogSource) {
    throw new Error("--source is required for an applied rebuild");
  }

  const stagingDir = await mkdtemp(join(tmpdir(), "dyllu-battery-family-"));
  try {
    await copyFile(sourcePath, join(stagingDir, basename(sourcePath)));
    await deleteProductsWorkflow(container).run({ input: { ids: productIds } });
    await ingcoIngestMerged({ container, args: [`--dir=${stagingDir}`] });
    await dylluSyncCatalogDetails({
      container,
      args: [`--source=${resolve(catalogSource)}`, "--dryRun=false"],
    });
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
}
