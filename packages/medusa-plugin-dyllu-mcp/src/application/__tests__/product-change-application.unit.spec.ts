import {
  Clock,
  GovernanceStore,
  IdGenerator,
  OrderDirectory,
  SaleDirectory,
  OperationGovernanceStore,
  SaleChangeExecutor,
  ProductCatalog,
  ProductChangeExecutor,
  UserDirectory,
  CapabilityStore,
} from "../ports";
import { ProductChangeApplication } from "../product-change-application";
import {
  Actor,
  AuditEvent,
  Capability,
  OrderDetails,
  OrderSummary,
  ProductChangeProposal,
  ProductChangeRevision,
  ProductDescriptionRevision,
  ProductPriceRevision,
  ProductPriceTarget,
  ProductSummary,
  OperationProposal,
  OperationRevision,
  SaleVariantTarget,
  SaleDetails,
} from "../../domain/types";

const now = new Date("2026-07-29T10:00:00.000Z");
const actor: Actor = {
  id: "user_andrei",
  email: "andrei@dyllu.md",
  name: "Andrei",
};
const targetActor: Actor = {
  id: "user_maria",
  email: "maria@dyllu.md",
  name: "Maria",
};
const product: ProductSummary = {
  id: "prod_drill",
  title: "Mașină de găurit",
  handle: "masina-de-gaurit",
  status: "published",
  description: "Descriere veche",
  updatedAt: new Date("2026-07-29T09:00:00.000Z"),
  variants: [
    {
      id: "variant_drill",
      title: "Standard",
      sku: "DRILL-1",
      updatedAt: new Date("2026-07-29T09:00:00.000Z"),
      prices: [
        {
          id: "price_mdl",
          amount: 1500,
          currencyCode: "mdl",
          updatedAt: new Date("2026-07-29T09:00:00.000Z"),
        },
      ],
    },
  ],
};
const priceTarget: ProductPriceTarget = {
  productId: product.id,
  productTitle: product.title,
  variantId: "variant_drill",
  variantTitle: "Standard",
  sku: "DRILL-1",
  priceId: "price_mdl",
  amount: 1500,
  currencyCode: "mdl",
  updatedAt: new Date("2026-07-29T09:00:00.000Z"),
};
const saleTarget: SaleVariantTarget = {
  productId: "prod_tools",
  productTitle: "Trusă de scule",
  variantId: "variant_tools",
  variantTitle: "Standard",
  sku: "DTHS1M28",
  basePriceId: "price_base",
  normalAmount: 429,
  currencyCode: "mdl",
  updatedAt: new Date("2026-07-29T09:00:00.000Z"),
};
const activeSale: SaleDetails = {
  id: "plist_summer",
  title: "Summer sale",
  description: "Selected tools",
  status: "active",
  startsAt: null,
  endsAt: null,
  createdAt: new Date("2026-07-28T09:00:00.000Z"),
  updatedAt: new Date("2026-07-29T09:30:00.000Z"),
  items: [
    {
      priceId: "price_sale",
      productId: saleTarget.productId,
      productTitle: saleTarget.productTitle,
      variantId: saleTarget.variantId,
      variantTitle: saleTarget.variantTitle,
      sku: saleTarget.sku,
      currencyCode: "mdl",
      normalAmount: 429,
      saleAmount: 349,
      minQuantity: null,
      maxQuantity: null,
      hasRules: false,
      updatedAt: new Date("2026-07-29T09:30:00.000Z"),
    },
  ],
};
const order: OrderSummary = {
  id: "order_today",
  displayId: 42,
  status: "pending",
  paymentStatus: "not_paid",
  fulfillmentStatus: "not_fulfilled",
  email: "client@example.com",
  customerId: "cus_client",
  currencyCode: "mdl",
  total: 429,
  itemCount: 1,
  createdAt: new Date("2026-07-29T08:30:00.000Z"),
  updatedAt: new Date("2026-07-29T08:30:00.000Z"),
};
const orderDetails: OrderDetails = {
  ...order,
  subtotal: 429,
  discountTotal: 0,
  shippingTotal: 0,
  taxTotal: 0,
  canceledAt: null,
  shippingAddress: {
    firstName: "Ana",
    lastName: "Client",
    phone: "+37360000000",
    company: null,
    address1: "str. Test 1",
    address2: null,
    city: "Chișinău",
    province: null,
    postalCode: "MD-2001",
    countryCode: "md",
  },
  billingAddress: null,
  items: [
    {
      id: "item_1",
      title: "Trusă de scule",
      variantId: "variant_tools",
      sku: "TOOLS-1",
      quantity: 1,
      unitPrice: 429,
      total: 429,
    },
  ],
  shippingMethods: [],
};

class TestUsers implements UserDirectory {
  async findActiveUser(userId: string) {
    return [actor, targetActor].find((user) => user.id === userId) ?? null;
  }
}

class TestCapabilities implements CapabilityStore {
  readonly replacements: Parameters<CapabilityStore["replaceForUser"]>[0][] =
    [];

  constructor(private readonly values: Capability[]) {}

  async listForUser() {
    return this.values;
  }

  async replaceForUser(
    input: Parameters<CapabilityStore["replaceForUser"]>[0]
  ) {
    this.replacements.push(input);
  }
}

class TestProducts implements ProductCatalog {
  readonly values = new Map([[product.id, product]]);
  readonly searches: Array<{ query: string; limit: number }> = [];
  countCalls = 0;
  private currentPrice = priceTarget;

