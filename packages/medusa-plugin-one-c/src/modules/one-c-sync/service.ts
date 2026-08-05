import { MedusaService } from "@medusajs/framework/utils";

import {
  OneCFeedSnapshot,
  OneCProductMapping,
  OneCSyncEvent,
  OneCSyncItem,
  OneCSyncRun,
} from "./models";

class OneCSyncModuleService extends MedusaService({
  OneCFeedSnapshot,
  OneCProductMapping,
  OneCSyncEvent,
  OneCSyncItem,
  OneCSyncRun,
}) {}

export default OneCSyncModuleService;
