import { ApplyOneCUpdatesApplication } from "../apply-one-c-updates";

function buildDeps(overrides: Partial<Record<string, unknown>> = {}) {
  const workflowCalls: unknown[] = [];
  return {
    store: {
      listItems: jest.fn().mockResolvedValue([
        {
          id: "onecitem_1",
          runId: "onecrun_1",
          medusaVariantId: "variant_1",
          normalized: { regularPriceMdl: 799, salePriceMdl: null, balance: 10 },
        },
      ]),
      createAppliedChanges: jest.fn().mockResolvedValue(undefined),
      ...((overrides.store as object) ?? {}),
    },
    applyReader: {
      getVariantForApply: jest.fn().mockResolvedValue({
        variantId: "variant_1",
        productId: "product_1",
        regularPrice: { id: "price_1", amount: 799 },
        salePriceListEntry: null,
        inventoryItemId: "inv_1",
        stockedQuantity: 10,
      }),
      ensureSalePriceList: jest.fn().mockResolvedValue("plist_1"),
      ...((overrides.applyReader as object) ?? {}),
    },
    runWorkflow: jest.fn(async (input: unknown) => {
      workflowCalls.push(input);
    }),
    stockLocationId: "sloc_1",
    ids: { next: jest.fn(() => "onecapplied_1") },
    clock: { now: () => new Date("2026-08-06T12:00:00Z") },
    workflowCalls,
  };
}

describe("ApplyOneCUpdatesApplication", () => {
  it("skips items with no change and does not invoke the workflow", async () => {
    const deps = buildDeps();
    const app = new ApplyOneCUpdatesApplication(deps as never);

    const result = await app.applyRun({ runId: "onecrun_1", actorId: "user_1" });

    expect(deps.workflowCalls).toHaveLength(0);
    expect(result.appliedCount).toBe(0);
    expect(result.flaggedCount).toBe(0);
  });

  it("applies a within-threshold price change and records an audit row", async () => {
    const deps = buildDeps({
      store: {
        listItems: jest.fn().mockResolvedValue([
          {
            id: "onecitem_1",
            runId: "onecrun_1",
            medusaVariantId: "variant_1",
            normalized: { regularPriceMdl: 850, salePriceMdl: null, balance: 10 },
          },
        ]),
      },
    });
    const app = new ApplyOneCUpdatesApplication(deps as never);

    const result = await app.applyRun({ runId: "onecrun_1", actorId: "user_1" });

    expect(deps.workflowCalls).toHaveLength(1);
    expect(result.appliedCount).toBe(1);
    expect(deps.store.createAppliedChanges).toHaveBeenCalledWith([
      expect.objectContaining({ field: "regular_price_mdl", status: "applied" }),
    ]);
  });

  it("flags a beyond-threshold price change instead of applying it", async () => {
    const deps = buildDeps({
      store: {
        listItems: jest.fn().mockResolvedValue([
          {
            id: "onecitem_1",
            runId: "onecrun_1",
            medusaVariantId: "variant_1",
            normalized: { regularPriceMdl: 2000, salePriceMdl: null, balance: 10 },
          },
        ]),
      },
    });
    const app = new ApplyOneCUpdatesApplication(deps as never);

    const result = await app.applyRun({ runId: "onecrun_1", actorId: "user_1" });

    expect(deps.workflowCalls).toHaveLength(0);
    expect(result.flaggedCount).toBe(1);
    expect(deps.store.createAppliedChanges).toHaveBeenCalledWith([
      expect.objectContaining({ field: "regular_price_mdl", status: "flagged" }),
    ]);
  });

  it("removes a stale sale price when 1C no longer reports a sale", async () => {
    const deps = buildDeps({
      store: {
        listItems: jest.fn().mockResolvedValue([
          {
            id: "onecitem_1",
            runId: "onecrun_1",
            medusaVariantId: "variant_1",
            normalized: { regularPriceMdl: 799, salePriceMdl: null, balance: 10 },
          },
        ]),
      },
      applyReader: {
        getVariantForApply: jest.fn().mockResolvedValue({
          variantId: "variant_1",
          productId: "product_1",
          regularPrice: { id: "price_1", amount: 799 },
          salePriceListEntry: { id: "sale_price_1", amount: 699 },
          inventoryItemId: "inv_1",
          stockedQuantity: 10,
        }),
      },
    });
    const app = new ApplyOneCUpdatesApplication(deps as never);

    const result = await app.applyRun({ runId: "onecrun_1", actorId: "user_1" });

    expect(deps.workflowCalls).toHaveLength(1);
    expect(deps.workflowCalls[0]).toMatchObject({
      salePlan: { action: "remove", priceId: "sale_price_1" },
    });
    expect(result.appliedCount).toBe(1);
    expect(deps.store.createAppliedChanges).toHaveBeenCalledWith([
      expect.objectContaining({ field: "sale_price_mdl", status: "applied" }),
    ]);
  });
});
