import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import InteractiveLink from "@modules/common/components/interactive-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Cart");
  return {
    title: t("notFoundMetaTitle"),
    description: t("notFoundMetaDescription"),
  };
}

export default async function NotFound() {
  const t = await getTranslations("Cart");

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center">
      <h1 className="text-2xl-semi text-ui-fg-base">{t("notFoundTitle")}</h1>
      <p className="text-small-regular text-ui-fg-base">{t("notFoundBody")}</p>
      <InteractiveLink href="/">{t("notFoundHome")}</InteractiveLink>
    </div>
  );
}
