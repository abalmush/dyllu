import { Module } from "@medusajs/framework/utils";

import OneCSyncModuleService from "./service";

export const ONE_C_SYNC_MODULE = "dylluOneCSync";

export default Module(ONE_C_SYNC_MODULE, {
  service: OneCSyncModuleService,
});
