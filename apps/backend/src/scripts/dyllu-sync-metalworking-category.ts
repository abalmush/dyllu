import { ExecArgs } from "@medusajs/framework/types";

import { isMetalworkingTool } from "./lib/metalworking-tool-category";
import { syncManagedProductCategory } from "./lib/sync-managed-product-category";

export default async function dylluSyncMetalworkingCategory(args: ExecArgs) {
  await syncManagedProductCategory(args, {
    handle: "scule-pentru-metal",
    name: "Scule pentru metal",
    description:
      "Scule pentru tăiere, șlefuire, sudare, prelucrarea tablei și nituire.",
    confirmation: "SYNC_METALWORKING_CATEGORY",
    logPrefix: "metalworking-category",
    matches: isMetalworkingTool,
  });
}