  changeCurrentPrice(price: ProductPriceTarget) {
    this.currentPrice = price;
  }

  async findById(productId: string) {
    return this.values.get(productId) ?? null;
  }

  async findVariantPrice(
    input: Parameters<ProductCatalog["findVariantPrice"]>[0]
  ) {
    return input.productId === this.currentPrice.productId &&
      input.variantId === this.currentPrice.variantId &&
      input.priceId === this.currentPrice.priceId &&
      input.currencyCode === this.currentPrice.currencyCode
      ? this.currentPrice
      : null;
  }

  async search(input: { query: string; limit: number }) {
    this.searches.push(input);
    return [...this.values.values()];
  }

  async count() {
    this.countCalls += 1;
    return this.values.size;
  }
}

class TestOrders implements OrderDirectory {
  readonly lists: Parameters<OrderDirectory["list"]>[0][] = [];
  readonly references: string[] = [];

  async list(input: Parameters<OrderDirectory["list"]>[0]) {
    this.lists.push(input);
    return { orders: [order], count: 1 };
  }

  async findByReference(reference: string): Promise<OrderDetails | null> {
    this.references.push(reference);
    return reference === String(order.displayId) ? orderDetails : null;
  }
}

class TestSales implements SaleDirectory {
  readonly lists: Parameters<SaleDirectory["list"]>[0][] = [];

  async list(input: Parameters<SaleDirectory["list"]>[0]) {
    this.lists.push(input);
    return { sales: [], count: 0 };
  }

  async findById() {
    return this.sale;
  }

  constructor(
    private readonly targets: SaleVariantTarget[] = [],
    private readonly overlaps: Array<{ saleId: string; variantId: string }> = [],
    private readonly sale: SaleDetails | null = null
  ) {}

  async findVariantTargets() {
    return this.targets;
  }

  async findOverlappingActiveSales() {
    return this.overlaps;
  }
}

class TestOperationGovernance implements OperationGovernanceStore {
  readonly proposals: OperationProposal[] = [];
  readonly revisions: OperationRevision[] = [];

  async createProposal(
    input: Parameters<OperationGovernanceStore["createProposal"]>[0]
  ) {
    this.proposals.push(input.proposal);
  }

  async findProposal(proposalId: string) {
    return this.proposals.find((proposal) => proposal.id === proposalId) ?? null;
  }

  async findRevision(revisionId: string) {
    return this.revisions.find((revision) => revision.id === revisionId) ?? null;
  }

  async listRevisions(targetKey: string, limit: number) {
    return this.revisions
      .filter((revision) => revision.targetKey === targetKey)
      .slice(0, limit);
  }

  async closeProposal() {}
}

class TestSaleExecutor implements SaleChangeExecutor {
  readonly creates: Parameters<SaleChangeExecutor["publishCreate"]>[0][] = [];

  async publishCreate(
    input: Parameters<SaleChangeExecutor["publishCreate"]>[0]
  ) {
    this.creates.push(input);
    return {
      id: "operationRevision_1",
      proposalId: input.proposal.id,
      kind: input.proposal.kind,
      action: "update" as const,
      actor: input.actor,
      targetType: "sale" as const,
      targetId: "plist_summer",
      targetKey: "sale:plist_summer",
      beforeValue: input.proposal.beforeValue,
      afterValue: { ...input.proposal.proposedValue, saleId: "plist_summer" },
      sourceRevisionId: null,
      reason: input.proposal.reason,
      requestId: input.requestId,
      createdAt: input.confirmedAt,
    };
  }


  async publishUpdate(
    input: Parameters<SaleChangeExecutor["publishUpdate"]>[0]
  ) {
    return this.publishCreate(input);
  }
}

class TestGovernance implements GovernanceStore {
  readonly proposals: ProductChangeProposal[] = [];
  readonly revisions: ProductChangeRevision[] = [];
  readonly events: AuditEvent[] = [];

  async createProposal(
    input: Parameters<GovernanceStore["createProposal"]>[0]
  ) {
    for (const proposal of this.proposals) {
      if (
        proposal.actorId === input.proposal.actorId &&
        proposal.productId === input.proposal.productId &&
        proposal.status === "pending"
      ) {
        proposal.status = "superseded";
      }
    }
    this.proposals.push(input.proposal);
    this.events.push({
      id: "event_1",
      name: "proposal.created",
      actorId: input.proposal.actorId,
      targetId: input.proposal.productId,
      proposalId: input.proposal.id,
      revisionId: null,
      requestId: input.requestId,
      details: {
        kind: input.proposal.kind,
        content_hash: input.proposal.contentHash,
      },
      occurredAt: input.proposal.createdAt,
    });
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

  async listRevisions(productId: string) {
    return this.revisions.filter(
      (revision) => revision.productId === productId
    );
  }

  async listEvents(input: Parameters<GovernanceStore["listEvents"]>[0]) {
    return this.events
      .filter(
        (event) =>
          (!input.actorId || event.actorId === input.actorId) &&
          (!input.targetId || event.targetId === input.targetId)
      )
      .slice(0, input.limit);
  }

  async appendEvent(event: AuditEvent) {
    this.events.push(event);
  }

  async closeProposal(input: Parameters<GovernanceStore["closeProposal"]>[0]) {
    const proposal = await this.findProposal(input.proposalId);
    if (proposal?.actorId === input.actorId && proposal.status === "pending") {
      proposal.status = input.status;
      this.events.push({
        id: "event_1",
        name: `proposal.${input.status}`,
        actorId: input.actorId,
        targetId: input.productId,
        proposalId: input.proposalId,
        revisionId: null,
        requestId: input.requestId,
        details: { reason: input.reason },
        occurredAt: input.occurredAt,
      });
    }
  }
}

class TestExecutor implements ProductChangeExecutor {
  readonly calls: Parameters<ProductChangeExecutor["publishDescription"]>[0][] =
    [];
  readonly priceCalls: Parameters<ProductChangeExecutor["publishPrice"]>[0][] =
    [];

