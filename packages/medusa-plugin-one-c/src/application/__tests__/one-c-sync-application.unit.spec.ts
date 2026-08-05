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
                    Prices: [{ typeId: "05", value: 250 }],
                  },
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
      total: 1,
      matched: 0,
      missingMedusa: 1,
      ambiguous: 0,
      excluded: 0,
      invalid: 0,
      changed: 0,
    });
    expect(stored.items).toEqual([
      expect.objectContaining({
        externalId: "SKU-404",
        mappingStatus: "missing_medusa",
      }),
    ]);
  });
});
