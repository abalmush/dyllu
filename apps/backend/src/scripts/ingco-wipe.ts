import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows";

import { revalidateStorefront } from "./_revalidate";

const CONFIRMATION = "DELETE_INGCO_PRODUCTS";

export default async function ingcoWipe({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const confirmed = (args ?? []).includes(`--confirm=${CONFIRMATION}`);

  if (!confirmed) {
    logger.warn(
      `[wipe] dry run only; pass --confirm=${CONFIRMATION} to delete matching products`
    );
  }
  if (
    confirmed &&
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DESTRUCTIVE_CATALOG_SCRIPTS !== "1"
  ) {
    throw new Error(
      "Production deletion is disabled; set ALLOW_DESTRUCTIVE_CATALOG_SCRIPTS=1 for this one operation"
    );
  }

  const allProducts: Array<{
    id: string;
    handle?: string;
    metadata?: Record<string, unknown> | null;
  }> = [];
  const pageSize = 200;
  let skip = 0;
  while (true) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "handle", "metadata"],
      pagination: { skip, take: pageSize },
    });
    allProducts.push(...data);
    if (data.length < pageSize) break;
    skip += pageSize;
  }
  logger.info(`[wipe] queried ${allProducts.length} total products`);
  const targets = allProducts.filter((p) => {
    if (!p.metadata) return false;
    return Object.keys(p.metadata).some((k) => k.startsWith("ingco_"));
  });

  if (targets.length === 0) {
    logger.info("[wipe] no ingco-imported products found");
    return;
  }

  logger.info(`[wipe] found ${targets.length} ingco products to delete`);
  if (!confirmed) {
    logger.info("[wipe] dry run complete; nothing was deleted");
    return;
  }

  const batchSize = 50;
  let deleted = 0;
  for (let i = 0; i < targets.length; i += batchSize) {
    const batch = targets.slice(i, i + batchSize);
    const ids = batch.map((p: { id: string }) => p.id);
    try {
      await deleteProductsWorkflow(container).run({ input: { ids } });
      deleted += ids.length;
      logger.info(
        `[wipe] batch ${i / batchSize + 1}: deleted ${ids.length} (total ${deleted}/${targets.length})`
      );
    } catch (err) {
      logger.error(
        `[wipe] batch ${i / batchSize + 1} FAILED: ${err instanceof Error ? err.message : err}`
      );
      throw err;
    }
  }

  logger.info(`[wipe] done — deleted ${deleted} products`);

  await revalidateStorefront(logger);
}