  constructor(private readonly failure?: Error) {}

  async publishDescription(
    input: Parameters<ProductChangeExecutor["publishDescription"]>[0]
  ): Promise<ProductDescriptionRevision> {
    this.calls.push(input);
    if (this.failure) {
      throw this.failure;
    }
    return {
      id: "revision_1",
      proposalId: input.proposal.id,
      action:
        input.proposal.kind === "description_rollback" ? "rollback" : "update",
      actor: input.actor,
      productId: input.proposal.productId,
      productTitle: input.proposal.productTitle,
      beforeValue: input.proposal.beforeValue,
      afterValue: input.proposal.proposedValue,
      sourceRevisionId: input.proposal.sourceRevisionId,
      reason: input.proposal.reason,
      requestId: input.requestId,
      createdAt: input.confirmedAt,
      currencyCode: null,
      kind: input.proposal.kind,
      priceId: null,
      variantId: null,
    };
  }

  async publishPrice(
    input: Parameters<ProductChangeExecutor["publishPrice"]>[0]
  ): Promise<ProductPriceRevision> {
    this.priceCalls.push(input);
    return {
      id: "revision_price_1",
      proposalId: input.proposal.id,
      kind: input.proposal.kind,
      action: input.proposal.kind === "price_rollback" ? "rollback" : "update",
      actor: input.actor,
      productId: input.proposal.productId,
      productTitle: input.proposal.productTitle,
      variantId: input.proposal.variantId,
      priceId: input.proposal.priceId,
      currencyCode: input.proposal.currencyCode,
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
  next(
    prefix:
      | "proposal"
      | "revision"
      | "operationProposal"
      | "operationRevision"
      | "event"
  ) {
    return `${prefix}_1`;
  }
}

describe("ProductChangeApplication", () => {
  it("creates an exact sale proposal without publishing it", async () => {
    const target: SaleVariantTarget = {
      productId: "prod_tools",
      productTitle: "Trusă de scule",
      variantId: "variant_tools",
      variantTitle: "Standard",
      sku: "DTHS1M28",
      basePriceId: "price_base",
      normalAmount: 429,
      currencyCode: "mdl",
      updatedAt: new Date("2026-07-29T09:00:00.000Z"),
    };
    const sales = new TestSales([target]);
    const operationGovernance = new TestOperationGovernance();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["sale.update"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      sales,
      operationGovernance,
      governance: new TestGovernance(),
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    const proposal = await application.proposeSaleCreate(
      { actorId: actor.id, requestId: "req_sale_create" },
      {
        title: "August sale",
        description: "Selected tools",
        status: "draft",
        startsAt: "2026-08-01T00:00:00.000Z",
        endsAt: "2026-08-31T23:59:59.000Z",
        items: [{ variantId: target.variantId, saleAmount: 299 }],
        reason: "Prepare the August sale",
      }
    );

    expect(proposal).toMatchObject({
      id: "operationProposal_1",
      kind: "sale_create",
      status: "pending",
      actorId: actor.id,
      targetType: "sale",
      targetId: null,
      targetKey: "sale:new:operationProposal_1",
      beforeValue: {},
      proposedValue: {
        saleId: null,
        title: "August sale",
        description: "Selected tools",
        status: "draft",
        startsAt: "2026-08-01T00:00:00.000Z",
        endsAt: "2026-08-31T23:59:59.000Z",
        items: [
          expect.objectContaining({
            variantId: target.variantId,
            normalAmount: 429,
            saleAmount: 299,
            currencyCode: "mdl",
          }),
        ],
      },
      contentHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      expiresAt: new Date("2026-07-29T10:30:00.000Z"),
    });
    expect(operationGovernance.proposals).toEqual([proposal]);
  });

  it("rejects a sale price that is not below the normal price", async () => {
    const operationGovernance = new TestOperationGovernance();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["sale.update"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      sales: new TestSales([saleTarget]),
      operationGovernance,
      governance: new TestGovernance(),
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.proposeSaleCreate(
        { actorId: actor.id, requestId: "req_invalid_sale_price" },
        {
          title: "Invalid sale",
          description: "Selected tools",
          status: "draft",
          startsAt: null,
          endsAt: null,
          items: [
            {
              variantId: saleTarget.variantId,
              saleAmount: saleTarget.normalAmount,
            },
          ],
          reason: "Check invalid price",
        }
      )
    ).rejects.toMatchObject({ code: "invalid_sale_price" });
    expect(operationGovernance.proposals).toEqual([]);
  });

  it("rejects a sale that overlaps another active sale", async () => {
    const operationGovernance = new TestOperationGovernance();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["sale.update"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      sales: new TestSales([saleTarget], [
        { saleId: "plist_existing", variantId: saleTarget.variantId },
      ]),
      operationGovernance,
      governance: new TestGovernance(),
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.proposeSaleCreate(
        { actorId: actor.id, requestId: "req_overlapping_sale" },
        {
          title: "Overlapping sale",
          description: "Selected tools",
          status: "active",
          startsAt: null,
          endsAt: null,
          items: [{ variantId: saleTarget.variantId, saleAmount: 299 }],
          reason: "Check sale overlap",
        }
      )
    ).rejects.toMatchObject({ code: "sale_overlap" });
    expect(operationGovernance.proposals).toEqual([]);
  });

  it("denies sale proposals without sale.update", async () => {
    const governance = new TestGovernance();
    const operationGovernance = new TestOperationGovernance();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities([]),
      products: new TestProducts(),
      orders: new TestOrders(),
      sales: new TestSales([saleTarget]),
      operationGovernance,
      governance,
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.proposeSaleCreate(
        { actorId: actor.id, requestId: "req_denied_sale_create" },
        {
          title: "August sale",
          description: "Selected tools",
          status: "draft",
          startsAt: null,
          endsAt: null,
          items: [{ variantId: saleTarget.variantId, saleAmount: 299 }],
          reason: "Prepare the August sale",
        }
      )
    ).rejects.toMatchObject({ code: "capability_denied" });
    expect(operationGovernance.proposals).toEqual([]);
    expect(governance.events).toEqual([
      expect.objectContaining({
        name: "authorization.denied",
        targetId: "sale:new",
        details: {
          capability: "sale.update",
          reason: "capability_denied",
        },
      }),
    ]);
  });

  it("publishes only the exact sale proposal confirmed by its author", async () => {
    const target: SaleVariantTarget = {
      productId: "prod_tools",
      productTitle: "Trusă de scule",
      variantId: "variant_tools",
      variantTitle: "Standard",
      sku: "DTHS1M28",
      basePriceId: "price_base",
      normalAmount: 429,
      currencyCode: "mdl",
      updatedAt: new Date("2026-07-29T09:00:00.000Z"),
    };
    const operationGovernance = new TestOperationGovernance();
    const saleExecutor = new TestSaleExecutor();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["sale.update"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      sales: new TestSales([target]),
      operationGovernance,
      saleExecutor,
      governance: new TestGovernance(),
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });
    const proposal = await application.proposeSaleCreate(
      { actorId: actor.id, requestId: "req_sale_create" },
      {
        title: "August sale",
        description: "Selected tools",
        status: "draft",
        startsAt: null,
        endsAt: null,
        items: [{ variantId: target.variantId, saleAmount: 299 }],
        reason: "Prepare the August sale",
      }
    );

    await expect(
      application.publishSaleChange(
        { actorId: actor.id, requestId: "req_sale_publish" },
        {
          proposalId: proposal.id,
          confirmation: {
            action: "accept",
            proposalId: proposal.id,
            contentHash: proposal.contentHash,
            confirmedAt: now,
          },
        }
      )
    ).resolves.toMatchObject({
      proposalId: proposal.id,
      targetId: "plist_summer",
    });
    expect(saleExecutor.creates).toEqual([
      expect.objectContaining({
        actor,
        proposal,
        requestId: "req_sale_publish",
        confirmedAt: now,
      }),
    ]);
  });

  it("creates an exact proposal to change sale items", async () => {
    const operationGovernance = new TestOperationGovernance();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["sale.update"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      sales: new TestSales([saleTarget], [], activeSale),
      operationGovernance,
      governance: new TestGovernance(),
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    const proposal = await application.proposeSaleItems(
      { actorId: actor.id, requestId: "req_sale_items" },
      {
        saleId: activeSale.id,
        upsert: [{ variantId: saleTarget.variantId, saleAmount: 299 }],
        removeVariantIds: [],
        reason: "Reduce the sale price",
      }
    );

    expect(proposal).toMatchObject({
      kind: "sale_items_update",
      targetId: activeSale.id,
      targetKey: `sale:${activeSale.id}`,
      targetVersion: activeSale.updatedAt.toISOString(),
      beforeValue: {
        items: [expect.objectContaining({ saleAmount: 349 })],
      },
      proposedValue: {
        items: [
          expect.objectContaining({
            salePriceId: "price_sale",
            normalAmount: 429,
            saleAmount: 299,
          }),
        ],
      },
    });
    expect(operationGovernance.proposals).toEqual([proposal]);
  });

  it("creates a safe proposal to end a sale", async () => {
    const operationGovernance = new TestOperationGovernance();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["sale.update"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      sales: new TestSales([saleTarget], [], activeSale),
      operationGovernance,
      governance: new TestGovernance(),
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.proposeSaleStatus(
        { actorId: actor.id, requestId: "req_sale_end" },
        {
          saleId: activeSale.id,
          action: "end",
          reason: "End the summer sale",
        }
      )
    ).resolves.toMatchObject({
      kind: "sale_status_update",
      beforeValue: { status: "active", endsAt: null },
      proposedValue: {
        status: "draft",
        endsAt: "2026-07-29T10:00:00.000Z",
      },
    });
  });

  it("rolls back a created sale by ending it without deleting it", async () => {
    const operationGovernance = new TestOperationGovernance();
    operationGovernance.revisions.push({
      id: "operationRevision_create",
      proposalId: "operationProposal_create",
      kind: "sale_create",
      action: "update",
      actor,
      targetType: "sale",
      targetId: activeSale.id,
      targetKey: `sale:${activeSale.id}`,
      beforeValue: {},
      afterValue: { saleId: activeSale.id },
      sourceRevisionId: null,
      reason: "Create sale",
      requestId: "req_create",
      createdAt: new Date("2026-07-28T10:00:00.000Z"),
    });
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["sale.rollback"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      sales: new TestSales([saleTarget], [], activeSale),
      operationGovernance,
      governance: new TestGovernance(),
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.proposeSaleRollback(
        { actorId: actor.id, requestId: "req_sale_rollback" },
        {
          revisionId: "operationRevision_create",
          reason: "Undo the created sale",
        }
      )
    ).resolves.toMatchObject({
      kind: "sale_rollback",
      sourceRevisionId: "operationRevision_create",
      proposedValue: {
        saleId: activeSale.id,
        status: "draft",
        endsAt: "2026-07-29T10:00:00.000Z",
      },
    });
  });

  it("lists sales for an authorized manager", async () => {
    const sales = new TestSales();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["sale.read"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      sales,
      governance: new TestGovernance(),
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.listSales(
        { actorId: actor.id, requestId: "req_sales" },
        { status: "active", limit: 20, offset: 0 }
      )
    ).resolves.toEqual({ sales: [], count: 0 });
    expect(sales.lists).toEqual([
      { status: "active", limit: 20, offset: 0 },
    ]);
  });

  it("denies sale access without sale.read", async () => {
    const governance = new TestGovernance();
    const sales = new TestSales();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities([]),
      products: new TestProducts(),
      orders: new TestOrders(),
      sales,
      governance,
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.listSales(
        { actorId: actor.id, requestId: "req_denied_sales" },
        { limit: 20, offset: 0 }
      )
    ).rejects.toMatchObject({ code: "capability_denied" });
    expect(sales.lists).toEqual([]);
    expect(governance.events).toEqual([
      expect.objectContaining({
        name: "authorization.denied",
        targetId: "sales",
        details: {
          capability: "sale.read",
          reason: "capability_denied",
        },
      }),
    ]);
  });

  it("lists orders for one DYLLU calendar date for an authorized manager", async () => {
    const orders = new TestOrders();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["order.read"]),
      products: new TestProducts(),
      orders,
      governance: new TestGovernance(),
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.listOrders(
        { actorId: actor.id, requestId: "req_orders_today" },
        {
          localDate: "2026-07-29",
          timeZone: "Europe/Chisinau",
          limit: 20,
          offset: 0,
        }
      )
    ).resolves.toEqual({ orders: [order], count: 1 });
    expect(orders.lists).toEqual([
      {
        localDate: "2026-07-29",
        timeZone: "Europe/Chisinau",
        limit: 20,
        offset: 0,
      },
    ]);
  });

