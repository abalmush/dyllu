import { MedusaService } from "@medusajs/framework/utils";

import {
  OneCFeedSnapshot,
  OneCSyncEvent,
  OneCSyncItem,
  OneCSyncRun,
} from "./models";

class OneCSyncModuleService extends MedusaService({
  OneCFeedSnapshot,
  OneCSyncEvent,
  OneCSyncItem,
  OneCSyncRun,
}) {}

export default OneCSyncModuleService;
