import { deriveItemApplyStatus } from "../apply-status";

describe("deriveItemApplyStatus", () => {
  it("reports not_applied when there are no records", () => {
    expect(deriveItemApplyStatus([])).toBe("not_applied");
  });

  it("reports applied when every field applied cleanly", () => {
    expect(
      deriveItemApplyStatus([
        { field: "regular_price_mdl", status: "applied" },
        { field: "balance", status: "applied" },
      ])
    ).toBe("applied");
  });

  it("reports flagged when any field was flagged", () => {
    expect(
      deriveItemApplyStatus([
        { field: "regular_price_mdl", status: "applied" },
        { field: "balance", status: "flagged" },
      ])
    ).toBe("flagged");
  });

  it("reports failed when any field failed, even if others applied", () => {
    expect(
      deriveItemApplyStatus([
        { field: "regular_price_mdl", status: "applied" },
        { field: "balance", status: "failed" },
        { field: "sale_price_mdl", status: "flagged" },
      ])
    ).toBe("failed");
  });
});
