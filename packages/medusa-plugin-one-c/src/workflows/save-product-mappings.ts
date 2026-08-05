import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { generateEntityId } from "@medusajs/framework/utils";

import { ONE_C_SYNC_MODULE } from "../modules/one-c-sync";
import OneCSyncModuleService from "../modules/one-c-sync/service";

type SaveProductMappingsInput = {
  actorId: string;
  mappings: Array<{
    externalId: string;
    medusaVariantId: string;
    medusaSku: string;
  }>;
};

const saveProductMappingsStep = createStep(
  "save-product-mappings",
  async (input: SaveProductMappingsInput, { container }) => {
    const service = container.resolve<OneCSyncModuleService>(ONE_C_SYNC_MODULE);
    const mappings = input.mappings.length
      ? await service.createOneCProductMappings(
          input.mappings.map((mapping) => ({
            id: generateEntityId(undefined, "onecmap"),
            external_id: mapping.externalId,
            medusa_variant_id: mapping.medusaVariantId,
            medusa_sku: mapping.medusaSku,
            actor_id: input.actorId,
            active: true,
          }))
        )
      : [];
    return new StepResponse(mappings);
  }
);

export const saveOneCProductMappingsWorkflow = createWorkflow(
  "save-one-c-product-mappings",
  (input: SaveProductMappingsInput) =>
    new WorkflowResponse(saveProductMappingsStep(input))
);
