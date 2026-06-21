import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows";

import { revalidateStorefront } from "./_revalidate";

export default async function ingcoWipe({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const allProducts: Array<{ id: string; handle?: string; metadata?: Record<string, unknown> | null }> = [];
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
  if (allProducts.length > 0) {
    logger.info(
      `[wipe] sample metadata: ${JSON.stringify(allProducts[0]?.metadata)?.slice(0, 200)}`
    );
  }

  const targets = allProducts.filter((p) => {
    if (!p.metadata) return false;
    return Object.keys(p.metadata).some((k) => k.startsWith("ingco_"));
  });

  if (targets.length === 0) {
    logger.info("[wipe] no ingco-imported products found");
    return;
  }

  logger.info(`[wipe] found ${targets.length} ingco products to delete`);

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
