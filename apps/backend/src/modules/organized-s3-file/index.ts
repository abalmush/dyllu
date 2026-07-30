import { ModuleProvider, Modules } from "@medusajs/framework/utils";

import { OrganizedS3FileService } from "./service";

export default ModuleProvider(Modules.FILE, {
  services: [OrganizedS3FileService],
});
