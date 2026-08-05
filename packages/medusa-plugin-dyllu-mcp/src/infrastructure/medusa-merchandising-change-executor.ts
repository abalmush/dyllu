import { ILockingModule, MedusaContainer } from "@medusajs/framework/types";

import { MerchandisingChangeExecutor } from "../application/ports";
import { dylluMcpPublishCategoryAssignmentsWorkflow } from "../workflows/publish-category-assignments";

export class MedusaMerchandisingChangeExecutor implements MerchandisingChangeExecutor {
  constructor(
    private readonly container: MedusaContainer,
    private readonly locking: ILockingModule
  ) {}

  async publishCategoryAssignments(
    input: Parameters<
      MerchandisingChangeExecutor["publishCategoryAssignments"]
    >[0]
  ) {
    return this.locking.execute(
      `dyllu-mcp:${input.proposal.targetKey}`,
      async () => {
        const { result } = await dylluMcpPublishCategoryAssignmentsWorkflow(
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
