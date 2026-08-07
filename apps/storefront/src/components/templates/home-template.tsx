import * as React from "react";
import { getTranslations } from "next-intl/server";

import { HomepageRenderer } from "@/components/templates/homepage-renderer";
import { getHomeBlocks } from "@/lib/homepage/home.config";
import { getCategoryTree } from "@lib/data/categories";

export async function HomeTemplate() {
  const [categories, t] = await Promise.all([
    getCategoryTree(),
    getTranslations("Homepage"),
  ]);

  return <HomepageRenderer blocks={getHomeBlocks(t)} categories={categories} />;
}