  it("returns complete order details by DYLLU order number", async () => {
    const orders = new TestOrders();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["order.read"]),
      products: new TestProducts(),
      orders,
      governance: new TestGovernance(),
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.getOrder(
        { actorId: actor.id, requestId: "req_order_details" },
        "42"
      )
    ).resolves.toEqual(orderDetails);
    expect(orders.references).toEqual(["42"]);
  });

  it("reports a missing DYLLU order without leaking platform terminology", async () => {
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["order.read"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      governance: new TestGovernance(),
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.getOrder(
        { actorId: actor.id, requestId: "req_missing_order" },
        "999"
      )
    ).rejects.toMatchObject({
      code: "order_not_found",
      message: "DYLLU order 999 was not found",
    });
  });

  it("denies and audits order access without order.read", async () => {
    const governance = new TestGovernance();
    const orders = new TestOrders();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["product.read"]),
      products: new TestProducts(),
      orders,
      governance,
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.getOrder(
        { actorId: actor.id, requestId: "req_denied_order" },
        "42"
      )
    ).rejects.toMatchObject({ code: "capability_denied" });
    expect(orders.references).toEqual([]);
    expect(governance.events).toEqual([
      expect.objectContaining({
        name: "authorization.denied",
        details: {
          capability: "order.read",
          reason: "capability_denied",
        },
      }),
    ]);
  });

  it("reports the authenticated manager and exact capabilities", async () => {
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities([
        "product.read",
        "product_content.update",
      ]),
      products: new TestProducts(),
      orders: new TestOrders(),
      governance: new TestGovernance(),
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.getMyAccess({
        actorId: actor.id,
        requestId: "req_access",
      })
    ).resolves.toEqual({
      actor,
      capabilities: ["product.read", "product_content.update"],
    });
  });

  it("lets only a capability manager inspect and replace another user's grants", async () => {
    const capabilityStore = new TestCapabilities(["capability.manage"]);
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: capabilityStore,
      products: new TestProducts(),
      orders: new TestOrders(),
      governance: new TestGovernance(),
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });
    const context = { actorId: actor.id, requestId: "req_access_admin" };

    await expect(
      application.getUserAccess(context, targetActor.id)
    ).resolves.toEqual({
      actor: targetActor,
      capabilities: ["capability.manage"],
    });
    await expect(
      application.replaceUserAccess(context, {
        userId: targetActor.id,
        capabilities: ["product.read", "product_content.update"],
      })
    ).resolves.toEqual({
      actor: targetActor,
      capabilities: ["product.read", "product_content.update"],
    });
    expect(capabilityStore.replacements).toEqual([
      {
        actorId: actor.id,
        userId: targetActor.id,
        capabilities: ["product.read", "product_content.update"],
        requestId: context.requestId,
        occurredAt: now,
      },
    ]);
  });

  it("returns bounded audit events to an audit reader", async () => {
    const governance = new TestGovernance();
    governance.events.push({
      id: "event_access",
      name: "capabilities.updated",
      actorId: actor.id,
      targetId: targetActor.id,
      proposalId: null,
      revisionId: null,
      requestId: "req_access",
      details: {
        before: "product.read",
        after: "product.read,product_content.update",
      },
      occurredAt: now,
    });
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["audit.read"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      governance,
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.listAuditEvents(
        { actorId: actor.id, requestId: "req_audit" },
        { targetId: targetActor.id, limit: 20 }
      )
    ).resolves.toEqual(governance.events);
  });

  it("searches a bounded product projection for an authorized manager", async () => {
    const products = new TestProducts();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["product.read"]),
      products,
      orders: new TestOrders(),
      governance: new TestGovernance(),
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.searchProducts(
        { actorId: actor.id, requestId: "req_search" },
        { query: "găurit", limit: 10 }
      )
    ).resolves.toEqual([product]);
    expect(products.searches).toEqual([{ query: "găurit", limit: 10 }]);
  });

  it("returns the exact product count for an authorized manager", async () => {
    const products = new TestProducts();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["product.read"]),
      products,
      orders: new TestOrders(),
      governance: new TestGovernance(),
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.countProducts({
        actorId: actor.id,
        requestId: "req_product_count",
      })
    ).resolves.toEqual({ count: 1 });
    expect(products.countCalls).toBe(1);
  });

  it("denies and audits product count access without product.read", async () => {
    const products = new TestProducts();
    const governance = new TestGovernance();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities([]),
      products,
      orders: new TestOrders(),
      governance,
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.countProducts({
        actorId: actor.id,
        requestId: "req_denied_product_count",
      })
    ).rejects.toMatchObject({ code: "capability_denied" });
    expect(products.countCalls).toBe(0);
    expect(governance.events).toEqual([
      expect.objectContaining({
        name: "authorization.denied",
        targetId: "catalog",
        details: {
          capability: "product.read",
          reason: "capability_denied",
        },
      }),
    ]);
  });

  it("creates a reviewable proposal without changing the product", async () => {
    const products = new TestProducts();
    const governance = new TestGovernance();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["product_content.update"]),
      products,
      orders: new TestOrders(),
      governance,
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    const proposal = await application.proposeDescription(
      { actorId: actor.id, requestId: "req_1" },
      {
        productId: product.id,
        proposedDescription: "Descriere nouă și verificată",
        reason: "Clarificarea beneficiilor produsului",
      }
    );

    expect(proposal).toMatchObject({
      id: "proposal_1",
      status: "pending",
      actorId: actor.id,
      productId: product.id,
      beforeValue: "Descriere veche",
      proposedValue: "Descriere nouă și verificată",
      reason: "Clarificarea beneficiilor produsului",
    });
    expect(products.values.get(product.id)?.description).toBe(
      "Descriere veche"
    );
    expect(governance.proposals).toEqual([proposal]);
    expect(governance.events).toEqual([
      expect.objectContaining({
        name: "proposal.created",
        actorId: actor.id,
        proposalId: proposal.id,
      }),
    ]);
  });

  it("creates an MDL price proposal without changing the current price", async () => {
    const products = new TestProducts();
    const governance = new TestGovernance();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["product_price.update"]),
      products,
      orders: new TestOrders(),
      governance,
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    const proposal = await application.proposePrice(
      { actorId: actor.id, requestId: "req_price" },
      {
        productId: product.id,
        variantId: priceTarget.variantId,
        priceId: priceTarget.priceId,
        currencyCode: "mdl",
        proposedAmount: 1799,
        reason: "Approved retail price correction",
      }
    );

    expect(proposal).toMatchObject({
      kind: "price_update",
      status: "pending",
      actorId: actor.id,
      productId: product.id,
      variantId: priceTarget.variantId,
      priceId: priceTarget.priceId,
      currencyCode: "mdl",
      beforeValue: "1500",
      proposedValue: "1799",
    });
    expect(priceTarget.amount).toBe(1500);
    expect(governance.proposals).toEqual([proposal]);
  });

  it("publishes only the exact price proposal confirmed by its author", async () => {
    const executor = new TestExecutor();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["product_price.update"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      governance: new TestGovernance(),
      executor,
      clock: new TestClock(),
      ids: new TestIds(),
    });
    const context = { actorId: actor.id, requestId: "req_price_publish" };
    const proposal = await application.proposePrice(context, {
      productId: product.id,
      variantId: priceTarget.variantId,
      priceId: priceTarget.priceId,
      currencyCode: "mdl",
      proposedAmount: 1799,
      reason: "Approved retail price correction",
    });

    const revision = await application.publishPrice(context, {
      proposalId: proposal.id,
      confirmation: {
        action: "accept",
        proposalId: proposal.id,
        contentHash: proposal.contentHash,
        confirmedAt: now,
      },
    });

    expect(revision).toMatchObject({
      kind: "price_update",
      beforeValue: "1500",
      afterValue: "1799",
      currencyCode: "mdl",
      variantId: priceTarget.variantId,
    });
    expect(executor.priceCalls).toHaveLength(1);
  });

  it("fails a confirmed price proposal if the current price changed", async () => {
    const products = new TestProducts();
    const governance = new TestGovernance();
    const executor = new TestExecutor();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["product_price.update"]),
      products,
      orders: new TestOrders(),
      governance,
      executor,
      clock: new TestClock(),
      ids: new TestIds(),
    });
    const context = { actorId: actor.id, requestId: "req_price_stale" };
    const proposal = await application.proposePrice(context, {
      productId: product.id,
      variantId: priceTarget.variantId,
      priceId: priceTarget.priceId,
      currencyCode: "mdl",
      proposedAmount: 1799,
      reason: "Approved retail price correction",
    });
    products.changeCurrentPrice({
      ...priceTarget,
      amount: 1599,
      updatedAt: new Date("2026-07-29T09:30:00.000Z"),
    });

    await expect(
      application.publishPrice(context, {
        proposalId: proposal.id,
        confirmation: {
          action: "accept",
          proposalId: proposal.id,
          contentHash: proposal.contentHash,
          confirmedAt: now,
        },
      })
    ).rejects.toMatchObject({ code: "stale_price" });

    expect(executor.priceCalls).toHaveLength(0);
    expect(proposal.status).toBe("failed");
    expect(governance.events).toContainEqual(
      expect.objectContaining({
        name: "proposal.failed",
        proposalId: proposal.id,
        details: { reason: "price_changed_after_proposal" },
      })
    );
  });

  it("creates a price rollback as a new proposal", async () => {
    const governance = new TestGovernance();
    governance.revisions.push({
      id: "revision_price_history",
      proposalId: "proposal_price_history",
      kind: "price_update",
      action: "update",
      actor,
      productId: product.id,
      productTitle: product.title,
      variantId: priceTarget.variantId,
      priceId: priceTarget.priceId,
      currencyCode: "mdl",
      beforeValue: "1299",
      afterValue: "1500",
      sourceRevisionId: null,
      reason: "Previous price update",
      requestId: "req_price_history",
      createdAt: new Date("2026-07-28T10:00:00.000Z"),
    });
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["product.rollback"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      governance,
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    const proposal = await application.proposePriceRollback(
      { actorId: actor.id, requestId: "req_price_rollback" },
      {
        revisionId: "revision_price_history",
        reason: "Restore the previously approved price",
      }
    );

    expect(proposal).toMatchObject({
      kind: "price_rollback",
      beforeValue: "1500",
      proposedValue: "1299",
      sourceRevisionId: "revision_price_history",
      variantId: priceTarget.variantId,
      currencyCode: "mdl",
    });
    expect(priceTarget.amount).toBe(1500);
  });

  it("denies and audits a proposal without the required capability", async () => {
    const governance = new TestGovernance();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["product.read"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      governance,
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.proposeDescription(
        { actorId: actor.id, requestId: "req_denied" },
        {
          productId: product.id,
          proposedDescription: "Descriere nouă",
          reason: "Corectură",
        }
      )
    ).rejects.toMatchObject({ code: "capability_denied" });

    expect(governance.proposals).toHaveLength(0);
    expect(governance.events).toEqual([
      expect.objectContaining({
        name: "authorization.denied",
        actorId: actor.id,
        targetId: product.id,
        requestId: "req_denied",
        details: {
          capability: "product_content.update",
          reason: "capability_denied",
        },
      }),
    ]);
  });

  it("denies and audits a price proposal without price capability", async () => {
    const governance = new TestGovernance();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["product_content.update"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      governance,
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    await expect(
      application.proposePrice(
        { actorId: actor.id, requestId: "req_price_denied" },
        {
          productId: product.id,
          variantId: priceTarget.variantId,
          priceId: priceTarget.priceId,
          currencyCode: "mdl",
          proposedAmount: 1799,
          reason: "Approved retail price correction",
        }
      )
    ).rejects.toMatchObject({ code: "capability_denied" });

    expect(governance.proposals).toHaveLength(0);
    expect(governance.events).toContainEqual(
      expect.objectContaining({
        name: "authorization.denied",
        targetId: product.id,
        details: {
          capability: "product_price.update",
          reason: "capability_denied",
        },
      })
    );
  });

  it("publishes only the exact proposal confirmed by the user", async () => {
    const executor = new TestExecutor();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["product_content.update"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      governance: new TestGovernance(),
      executor,
      clock: new TestClock(),
      ids: new TestIds(),
    });
    const context = { actorId: actor.id, requestId: "req_publish" };
    const proposal = await application.proposeDescription(context, {
      productId: product.id,
      proposedDescription: "Descriere publicabilă",
      reason: "Corectură aprobată",
    });

    const revision = await application.publishDescription(context, {
      proposalId: proposal.id,
      confirmation: {
        action: "accept",
        proposalId: proposal.id,
        contentHash: proposal.contentHash,
        confirmedAt: now,
      },
    });

    expect(revision).toMatchObject({
      proposalId: proposal.id,
      action: "update",
      beforeValue: "Descriere veche",
      afterValue: "Descriere publicabilă",
      actor,
    });
    expect(executor.calls).toEqual([
      {
        actor,
        proposal,
        requestId: context.requestId,
        confirmedAt: now,
      },
    ]);
  });

  it("rejects confirmation for different proposal content", async () => {
    const executor = new TestExecutor();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["product_content.update"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      governance: new TestGovernance(),
      executor,
      clock: new TestClock(),
      ids: new TestIds(),
    });
    const context = { actorId: actor.id, requestId: "req_mismatch" };
    const proposal = await application.proposeDescription(context, {
      productId: product.id,
      proposedDescription: "Descriere publicabilă",
      reason: "Corectură",
    });

    await expect(
      application.publishDescription(context, {
        proposalId: proposal.id,
        confirmation: {
          action: "accept",
          proposalId: proposal.id,
          contentHash: "sha256:different",
          confirmedAt: now,
        },
      })
    ).rejects.toMatchObject({ code: "confirmation_mismatch" });

    expect(executor.calls).toHaveLength(0);
  });

  it("records a manager declining a pending proposal", async () => {
    const governance = new TestGovernance();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["product_content.update"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      governance,
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });
    const context = { actorId: actor.id, requestId: "req_reject" };
    const proposal = await application.proposeDescription(context, {
      productId: product.id,
      proposedDescription: "Descriere respinsă",
      reason: "Variantă de revizuit",
    });

    await expect(
      application.rejectProposal(context, proposal.id)
    ).resolves.toEqual({
      proposalId: proposal.id,
      status: "rejected",
    });

    expect(proposal.status).toBe("rejected");
    expect(governance.events).toContainEqual(
      expect.objectContaining({
        name: "proposal.rejected",
        proposalId: proposal.id,
        requestId: context.requestId,
      })
    );
  });

  it("marks a proposal failed when publishing cannot complete", async () => {
    const governance = new TestGovernance();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["product_content.update"]),
      products: new TestProducts(),
      orders: new TestOrders(),
      governance,
      executor: new TestExecutor(new Error("workflow failed")),
      clock: new TestClock(),
      ids: new TestIds(),
    });
    const context = { actorId: actor.id, requestId: "req_failed" };
    const proposal = await application.proposeDescription(context, {
      productId: product.id,
      proposedDescription: "Descriere care nu poate fi publicată",
      reason: "Corectură",
    });

    await expect(
      application.publishDescription(context, {
        proposalId: proposal.id,
        confirmation: {
          action: "accept",
          proposalId: proposal.id,
          contentHash: proposal.contentHash,
          confirmedAt: now,
        },
      })
    ).rejects.toThrow("workflow failed");

    expect(proposal.status).toBe("failed");
    expect(governance.events).toContainEqual(
      expect.objectContaining({
        name: "proposal.failed",
        proposalId: proposal.id,
      })
    );
  });

  it("creates rollback as a new proposal without rewriting history", async () => {
    const products = new TestProducts();
    products.values.set(product.id, {
      ...product,
      description: "Descriere publicată",
      updatedAt: new Date("2026-07-29T09:30:00.000Z"),
    });
    const governance = new TestGovernance();
    governance.revisions.push({
      id: "revision_original",
      proposalId: "proposal_original",
      kind: "description_update",
      action: "update",
      actor,
      productId: product.id,
      productTitle: product.title,
      variantId: null,
      priceId: null,
      currencyCode: null,
      beforeValue: "Descriere veche",
      afterValue: "Descriere publicată",
      sourceRevisionId: null,
      reason: "Prima corectură",
      requestId: "req_original",
      createdAt: new Date("2026-07-29T09:30:00.000Z"),
    });
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["product.rollback"]),
      products,
      orders: new TestOrders(),
      governance,
      executor: new TestExecutor(),
      clock: new TestClock(),
      ids: new TestIds(),
    });

    const proposal = await application.proposeRollback(
      { actorId: actor.id, requestId: "req_rollback" },
      {
        revisionId: "revision_original",
        reason: "Revenire la formularea verificată",
      }
    );

    expect(proposal).toMatchObject({
      kind: "description_rollback",
      beforeValue: "Descriere publicată",
      proposedValue: "Descriere veche",
      sourceRevisionId: "revision_original",
      status: "pending",
    });
    expect(governance.revisions).toHaveLength(1);
    expect(products.values.get(product.id)?.description).toBe(
      "Descriere publicată"
    );
  });

  it("publishes a confirmed rollback with the rollback capability", async () => {
    const products = new TestProducts();
    products.values.set(product.id, {
      ...product,
      description: "Descriere publicată",
      updatedAt: new Date("2026-07-29T09:30:00.000Z"),
    });
    const governance = new TestGovernance();
    governance.revisions.push({
      id: "revision_original",
      proposalId: "proposal_original",
      kind: "description_update",
      action: "update",
      actor,
      productId: product.id,
      productTitle: product.title,
      variantId: null,
      priceId: null,
      currencyCode: null,
      beforeValue: "Descriere veche",
      afterValue: "Descriere publicată",
      sourceRevisionId: null,
      reason: "Prima corectură",
      requestId: "req_original",
      createdAt: new Date("2026-07-29T09:30:00.000Z"),
    });
    const executor = new TestExecutor();
    const application = new ProductChangeApplication({
      users: new TestUsers(),
      capabilities: new TestCapabilities(["product.rollback"]),
      products,
      orders: new TestOrders(),
      governance,
      executor,
      clock: new TestClock(),
      ids: new TestIds(),
    });
    const context = { actorId: actor.id, requestId: "req_rollback" };
    const proposal = await application.proposeRollback(context, {
      revisionId: "revision_original",
      reason: "Revenire",
    });

    const revision = await application.publishDescription(context, {
      proposalId: proposal.id,
      confirmation: {
        action: "accept",
        proposalId: proposal.id,
        contentHash: proposal.contentHash,
        confirmedAt: now,
      },
    });

    expect(revision).toMatchObject({
      action: "rollback",
      sourceRevisionId: "revision_original",
    });
    expect(executor.calls).toHaveLength(1);
  });
});
