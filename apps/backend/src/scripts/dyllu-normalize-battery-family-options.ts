import {
  ExecArgs,
  IProductModuleService,
  RemoteQueryFunction,
} from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows";

import {
  indexBatteryVariantFamilies,
  loadBatteryVariantFamilies,
} from "./lib/battery-variant-families";

const CONFIRMATION = "NORMALIZE_BATTERY_FAMILY_OPTIONS";

type VariantRow = {
  id: string;
  sku: string | null;
  product_id: string | null;
  product: {
    options: Array<{ id: string; title: string }>;
  } | null;
  options: Array<{ id: string; value: string }>;
};

export default async function dylluNormalizeBatteryFamilyOptions({
  container,
  args,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Omit<
    RemoteQueryFunction,
    symbol
  >;
  const productService = container.resolve<IProductModuleService>(
    Modules.PRODUCT
  );
  const confirmed = (args ?? [])
    .map((arg) => arg.replace(/^--/, ""))
    .includes(`confirm=${CONFIRMATION}`);
  const families = await loadBatteryVariantFamilies();
  const memberBySku = indexBatteryVariantFamilies(families);
  const { data } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "sku",
      "product_id",
      "product.options.id",
      "product.options.title",
      "options.id",
      "options.value",
    ],
    filters: { sku: [...memberBySku.keys()] },
  });
  const variants = data as VariantRow[];
  const optionTitleUpdates = new Map<string, string>();
  const valueUpdates: Array<{ id: string; value: string }> = [];
  const variantUpdates: Array<{ id: string; title: string }> = [];

  for (const variant of variants) {
    if (!variant.sku || !variant.product_id || !variant.product) continue;
    const member = memberBySku.get(variant.sku.toUpperCase());
    if (!member) continue;
    if (variant.product.options.length !== 1 || variant.options.length !== 1) {
      throw new Error(
        `Family variant ${variant.sku} must have exactly one product option and one value`
      );
    }
    const option = variant.product.options[0];
    const value = variant.options[0];
    if (option.title !== "Configurație") {
      optionTitleUpdates.set(option.id, "Configurație");
    }
    if (value.value !== member.configuration) {
      valueUpdates.push({ id: value.id, value: member.configuration });
    }
    variantUpdates.push({ id: variant.id, title: member.configuration });
  }

  logger.info(
    `[battery-family-options] ${optionTitleUpdates.size} option titles, ${valueUpdates.length} option values, ${variantUpdates.length} variant titles reviewed`
  );
  if (!confirmed) {
    logger.info(
      `[battery-family-options] DRY RUN — pass confirm=${CONFIRMATION} to apply`
    );
    return;
  }

  for (const [id, title] of optionTitleUpdates) {
    await productService.updateProductOptions(id, { title });
  }
  for (const update of valueUpdates) {
    await productService.updateProductOptionValues(update.id, {
      value: update.value,
    });
  }
  await updateProductVariantsWorkflow(container).run({
    input: { product_variants: variantUpdates },
  });
}
