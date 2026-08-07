import { routing } from "./routing";

// next-intl locale codes (ro/ru, drive routing + UI messages) are distinct
// from the BCP-47 codes Medusa's translation module stores/matches against
// (ro-RO/ru-RU) — this bridges the two.
export const MEDUSA_LOCALE_MAP: Record<
  (typeof routing.locales)[number],
  string
> = {
  ro: "ro-RO",
  ru: "ru-RU",
};

export function toMedusaLocale(locale: string): string {
  return (
    MEDUSA_LOCALE_MAP[locale as (typeof routing.locales)[number]] ??
    MEDUSA_LOCALE_MAP[routing.defaultLocale]
  );
}
