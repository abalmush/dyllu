import { ILockingModule, MedusaContainer } from "@medusajs/framework/types";

import { SaleChangeExecutor } from "../application/ports";
import { dylluMcpPublishSaleCreateWorkflow } from "../workflows/publish-sale-create";
import { dylluMcpPublishSaleUpdateWorkflow } from "../workflows/publish-sale-update";

export class MedusaSaleChangeExecutor implements SaleChangeExecutor {
  constructor(
    private readonly container: MedusaContainer,
    private readonly locking: ILockingModule
  ) {}

  async publishCreate(
    input: Parameters<SaleChangeExecutor["publishCreate"]>[0]
  ) {
    return this.locking.execute(
      `dyllu-mcp:${input.proposal.targetKey}`,
      async () => {
        const { result } = await dylluMcpPublishSaleCreateWorkflow(
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

  async publishUpdate(
    input: Parameters<SaleChangeExecutor["publishUpdate"]>[0]
  ) {
    return this.locking.execute(
      `dyllu-mcp:${input.proposal.targetKey}`,
      async () => {
        const { result } = await dylluMcpPublishSaleUpdateWorkflow(
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
