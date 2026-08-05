import {
  probeOneCEndpoint,
  runOneCConnectionTest,
} from "../one-c-connection-test";

const target = {
  id: "test",
  label: "Test feed",
  source: "Engineer" as const,
  network: "public" as const,
  url: "http://example.test/feed",
};

describe("1C connection test", () => {
  it("reports a reachable Items feed", async () => {
    const fetcher = jest.fn(async () =>
      Promise.resolve(
        new Response(JSON.stringify({ Items: [{ id: "1" }, { id: "2" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    const result = await probeOneCEndpoint(target, fetcher);

    expect(result).toMatchObject({
      outcome: "reachable",
      status_code: 200,
      is_json: true,
      item_count: 2,
      error: null,
    });
  });

  it("keeps an HTTP error separate from a network error", async () => {
    const httpResult = await probeOneCEndpoint(
      target,
      async () => new Response("Forbidden", { status: 403 })
    );
    const networkResult = await probeOneCEndpoint(target, async () => {
      throw new Error("fetch failed");
    });

    expect(httpResult).toMatchObject({
      outcome: "http_error",
      status_code: 403,
      error: "HTTP 403",
    });
    expect(networkResult).toMatchObject({
      outcome: "network_error",
      status_code: null,
      error: "fetch failed",
    });
  });

  it("limits a large response sample", async () => {
    const result = await probeOneCEndpoint(
      target,
      async () => new Response("x".repeat(70 * 1024), { status: 200 })
    );

    expect(result).toMatchObject({
      outcome: "reachable",
      sample_bytes: 64 * 1024,
      sample_truncated: true,
      is_json: false,
    });
    expect(result.preview).toHaveLength(2_000);
  });

  it("uses only the fixed endpoints and tests the first product batch", async () => {
    const fetcher = jest.fn(async (input: string | URL | Request) => {
      const url = input.toString();
      if (url.includes("api.ipify.org")) {
        return new Response(JSON.stringify({ ip: "203.0.113.10" }), {
          status: 200,
        });
      }
      if (url.endsWith("pit_site_batches")) {
        return new Response(
          JSON.stringify({ Batches: [{ batch: 4 }], ItemsCount: 120 }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ Items: [] }), { status: 200 });
    });

    const result = await runOneCConnectionTest(fetcher);
    const requestedUrls = fetcher.mock.calls.map(([input]) => input.toString());

    expect(result.outbound_ip).toBe("203.0.113.10");
    expect(result.results).toHaveLength(8);
    expect(requestedUrls.sort()).toEqual(
      [
        "https://api.ipify.org?format=json",
        "http://192.168.99.10/polim/hs/WebAPI/test",
        "http://135.181.211.55/polim/hs/WebAPI/test",
        "http://135.181.211.55/polim/hs/WebAPI/pit_site_test",
        "http://135.181.211.55/polim/hs/WebAPI/pit_site_batches",
        "http://135.181.211.55/polim/hs/WebAPI/pit_site_categories",
        "http://135.181.211.55/polim/hs/WebAPI/pit_site_brands",
        "http://135.181.211.55/polim/hs/WebAPI/pit_site_promo",
        "http://135.181.211.55/polim/hs/WebAPI/pit_site_products?batch=4",
      ].sort()
    );
  });
});
