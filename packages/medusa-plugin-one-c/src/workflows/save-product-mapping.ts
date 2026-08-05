import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { generateEntityId } from "@medusajs/framework/utils";

import { ONE_C_SYNC_MODULE } from "../modules/one-c-sync";
import OneCSyncModuleService from "../modules/one-c-sync/service";

type SaveProductMappingInput = {
  existingId: string | null;
  externalId: string;
  medusaVariantId: string;
  medusaSku: string;
  actorId: string;
};

const saveProductMappingStep = createStep(
  "save-product-mapping",
  async (input: SaveProductMappingInput, { container }) => {
    const service = container.resolve<OneCSyncModuleService>(ONE_C_SYNC_MODULE);
    const data = {
      external_id: input.externalId,
      medusa_variant_id: input.medusaVariantId,
      medusa_sku: input.medusaSku,
      actor_id: input.actorId,
      active: true,
    };
    const mapping = input.existingId
      ? await service.updateOneCProductMappings({
          id: input.existingId,
          ...data,
        })
      : await service.createOneCProductMappings({
          id: generateEntityId(undefined, "onecmap"),
          ...data,
        });
    return new StepResponse(mapping);
  }
);

export const saveOneCProductMappingWorkflow = createWorkflow(
  "save-one-c-product-mapping",
  (input: SaveProductMappingInput) =>
    new WorkflowResponse(saveProductMappingStep(input))
);
