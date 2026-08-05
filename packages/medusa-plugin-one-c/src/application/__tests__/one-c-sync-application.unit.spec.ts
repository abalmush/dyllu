import { OneCSyncApplication } from "../one-c-sync-application";

describe("OneCSyncApplication", () => {
  it("stores a read-only run and classifies products missing from Medusa", async () => {
    const stored = {
      runs: [] as unknown[],
      snapshots: [] as unknown[],
      items: [] as unknown[],
    };
    const application = new OneCSyncApplication({
      feeds: {
        fetchCatalog: async () => ({
          outboundIp: "138.199.235.8",
          snapshots: [
            {
              endpoint: "products",
              batch: 1,
              url: "http://135.181.211.55/polim/hs/WebAPI/pit_site_products?batch=1",
              rawBody: '{"Items":[{"id":"SKU-404"}]}',
              data: {
                Items: [
                  {
                    id: "SKU-404",
                    name_ro: "Produs nou",
                    BrandId: "brand-dyllu",
                    Prices: [{ typeId: "05", value: 250 }],
                  },
                  { name_ro: "Invalid", BrandId: "brand-dyllu" },
                ],
              },
              statusCode: 200,
              elapsedMs: 20,
            },
            {
              endpoint: "brands",
              batch: null,
              url: "http://135.181.211.55/polim/hs/WebAPI/pit_site_brands",
              rawBody: '{"Items":[{"id":"brand-dyllu","name":"DYLLU"}]}',
              data: { Items: [{ id: "brand-dyllu", name: "DYLLU" }] },
              statusCode: 200,
              elapsedMs: 20,
            },
          ],
        }),
      },
      catalog: { listVariants: async () => [] },
      store: {
        createRun: async (run) => stored.runs.push(run),
        updateRun: async () => undefined,
        createSnapshots: async (snapshots) =>
          stored.snapshots.push(...snapshots),
        createItems: async (items) => stored.items.push(...items),
      },
      ids: { next: (prefix) => `${prefix}_1` },
      clock: { now: () => new Date("2026-08-05T10:00:00.000Z") },
    });

    const result = await application.receive({
      actorId: "user_1",
      requestId: "req_1",
      trigger: "manual",
    });

    expect(result.status).toBe("ready");
    expect(result.counts).toEqual({
      total: 2,
      matched: 0,
      missingMedusa: 1,
      ambiguous: 0,
      excluded: 0,
      invalid: 1,
      changed: 0,
    });
    expect(stored.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          externalId: "SKU-404",
          mappingStatus: "missing_medusa",
        }),
        expect.objectContaining({
          externalId: "invalid:1:1",
          mappingStatus: "ambiguous",
          name: "Invalid",
        }),
      ])
    );
  });

  it("stores only products assigned to the DYLLU brand", async () => {
    const storedItems: unknown[] = [];
    const application = new OneCSyncApplication({
      feeds: {
        fetchCatalog: async () => ({
          outboundIp: null,
          snapshots: [
            {
              endpoint: "products",
              batch: 1,
              url: "http://135.181.211.55/polim/hs/WebAPI/pit_site_products?batch=1&brand=dyllu",
              rawBody: "{}",
              data: {
                Items: [
                  { id: "DYLLU-1", BrandId: "brand-dyllu" },
                  { id: "INGCO-1", BrandId: "brand-ingco" },
                ],
              },
              statusCode: 200,
              elapsedMs: 20,
            },
            {
              endpoint: "brands",
              batch: null,
              url: "http://135.181.211.55/polim/hs/WebAPI/pit_site_brands",
              rawBody: "{}",
              data: {
                Items: [
                  { id: "brand-dyllu", name: "Dyllu" },
                  { id: "brand-ingco", name: "INGCO" },
                ],
              },
              statusCode: 200,
              elapsedMs: 20,
            },
          ],
        }),
      },
      catalog: { listVariants: async () => [] },
      store: {
        createRun: async () => undefined,
        updateRun: async () => undefined,
        createSnapshots: async () => undefined,
        createItems: async (items) => storedItems.push(...items),
      },
      ids: { next: (prefix) => `${prefix}_1` },
      clock: { now: () => new Date("2026-08-05T10:00:00.000Z") },
    });

    const result = await application.receive({
      actorId: "user_1",
      requestId: "req_2",
      trigger: "manual",
    });

    expect(result.counts.total).toBe(1);
    expect(storedItems).toEqual([
      expect.objectContaining({ externalId: "DYLLU-1" }),
    ]);
  });

  it("fails closed when the brands feed has no DYLLU brand", async () => {
    const updateRun = jest.fn(async () => undefined);
    const application = new OneCSyncApplication({
      feeds: {
        fetchCatalog: async () => ({
          outboundIp: null,
          snapshots: [
            {
              endpoint: "products",
              batch: 1,
              url: "http://135.181.211.55/polim/hs/WebAPI/pit_site_products?batch=1&brand=dyllu",
              rawBody: "{}",
              data: { Items: [{ id: "INGCO-1", BrandId: "brand-ingco" }] },
              statusCode: 200,
              elapsedMs: 20,
            },
            {
              endpoint: "brands",
              batch: null,
              url: "http://135.181.211.55/polim/hs/WebAPI/pit_site_brands",
              rawBody: "{}",
              data: { Items: [{ id: "brand-ingco", name: "INGCO" }] },
              statusCode: 200,
              elapsedMs: 20,
            },
          ],
        }),
      },
      catalog: { listVariants: async () => [] },
      store: {
        createRun: async () => undefined,
        updateRun,
        createSnapshots: async () => undefined,
        createItems: async () => undefined,
      },
      ids: { next: (prefix) => `${prefix}_1` },
      clock: { now: () => new Date("2026-08-05T10:00:00.000Z") },
    });

    await expect(
      application.receive({
        actorId: "user_1",
        requestId: "req_3",
        trigger: "manual",
      })
    ).rejects.toMatchObject({ code: "brand_scope_not_found" });
    expect(updateRun).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: "failed",
        errorCode: "brand_scope_not_found",
      })
    );
  });
});
