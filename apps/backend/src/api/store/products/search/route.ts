import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { ALGOLIA_MODULE } from "../../../../modules/algolia";
import type AlgoliaModuleService from "../../../../modules/algolia/service";
import type { ProductSearchBody } from "../../../_shared/contracts";
import { logRouteError } from "../../../_shared/logging";

const EMPTY_RESULT = { hits: [], nbHits: 0, page: 0, nbPages: 0 };

export async function POST(
  req: MedusaRequest<ProductSearchBody>,
  res: MedusaResponse
): Promise<void> {
  let algoliaModule: AlgoliaModuleService;
  try {
    algoliaModule = req.scope.resolve(ALGOLIA_MODULE);
  } catch {
    res.status(200).json(EMPTY_RESULT);
    return;
  }

  try {
    const result = await algoliaModule.search(req.validatedBody);
    res.status(200).json(result);
  } catch (error) {
    logRouteError(req, "store.products_search.failed", error);
    res.status(502).json(EMPTY_RESULT);
  }
}
