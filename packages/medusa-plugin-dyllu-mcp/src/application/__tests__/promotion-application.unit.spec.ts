import { PromotionApplication } from "../promotion-application";
import {
  Clock,
  IdGenerator,
  OperationGovernanceStore,
  PromotionChangeExecutor,
  PromotionDirectory,
} from "../ports";
import {
  Actor,
  OperationProposal,
  OperationRevision,
  PromotionDetails,
} from "../../domain/types";

const now = new Date("2026-08-05T12:00:00.000Z");
const actor: Actor = {
  id: "user_andrei",
  email: "andrei@dyllu.md",
  name: "Andrei",
};
const promotion: PromotionDetails = {
  id: "promo_august",
  code: "AUGUST10",
  type: "standard",
  status: "draft",
  isAutomatic: false,
  isTaxInclusive: false,
  limit: 100,
  used: 0,
  campaignId: null,
  createdAt: new Date("2026-08-05T09:00:00.000Z"),
  updatedAt: new Date("2026-08-05T10:00:00.000Z"),
};

class TestDirectory implements PromotionDirectory {
  current = promotion;

  async list() {
    return { promotions: [this.current], count: 1 };
  }

  async findById(promotionId: string) {
    return promotionId === this.current.id ? this.current : null;
  }
}

class TestGovernance implements OperationGovernanceStore {
  readonly proposals: OperationProposal[] = [];
  readonly revisions: OperationRevision[] = [];

  async createProposal(
    input: Parameters<OperationGovernanceStore["createProposal"]>[0]
  ) {
    this.proposals.push(input.proposal);
  }

  async findProposal(proposalId: string) {
    return (
      this.proposals.find((proposal) => proposal.id === proposalId) ?? null
    );
  }

  async findRevision(revisionId: string) {
    return (
      this.revisions.find((revision) => revision.id === revisionId) ?? null
    );
  }

  async listRevisions(targetKey: string, limit: number) {
    return this.revisions
      .filter((revision) => revision.targetKey === targetKey)
      .slice(0, limit);
  }

  async closeProposal() {}
}

class TestExecutor implements PromotionChangeExecutor {
  readonly calls: Parameters<PromotionChangeExecutor["publishStatus"]>[0][] =
    [];

  async publishStatus(
    input: Parameters<PromotionChangeExecutor["publishStatus"]>[0]
  ) {
    this.calls.push(input);
    return {
      id: "operationRevision_1",
      proposalId: input.proposal.id,
      kind: input.proposal.kind,
      action:
        input.proposal.kind === "promotion_status_rollback"
          ? ("rollback" as const)
          : ("update" as const),
      actor: input.actor,
      targetType: "promotion" as const,
      targetId: promotion.id,
      targetKey: `promotion:${promotion.id}`,
      beforeValue: input.proposal.beforeValue,
      afterValue: input.proposal.proposedValue,
      sourceRevisionId: input.proposal.sourceRevisionId,
      reason: input.proposal.reason,
      requestId: input.requestId,
      createdAt: input.confirmedAt,
    };
  }
}

class TestClock implements Clock {
  now() {
    return now;
  }
}

class TestIds implements IdGenerator {
  next() {
    return "operationProposal_1";
  }
}

function createApplication() {
  const directory = new TestDirectory();
  const governance = new TestGovernance();
  const executor = new TestExecutor();
  return {
    application: new PromotionApplication({
      directory,
      governance,
      executor,
      clock: new TestClock(),
      ids: new TestIds(),
    }),
    directory,
    governance,
    executor,
  };
}

describe("PromotionApplication", () => {
  it("creates an exact status proposal without publishing", async () => {
    const { application, governance, executor } = createApplication();

    const proposal = await application.proposeStatus(
      { actorId: actor.id, requestId: "req_propose" },
      {
        promotionId: promotion.id,
        status: "active",
        reason: "Start the approved campaign",
      }
    );

    expect(proposal).toMatchObject({
      kind: "promotion_status_update",
      targetType: "promotion",
      targetId: promotion.id,
      targetKey: `promotion:${promotion.id}`,
      targetVersion: promotion.updatedAt.toISOString(),
      beforeValue: { status: "draft" },
      proposedValue: { status: "active" },
      contentHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      expiresAt: new Date("2026-08-05T12:30:00.000Z"),
    });
    expect(governance.proposals).toEqual([proposal]);
    expect(executor.calls).toEqual([]);
  });

  it("rejects an unchanged promotion status", async () => {
    const { application, governance } = createApplication();

    await expect(
      application.proposeStatus(
        { actorId: actor.id, requestId: "req_unchanged" },
        {
          promotionId: promotion.id,
          status: "draft",
          reason: "Keep the campaign draft",
        }
      )
    ).rejects.toMatchObject({ code: "unchanged_promotion" });
    expect(governance.proposals).toEqual([]);
  });

  it("publishes only the exact confirmed proposal", async () => {
    const { application, executor } = createApplication();
    const proposal = await application.proposeStatus(
      { actorId: actor.id, requestId: "req_propose" },
      {
        promotionId: promotion.id,
        status: "active",
        reason: "Start the approved campaign",
      }
    );

    await expect(
      application.publishStatus(actor, {
        proposalId: proposal.id,
        confirmation: {
          action: "accept",
          proposalId: proposal.id,
          contentHash: proposal.contentHash,
          confirmedAt: now,
        },
        requestId: "req_publish",
      })
    ).resolves.toMatchObject({ proposalId: proposal.id });
    expect(executor.calls).toHaveLength(1);
  });

  it("creates a status rollback proposal from history", async () => {
    const { application, governance } = createApplication();
    governance.revisions.push({
      id: "operationRevision_old",
      proposalId: "operationProposal_old",
      kind: "promotion_status_update",
      action: "update",
      actor,
      targetType: "promotion",
      targetId: promotion.id,
      targetKey: `promotion:${promotion.id}`,
      beforeValue: {
        id: promotion.id,
        code: promotion.code,
        type: promotion.type,
        status: "active",
        isAutomatic: promotion.isAutomatic,
        isTaxInclusive: promotion.isTaxInclusive,
        limit: promotion.limit,
        used: promotion.used,
        campaignId: promotion.campaignId,
        createdAt: promotion.createdAt.toISOString(),
        updatedAt: promotion.updatedAt.toISOString(),
      },
      afterValue: {
        id: promotion.id,
        code: promotion.code,
        type: promotion.type,
        status: "draft",
        isAutomatic: promotion.isAutomatic,
        isTaxInclusive: promotion.isTaxInclusive,
        limit: promotion.limit,
        used: promotion.used,
        campaignId: promotion.campaignId,
        createdAt: promotion.createdAt.toISOString(),
        updatedAt: promotion.updatedAt.toISOString(),
      },
      sourceRevisionId: null,
      reason: "Pause the campaign",
      requestId: "req_old",
      createdAt: new Date("2026-08-05T11:00:00.000Z"),
    });

    await expect(
      application.proposeRollback(
        { actorId: actor.id, requestId: "req_rollback" },
        {
          revisionId: "operationRevision_old",
          reason: "Restore the active status",
        }
      )
    ).resolves.toMatchObject({
      kind: "promotion_status_rollback",
      sourceRevisionId: "operationRevision_old",
      proposedValue: { status: "active" },
    });
  });
});
