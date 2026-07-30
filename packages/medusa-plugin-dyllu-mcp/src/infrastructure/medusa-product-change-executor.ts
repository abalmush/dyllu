import { ILockingModule, MedusaContainer } from "@medusajs/framework/types";

import { ProductChangeExecutor } from "../application/ports";
import { dylluMcpPublishProductDescriptionWorkflow } from "../workflows/publish-product-description";
import { dylluMcpPublishProductPriceWorkflow } from "../workflows/publish-product-price";

export class MedusaProductChangeExecutor implements ProductChangeExecutor {
  constructor(
    private readonly container: MedusaContainer,
    private readonly locking: ILockingModule
  ) {}

  async publishDescription(
    input: Parameters<ProductChangeExecutor["publishDescription"]>[0]
  ) {
    return this.locking.execute(
      `dyllu-mcp:product:${input.proposal.productId}`,
      async () => {
        const { result } = await dylluMcpPublishProductDescriptionWorkflow(
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

  async publishPrice(
    input: Parameters<ProductChangeExecutor["publishPrice"]>[0]
  ) {
    return this.locking.execute(
      `dyllu-mcp:product:${input.proposal.productId}`,
      async () => {
        const { result } = await dylluMcpPublishProductPriceWorkflow(
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
