import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { IFileModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

import { CategoryImageUpload } from "../../_shared/contracts";

export async function POST(
  req: AuthenticatedMedusaRequest<CategoryImageUpload>,
  res: MedusaResponse
) {
  const fileService = req.scope.resolve<IFileModuleService>(Modules.FILE);
  const file = await fileService.createFiles({
    filename: `categories/${req.validatedBody.filename}`,
    mimeType: req.validatedBody.mime_type,
    content: req.validatedBody.content,
    access: "public",
  });
  res.status(201).json({ file });
}
