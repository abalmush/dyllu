import {
  Clock,
  IdGenerator,
  MerchandisingChangeExecutor,
  MerchandisingDirectory,
  OperationGovernanceStore,
} from "../ports";
import { MerchandisingApplication } from "../merchandising-application";
import {
  Actor,
  OperationProposal,
  OperationRevision,
  ProductCategoryDetails,
  ProductCategoryTarget,
} from "../../domain/types";

const now = new Date("2026-08-05T10:00:00.000Z");
const actor: Actor = {
  id: "user_andrei",
  email: "andrei@dyllu.md",
  name: "Andrei",
};
const category: ProductCategoryDetails = {
  id: "pcat_tools",
  name: "Scule de mână",
  handle: "scule-de-mana",
  parentCategoryId: null,
  isActive: true,
  isInternal: false,
  rank: 1,
  updatedAt: new Date("2026-08-05T09:00:00.000Z"),
  products: [
    {
      id: "prod_hammer",
      title: "Ciocan",
      handle: "ciocan",
      status: "published",
      updatedAt: new Date("2026-08-05T08:00:00.000Z"),
    },
  ],
  productCount: 1,
};

class TestDirectory implements MerchandisingDirectory {
  readonly targets = new Map<string, ProductCategoryTarget>([
    [
      "prod_drill",
      {
        productId: "prod_drill",
        productTitle: "Mașină de găurit",
        productHandle: "masina-de-gaurit",
        productStatus: "published",
        productUpdatedAt: new Date("2026-08-05T08:30:00.000Z"),
        assigned: false,
      },
    ],
    [
      "prod_hammer",
      {
        productId: "prod_hammer",
        productTitle: "Ciocan",
        productHandle: "ciocan",
        productStatus: "published",
        productUpdatedAt: new Date("2026-08-05T08:00:00.000Z"),
        assigned: true,
      },
    ],
  ]);

  async listCategories() {
    return { categories: [category], count: 1 };
  }

  async findCategoryById(categoryId: string) {
    return categoryId === category.id ? category : null;
  }

  async listCategoryProducts() {
    return { products: category.products, count: category.productCount };
  }

  async findProductTargets(productIds: string[]) {
    return productIds.flatMap((productId) => {
      const target = this.targets.get(productId);
      return target ? [target] : [];
    });
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

class TestExecutor implements MerchandisingChangeExecutor {
  readonly calls: Parameters<
    MerchandisingChangeExecutor["publishCategoryAssignments"]
  >[0][] = [];

  async publishCategoryAssignments(
    input: Parameters<
      MerchandisingChangeExecutor["publishCategoryAssignments"]
    >[0]
  ) {
    this.calls.push(input);
    return {
      id: "operationRevision_1",
      proposalId: input.proposal.id,
      kind: input.proposal.kind,
      action:
        input.proposal.kind === "category_assignment_rollback"
          ? ("rollback" as const)
          : ("update" as const),
      actor: input.actor,
      targetType: "product_category" as const,
      targetId: category.id,
      targetKey: `product-category:${category.id}`,
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
    application: new MerchandisingApplication({
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

describe("MerchandisingApplication", () => {
  it("creates an exact category assignment proposal without publishing", async () => {
    const { application, governance, executor } = createApplication();

    const proposal = await application.proposeCategoryAssignments(
      { actorId: actor.id, requestId: "req_propose" },
      {
        categoryId: category.id,
        addProductIds: ["prod_drill"],
        removeProductIds: ["prod_hammer"],
        reason: "Move the selected products",
      }
    );

    expect(proposal).toMatchObject({
      kind: "category_assignment_update",
      status: "pending",
      targetType: "product_category",
      targetId: category.id,
      targetKey: `product-category:${category.id}`,
      targetVersion: category.updatedAt.toISOString(),
      beforeValue: {
        category: expect.objectContaining({ id: category.id }),
        products: [
          expect.objectContaining({ productId: "prod_drill", assigned: false }),
          expect.objectContaining({ productId: "prod_hammer", assigned: true }),
        ],
      },
      proposedValue: {
        products: [
          expect.objectContaining({ productId: "prod_drill", assigned: true }),
          expect.objectContaining({
            productId: "prod_hammer",
            assigned: false,
          }),
        ],
      },
      contentHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      expiresAt: new Date("2026-08-05T10:30:00.000Z"),
    });
    expect(governance.proposals).toEqual([proposal]);
    expect(executor.calls).toEqual([]);
  });

  it("rejects an add when the product is already in the category", async () => {
    const { application, governance } = createApplication();

    await expect(
      application.proposeCategoryAssignments(
        { actorId: actor.id, requestId: "req_invalid" },
        {
          categoryId: category.id,
          addProductIds: ["prod_hammer"],
          removeProductIds: [],
          reason: "Add the selected product",
        }
      )
    ).rejects.toMatchObject({ code: "unchanged_category_assignment" });
    expect(governance.proposals).toEqual([]);
  });

  it("publishes only the exact confirmed proposal for its author", async () => {
    const { application, executor } = createApplication();
    const proposal = await application.proposeCategoryAssignments(
      { actorId: actor.id, requestId: "req_propose" },
      {
        categoryId: category.id,
        addProductIds: ["prod_drill"],
        removeProductIds: [],
        reason: "Add the selected product",
      }
    );

    await expect(
      application.publishCategoryAssignments(actor, {
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

  it("creates a rollback proposal from immutable history", async () => {
    const { application, governance } = createApplication();
    governance.revisions.push({
      id: "operationRevision_old",
      proposalId: "operationProposal_old",
      kind: "category_assignment_update",
      action: "update",
      actor,
      targetType: "product_category",
      targetId: category.id,
      targetKey: `product-category:${category.id}`,
      beforeValue: {
        category: {
          id: category.id,
          name: category.name,
          handle: category.handle,
          updatedAt: category.updatedAt.toISOString(),
        },
        products: [
          {
            productId: "prod_drill",
            productTitle: "Mașină de găurit",
            productHandle: "masina-de-gaurit",
            productStatus: "published",
            productUpdatedAt: "2026-08-05T08:30:00.000Z",
            assigned: true,
          },
        ],
      },
      afterValue: {},
      sourceRevisionId: null,
      reason: "Old category change",
      requestId: "req_old",
      createdAt: new Date("2026-08-05T09:30:00.000Z"),
    });

    await expect(
      application.proposeCategoryRollback(
        { actorId: actor.id, requestId: "req_rollback" },
        {
          revisionId: "operationRevision_old",
          reason: "Restore the old assignment",
        }
      )
    ).resolves.toMatchObject({
      kind: "category_assignment_rollback",
      sourceRevisionId: "operationRevision_old",
      proposedValue: {
        products: [
          expect.objectContaining({ productId: "prod_drill", assigned: true }),
        ],
      },
    });
  });
});
