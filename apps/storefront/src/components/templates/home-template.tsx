import * as React from "react";

import { HomepageRenderer } from "@/components/templates/homepage-renderer";
import { homeBlocks } from "@/lib/homepage/home.config";

export function HomeTemplate() {
  return <HomepageRenderer blocks={homeBlocks} />;
}
