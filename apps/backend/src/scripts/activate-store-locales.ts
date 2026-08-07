import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows";

const LOCALES_TO_ACTIVATE = ["ro-RO", "ru-RU"];

export default async function activateStoreLocales({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const storeModuleService = container.resolve(Modules.STORE);

  const [store] = await storeModuleService.listStores();
  if (!store) {
    logger.warn("No store found — skipping locale activation.");
    return;
  }

  const existingCodes = new Set(
    (store.supported_locales ?? []).map((locale) => locale.locale_code)
  );
  const missing = LOCALES_TO_ACTIVATE.filter((code) => !existingCodes.has(code));

  if (missing.length === 0) {
    logger.info(
      `Store already has ${LOCALES_TO_ACTIVATE.join(", ")} activated — nothing to do.`
    );
    return;
  }

  const supported_locales = [
    ...(store.supported_locales ?? []),
    ...missing.map((locale_code) => ({ locale_code })),
  ];

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: { supported_locales },
    },
  });

  logger.info(`Activated locales for the store: ${missing.join(", ")}`);
}
