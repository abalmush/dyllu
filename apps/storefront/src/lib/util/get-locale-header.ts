import { getLocale } from "next-intl/server";
import { toMedusaLocale } from "@/i18n/medusa-locale";

export async function getLocaleHeader() {
  const locale = await getLocale();
  return {
    "x-medusa-locale": toMedusaLocale(locale),
  } as const;
}
