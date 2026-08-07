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

  await client.setSettings({
    indexName,
    indexSettings: {
      searchableAttributes: [
        "title",
        "description",
        "title_ru",
        "description_ru",
        "skus",
        "variant_titles",
        "category_names",
        "category_names_ru",
        "metadata",
      ],
      attributesForFaceting: ["category_ids", "on_sale"],
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
    indexSettings: { customRanking: ["asc(price)"] },
  });
  await client.setSettings({
    indexName: `${indexName}_price_desc`,
    indexSettings: { customRanking: ["desc(price)"] },
  });
  await client.setSettings({
    indexName: `${indexName}_created_at`,
    indexSettings: { customRanking: ["asc(is_accessory)", "desc(created_at)"] },
  });

  logger.info(`Configured index "${indexName}" and its 3 replicas.`);
}
