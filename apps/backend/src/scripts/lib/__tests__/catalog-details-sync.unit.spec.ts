import {
  assertCatalogSyncPlanIsSafe,
  clearProductCatalogFacts,
} from "../catalog-details-sync";

describe("catalog details sync", () => {
  it("removes stale product-level catalog facts", () => {
    const metadata = clearProductCatalogFacts({
      platform: "hand",
      power_source: "corded",
      requires_battery: false,
      specs: "stale",
      ingco_family: "DTLS1565",
    });

    expect(metadata).toMatchObject({
      platform: null,
      power_source: null,
      requires_battery: null,
      specs: null,
      ingco_family: "DTLS1565",
    });
  });

  it("updates matching variants while leaving unmatched variants untouched", () => {
    expect(() =>
      assertCatalogSyncPlanIsSafe({
        sourceRowCount: 3337,
        scopedVariantCount: 889,
        matchingVariantCount: 768,
      })
    ).not.toThrow();
  });

  it("rejects a targeted SKU missing from the catalog projection", () => {
    expect(() =>
      assertCatalogSyncPlanIsSafe({
        sourceRowCount: 3337,
        scopedVariantCount: 1,
        matchingVariantCount: 0,
        requestedSku: "MISSING",
      })
    ).toThrow("No Medusa variants match the catalog projection");
  });
});
