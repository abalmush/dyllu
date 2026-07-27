import { ExecArgs } from "@medusajs/framework/types";

import { syncManagedProductCategory } from "./lib/sync-managed-product-category";
import { isWoodworkingTool } from "./lib/woodworking-tool-category";

export default async function dylluSyncWoodworkingCategory(args: ExecArgs) {
  await syncManagedProductCategory(args, {
    handle: "scule-pentru-lemn",
    name: "Scule pentru lemn",
    description:
      "Ferăstraie, rindele, freze și mașini de șlefuit pentru prelucrarea lemnului.",
    confirmation: "SYNC_WOODWORKING_CATEGORY",
    logPrefix: "woodworking-category",
    matches: isWoodworkingTool,
  });
}
