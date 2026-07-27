import * as React from "react";

import { HomepageRenderer } from "@/components/templates/homepage-renderer";
import { homeBlocks } from "@/lib/homepage/home.config";
import { getCategoryTree } from "@lib/data/categories";

export async function HomeTemplate() {
  const categories = await getCategoryTree();

  return <HomepageRenderer blocks={homeBlocks} categories={categories} />;
}
