import { ILockingModule, MedusaContainer } from "@medusajs/framework/types";

import { ReturnChangeExecutor } from "../application/ports";
import {
  dylluMcpPublishReturnCancelWorkflow,
  dylluMcpPublishReturnCreateWorkflow,
} from "../workflows/publish-return-change";

export class MedusaReturnChangeExecutor implements ReturnChangeExecutor {
  constructor(
    private readonly container: MedusaContainer,
    private readonly locking: ILockingModule
  ) {}

  publishCreate(input: Parameters<ReturnChangeExecutor["publishCreate"]>[0]) {
    return this.execute(input, dylluMcpPublishReturnCreateWorkflow);
  }

  publishCancel(input: Parameters<ReturnChangeExecutor["publishCancel"]>[0]) {
    return this.execute(input, dylluMcpPublishReturnCancelWorkflow);
  }

  private execute(
    input: Parameters<ReturnChangeExecutor["publishCreate"]>[0],
    workflow: typeof dylluMcpPublishReturnCreateWorkflow
  ) {
    return this.locking.execute(
      `dyllu-mcp:${input.proposal.targetKey}`,
      async () => {
        const { result } = await workflow(this.container).run({
          input: {
            actor: input.actor,
            proposalId: input.proposal.id,
            contentHash: input.proposal.contentHash,
            requestId: input.requestId,
            confirmedAt: input.confirmedAt,
          },
        });
        return result;
      },
      { timeout: 5 }
    );
  }
}
