import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { generateEntityId } from "@medusajs/framework/utils";

import { ONE_C_SYNC_MODULE } from "../modules/one-c-sync";
import OneCSyncModuleService from "../modules/one-c-sync/service";

type RecordSyncExportInput = {
  runId: string;
  actorId: string;
  format: "csv" | "json";
  mappingStatus: string | null;
  rowCount: number;
  occurredAt: Date;
};

const recordSyncExportStep = createStep(
  "record-sync-export",
  async (input: RecordSyncExportInput, { container }) => {
    const service = container.resolve<OneCSyncModuleService>(ONE_C_SYNC_MODULE);
    const event = await service.createOneCSyncEvents({
      id: generateEntityId(undefined, "onecevent"),
      run_id: input.runId,
      actor_id: input.actorId,
      type: "export",
      details: {
        format: input.format,
        mapping_status: input.mappingStatus,
        row_count: input.rowCount,
      },
      occurred_at: input.occurredAt,
    });
    return new StepResponse(event);
  }
);

export const recordOneCSyncExportWorkflow = createWorkflow(
  "record-one-c-sync-export",
  (input: RecordSyncExportInput) =>
    new WorkflowResponse(recordSyncExportStep(input))
);
