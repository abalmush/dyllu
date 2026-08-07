"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { updateLocale } from "@lib/data/locale-actions";
import { cn } from "@lib/utils";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const activeLocale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("LocaleSwitcher");
  const [, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="border-border flex items-center gap-1 rounded-full border p-0.5 text-xs font-semibold"
    >
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          aria-current={locale === activeLocale ? "true" : undefined}
          onClick={() => {
            startTransition(() => {
              void updateLocale(locale);
            });
          }}
          className={cn(
            "rounded-full px-2 py-1 uppercase transition-colors",
            locale === activeLocale
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {locale}
        </Link>
      ))}
    </div>
  );
}
