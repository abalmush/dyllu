import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { InfoPageTemplate } from "@/components/templates/info-page-template";
import type { InfoPageData, InfoPageSection } from "@lib/site-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PrivacyPage");
  return {
    title: t("metaTitle"),
    description: t("description"),
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("PrivacyPage");
  const page: InfoPageData = {
    eyebrow: t("eyebrow"),
    title: t("title"),
    description: t("description"),
    sections: t.raw("sections") as InfoPageSection[],
  };

  return <InfoPageTemplate page={page} />;
}
