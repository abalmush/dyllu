import { ReturnApplication } from "../return-application";
import {
  Clock,
  IdGenerator,
  OperationGovernanceStore,
  ReturnChangeExecutor,
  ReturnDirectory,
} from "../ports";
import {
  Actor,
  OperationProposal,
  OperationRevision,
  ReturnDetails,
  ReturnOrderTarget,
} from "../../domain/types";

const now = new Date("2026-08-05T13:00:00.000Z");
const actor: Actor = {
  id: "user_andrei",
  email: "andrei@dyllu.md",
  name: "Andrei",
};
const order: ReturnOrderTarget = {
  id: "order_test",
  displayId: 42,
  status: "completed",
  fulfillmentStatus: "fulfilled",
  currencyCode: "mdl",
  updatedAt: new Date("2026-08-05T12:00:00.000Z"),
  items: [
    {
      id: "item_drill",
      title: "Mașină de găurit",
      sku: "DRILL-1",
      quantity: 2,
    },
  ],
};
const existingReturn: ReturnDetails = {
  id: "return_old",
  displayId: 7,
  orderId: order.id,
  status: "requested",
  locationId: null,
  refundAmount: null,
  createdBy: actor.id,
  createdAt: new Date("2026-08-05T11:00:00.000Z"),
  updatedAt: new Date("2026-08-05T11:00:00.000Z"),
  requestedAt: new Date("2026-08-05T11:00:00.000Z"),
  receivedAt: null,
  canceledAt: null,
  items: [
    {
      id: "return_item_old",
      itemId: "item_drill",
      quantity: 1,
      receivedQuantity: 0,
      reasonId: null,
    },
  ],
};

class TestDirectory implements ReturnDirectory {
  async list() {
    return { returns: [existingReturn], count: 1 };
  }

  async findById(returnId: string) {
    return returnId === existingReturn.id ? existingReturn : null;
  }

  async findOrderTarget(reference: string) {
    return reference === "42" || reference === order.id ? order : null;
  }

  async listForOrder() {
    return [existingReturn];
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

  async findRevision() {
    return null;
  }

  async listRevisions(targetKey: string, limit: number) {
    return this.revisions
      .filter((revision) => revision.targetKey === targetKey)
      .slice(0, limit);
  }

  async closeProposal() {}
}

class TestExecutor implements ReturnChangeExecutor {
  readonly creates: Parameters<ReturnChangeExecutor["publishCreate"]>[0][] = [];
  readonly cancels: Parameters<ReturnChangeExecutor["publishCancel"]>[0][] = [];

  async publishCreate(
    input: Parameters<ReturnChangeExecutor["publishCreate"]>[0]
  ) {
    this.creates.push(input);
    return revision(input, "return_new");
  }

