import { MedusaService } from "@medusajs/framework/utils";

import {
  OneCAppliedChange,
  OneCFeedSnapshot,
  OneCProductMapping,
  OneCSyncEvent,
  OneCSyncItem,
  OneCSyncRun,
} from "./models";

class OneCSyncModuleService extends MedusaService({
  OneCAppliedChange,
  OneCFeedSnapshot,
  OneCProductMapping,
  OneCSyncEvent,
  OneCSyncItem,
  OneCSyncRun,
}) {}

export default OneCSyncModuleService;
