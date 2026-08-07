import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import algoliaReindexJob from "../../../../jobs/algolia-reindex";
import { logRouteError } from "../../../_shared/logging";

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    await algoliaReindexJob(req.scope);
    res.status(200).json({ success: true });
  } catch (error) {
    logRouteError(req, "admin_algolia_sync_failed", error);
    res.status(500).json({ success: false });
  }
}
