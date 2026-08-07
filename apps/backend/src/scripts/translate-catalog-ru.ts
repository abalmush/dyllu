import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createTranslationsWorkflow } from "@medusajs/medusa/core-flows";
import type { CreateTranslationDTO } from "@medusajs/framework/types";

import { CATEGORY_TRANSLATIONS_RU } from "../data/category-translations-ru";
import { PRODUCT_TRANSLATIONS_RU } from "../data/product-translations-ru";

const LOCALE = "ru-RU";

export default async function translateCatalogRu({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const translations: CreateTranslationDTO[] = [
    ...Object.entries(CATEGORY_TRANSLATIONS_RU).map(
      ([reference_id, name]): CreateTranslationDTO => ({
        reference_id,
        reference: "product_category",
        locale_code: LOCALE,
        translations: { name },
      })
    ),
    ...Object.entries(PRODUCT_TRANSLATIONS_RU).map(
      ([reference_id, { title, description }]): CreateTranslationDTO => ({
        reference_id,
        reference: "product",
        locale_code: LOCALE,
        translations: { title, description },
      })
    ),
  ];

  logger.info(
    `Creating ${translations.length} ${LOCALE} translations (${Object.keys(CATEGORY_TRANSLATIONS_RU).length} categories, ${Object.keys(PRODUCT_TRANSLATIONS_RU).length} products)...`
  );

  const { result } = await createTranslationsWorkflow(container).run({
    input: { translations },
  });

  logger.info(`Created ${result.length} translations.`);
}
