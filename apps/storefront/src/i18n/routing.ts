import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ro", "ru"],
  defaultLocale: "ro",
  localePrefix: "as-needed",
  localeDetection: false,
});
