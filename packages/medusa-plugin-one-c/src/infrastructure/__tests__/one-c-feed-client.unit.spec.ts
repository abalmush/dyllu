import { ONE_C_ENDPOINTS, OneCFeedClient } from "../one-c-feed-client";

describe("OneCFeedClient", () => {
  it("fetches the batch list and each declared product batch", async () => {
    const requested: Array<{ url: string; redirect: RequestRedirect }> = [];
    const fetcher = jest.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        requested.push({ url, redirect: init?.redirect ?? "follow" });
        if (url === ONE_C_ENDPOINTS.productBatches) {
          return jsonResponse({ Batches: [{ batch: 1 }, { batch: 2 }] });
        }
        if (url.endsWith("pit_site_products?batch=1")) {
          return jsonResponse({ Items: [{ id: "A" }] });
        }
        if (url.endsWith("pit_site_products?batch=2")) {
          return jsonResponse({ Items: [{ id: "B" }] });
        }
        throw new Error(`Unexpected URL ${url}`);
      }
    );

    const result = await new OneCFeedClient({ fetcher }).fetchProducts();

    expect(result.map((batch) => batch.batch)).toEqual([1, 2]);
    expect(result.flatMap((batch) => batch.data.Items)).toEqual([
      { id: "A" },
      { id: "B" },
    ]);
    expect(requested).toEqual([
      { url: ONE_C_ENDPOINTS.productBatches, redirect: "error" },
      {
        url: `${ONE_C_ENDPOINTS.products}?batch=1`,
        redirect: "error",
      },
      {
        url: `${ONE_C_ENDPOINTS.products}?batch=2`,
        redirect: "error",
      },
    ]);
  });

  it("stops when the full product feed exceeds its total size limit", async () => {
    const fetcher = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === ONE_C_ENDPOINTS.productBatches) {
        return jsonResponse({ Batches: [{ batch: 1 }] });
      }
      return jsonResponse({ Items: [{ id: "A", name: "Long product name" }] });
    });

    await expect(
      new OneCFeedClient({ fetcher, maxCatalogBytes: 50 }).fetchProducts()
    ).rejects.toMatchObject({ code: "response_too_large" });
  });
});

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
