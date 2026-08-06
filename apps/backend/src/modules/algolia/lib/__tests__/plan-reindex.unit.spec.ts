import { planReindex, type ReindexInput } from "../plan-reindex";

const base: ReindexInput = {
  id: "prod_1",
  updatedAt: new Date("2026-08-01T00:00:00Z"),
  deletedAt: null,
  variants: [
    {
      updatedAt: new Date("2026-08-01T00:00:00Z"),
      prices: [{ updatedAt: new Date("2026-08-01T00:00:00Z") }],
    },
  ],
};

describe("planReindex", () => {
  it("upserts a product whose product.updated_at is newer than last sync", () => {
    const { toUpsert, toDelete } = planReindex(
      [base],
      new Date("2026-07-31T00:00:00Z")
    );
    expect(toUpsert.map((p) => p.id)).toEqual(["prod_1"]);
    expect(toDelete).toEqual([]);
  });

  it("upserts a product whose only change is a price timestamp", () => {
    const product: ReindexInput = {
      ...base,
      updatedAt: new Date("2026-07-01T00:00:00Z"),
      variants: [
        {
          updatedAt: new Date("2026-07-01T00:00:00Z"),
          prices: [{ updatedAt: new Date("2026-08-02T00:00:00Z") }],
        },
      ],
    };
    const { toUpsert } = planReindex([product], new Date("2026-08-01T00:00:00Z"));
    expect(toUpsert.map((p) => p.id)).toEqual(["prod_1"]);
  });

  it("skips a product with no changes since last sync", () => {
    const { toUpsert, toDelete } = planReindex(
      [base],
      new Date("2026-08-02T00:00:00Z")
    );
    expect(toUpsert).toEqual([]);
    expect(toDelete).toEqual([]);
  });

  it("deletes a product soft-deleted after last sync, and does not also upsert it", () => {
    const product: ReindexInput = {
      ...base,
      deletedAt: new Date("2026-08-02T00:00:00Z"),
    };
    const { toUpsert, toDelete } = planReindex(
      [product],
      new Date("2026-08-01T00:00:00Z")
    );
    expect(toUpsert).toEqual([]);
    expect(toDelete.map((p) => p.id)).toEqual(["prod_1"]);
  });

  it("ignores a product deleted before the last sync (already handled)", () => {
    const product: ReindexInput = {
      ...base,
      deletedAt: new Date("2026-07-01T00:00:00Z"),
    };
    const { toUpsert, toDelete } = planReindex(
      [product],
      new Date("2026-08-01T00:00:00Z")
    );
    expect(toUpsert).toEqual([]);
    expect(toDelete).toEqual([]);
  });
});