  async publishCancel(
    input: Parameters<ReturnChangeExecutor["publishCancel"]>[0]
  ) {
    this.cancels.push(input);
    return revision(input, existingReturn.id);
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

function createApplication(directory: ReturnDirectory = new TestDirectory()) {
  const governance = new TestGovernance();
  const executor = new TestExecutor();
  return {
    application: new ReturnApplication({
      directory,
      governance,
      executor,
      clock: new TestClock(),
      ids: new TestIds(),
    }),
    governance,
    executor,
  };
}

describe("ReturnApplication", () => {
  it("creates an exact return request proposal for the remaining quantity", async () => {
    const { application, governance, executor } = createApplication();

    const proposal = await application.proposeCreate(
      { actorId: actor.id, requestId: "req_return" },
      {
        orderReference: "42",
        items: [
          {
            itemId: "item_drill",
            quantity: 1,
            reasonId: null,
            note: "Unused item",
          },
        ],
        note: "Customer return request",
        reason: "Customer requested a return",
      }
    );

    expect(proposal).toMatchObject({
      kind: "return_request_create",
      targetType: "return",
      targetId: null,
      targetKey: `return-order:${order.id}`,
      targetVersion: order.updatedAt.toISOString(),
      beforeValue: {
        items: [
          expect.objectContaining({
            itemId: "item_drill",
            orderedQuantity: 2,
            alreadyReturnedQuantity: 1,
            requestQuantity: 0,
          }),
        ],
      },
      proposedValue: {
        items: [expect.objectContaining({ requestQuantity: 1 })],
      },
      contentHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    });
    expect(governance.proposals).toEqual([proposal]);
    expect(executor.creates).toEqual([]);
  });

  it("rejects a return above the remaining order quantity", async () => {
    const { application, governance } = createApplication();

    await expect(
      application.proposeCreate(
        { actorId: actor.id, requestId: "req_too_many" },
        {
          orderReference: "42",
          items: [
            {
              itemId: "item_drill",
              quantity: 2,
              reasonId: null,
              note: null,
            },
          ],
          note: null,
          reason: "Customer requested a return",
        }
      )
    ).rejects.toMatchObject({ code: "invalid_return_quantity" });
    expect(governance.proposals).toEqual([]);
  });

  it("rejects duplicate order item IDs after normalization", async () => {
    const { application, governance } = createApplication();

    await expect(
      application.proposeCreate(
        { actorId: actor.id, requestId: "req_duplicate" },
        {
          orderReference: "42",
          items: [
            {
              itemId: "item_drill",
              quantity: 1,
              reasonId: null,
              note: null,
            },
            {
              itemId: " item_drill ",
              quantity: 1,
              reasonId: null,
              note: null,
            },
          ],
          note: null,
          reason: "Customer requested a return",
        }
      )
    ).rejects.toMatchObject({ code: "invalid_return" });
    expect(governance.proposals).toEqual([]);
  });

  it("creates a cancellation proposal without canceling the return", async () => {
    const { application, governance, executor } = createApplication();

    await expect(
      application.proposeCancel(
        { actorId: actor.id, requestId: "req_cancel" },
        {
          returnId: existingReturn.id,
          reason: "Customer withdrew the request",
        }
      )
    ).resolves.toMatchObject({
      kind: "return_cancel",
      targetId: existingReturn.id,
      beforeValue: { status: "requested" },
      proposedValue: { status: "canceled" },
    });
    expect(governance.proposals).toHaveLength(1);
    expect(executor.cancels).toEqual([]);
  });

  it("rejects cancellation after receipt has started", async () => {
    const receivedReturn: ReturnDetails = {
      ...existingReturn,
      status: "partially_received",
      items: [{ ...existingReturn.items[0]!, receivedQuantity: 1 }],
    };
    const directory = {
      findById: jest.fn().mockResolvedValue(receivedReturn),
    } as unknown as ReturnDirectory;
    const { application, governance } = createApplication(directory);

    await expect(
      application.proposeCancel(
        { actorId: actor.id, requestId: "req_received_cancel" },
        {
          returnId: receivedReturn.id,
          reason: "Customer withdrew the request",
        }
      )
    ).rejects.toMatchObject({ code: "return_not_cancelable" });
    expect(governance.proposals).toEqual([]);
  });

  it("publishes only the exact confirmed return proposal", async () => {
    const { application, executor } = createApplication();
    const proposal = await application.proposeCreate(
      { actorId: actor.id, requestId: "req_return" },
      {
        orderReference: "42",
        items: [
          {
            itemId: "item_drill",
            quantity: 1,
            reasonId: null,
            note: null,
          },
        ],
        note: null,
        reason: "Customer requested a return",
      }
    );

    await expect(
      application.publish(actor, {
        proposalId: proposal.id,
        confirmation: {
          action: "accept",
          proposalId: proposal.id,
          contentHash: proposal.contentHash,
          confirmedAt: now,
        },
        requestId: "req_publish",
      })
    ).resolves.toMatchObject({ targetId: "return_new" });
    expect(executor.creates).toHaveLength(1);
  });

  it("rejects confirmation for different return proposal content", async () => {
    const { application, executor } = createApplication();
    const proposal = await application.proposeCreate(
      { actorId: actor.id, requestId: "req_return" },
      {
        orderReference: "42",
        items: [
          {
            itemId: "item_drill",
            quantity: 1,
            reasonId: null,
            note: null,
          },
        ],
        note: null,
        reason: "Customer requested a return",
      }
    );

    await expect(
      application.publish(actor, {
        proposalId: proposal.id,
        confirmation: {
          action: "accept",
          proposalId: proposal.id,
          contentHash: "sha256:different",
          confirmedAt: now,
        },
        requestId: "req_publish_mismatch",
      })
    ).rejects.toMatchObject({ code: "confirmation_mismatch" });
    expect(executor.creates).toEqual([]);
  });
});

function revision(
  input: Parameters<ReturnChangeExecutor["publishCreate"]>[0],
  returnId: string
): OperationRevision {
  return {
    id: "operationRevision_1",
    proposalId: input.proposal.id,
    kind: input.proposal.kind,
    action: "update",
    actor: input.actor,
    targetType: "return",
    targetId: returnId,
    targetKey: `return:${returnId}`,
    beforeValue: input.proposal.beforeValue,
    afterValue: input.proposal.proposedValue,
    sourceRevisionId: null,
    reason: input.proposal.reason,
    requestId: input.requestId,
    createdAt: input.confirmedAt,
  };
}
