import { ILockingModule, MedusaContainer } from "@medusajs/framework/types";

import { PromotionChangeExecutor } from "../application/ports";
import { dylluMcpPublishPromotionStatusWorkflow } from "../workflows/publish-promotion-status";

export class MedusaPromotionChangeExecutor implements PromotionChangeExecutor {
  constructor(
    private readonly container: MedusaContainer,
    private readonly locking: ILockingModule
  ) {}

  async publishStatus(
    input: Parameters<PromotionChangeExecutor["publishStatus"]>[0]
  ) {
    return this.locking.execute(
      `dyllu-mcp:${input.proposal.targetKey}`,
      async () => {
        const { result } = await dylluMcpPublishPromotionStatusWorkflow(
          this.container
        ).run({
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
