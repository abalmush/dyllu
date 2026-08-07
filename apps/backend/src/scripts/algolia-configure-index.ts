import { ExecArgs } from "@medusajs/framework/types";
import { algoliasearch } from "algoliasearch";

import { parseBackendEnvironment } from "../config/environment";

export default async function algoliaConfigureIndex({
  container,
}: ExecArgs) {
  const logger = container.resolve("logger");
  const environment = parseBackendEnvironment(process.env);
  if (!environment.algolia) {
    logger.error(
      "Algolia is not configured — set ALGOLIA_* env vars first."
    );
    process.exitCode = 1;
    return;
  }

  const { appId, adminApiKey, indexName } = environment.algolia;
  const client = algoliasearch(appId, adminApiKey);

  const attributesForFaceting = ["category_ids", "on_sale"];

  await client.setSettings({
    indexName,
    indexSettings: {
      searchableAttributes: [
        "title",
        "description",
        "skus",
        "variant_titles",
        "category_names",
        "metadata",
      ],
      attributesForFaceting,
      customRanking: ["asc(is_accessory)"],
      replicas: [
        `${indexName}_price_asc`,
        `${indexName}_price_desc`,
        `${indexName}_created_at`,
      ],
    },
  });

  await client.setSettings({
    indexName: `${indexName}_price_asc`,
    indexSettings: { attributesForFaceting, customRanking: ["asc(price)"] },
  });
  await client.setSettings({
    indexName: `${indexName}_price_desc`,
    indexSettings: { attributesForFaceting, customRanking: ["desc(price)"] },
  });
  await client.setSettings({
    indexName: `${indexName}_created_at`,
    indexSettings: {
      attributesForFaceting,
      customRanking: ["asc(is_accessory)", "desc(created_at)"],
    },
  });

  logger.info(`Configured index "${indexName}" and its 3 replicas.`);
}
