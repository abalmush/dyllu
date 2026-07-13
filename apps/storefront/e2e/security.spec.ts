import { expect, test } from "@playwright/test";

test.describe("security boundaries", () => {
  test("revalidation rejects unauthenticated writes and has no GET endpoint", async ({
    request,
  }) => {
    const postResponse = await request.post("/api/revalidate", {
      data: { tags: ["products"] },
      headers: { "x-revalidate-secret": "invalid-test-secret" },
    });
    expect([401, 503]).toContain(postResponse.status());
    expect(postResponse.headers()["cache-control"]).toContain("no-store");

    const getResponse = await request.get("/api/revalidate");
    expect(getResponse.status()).toBe(405);
  });

  test("storefront responses include the security header baseline", async ({
    request,
  }) => {
    const response = await request.get("/api/revalidate");

    expect(response.status()).toBe(405);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(response.headers()["content-security-policy"]).toContain(
      "frame-ancestors 'none'"
    );
    expect(response.headers()["x-powered-by"]).toBeUndefined();
  });

  test("a forged guest order confirmation cookie cannot reveal an order", async ({
    baseURL,
    context,
    page,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required");
    const expiresAt = Math.floor(Date.now() / 1000) + 3_600;
    await context.addCookies([
      {
        name: "_medusa_order_confirmation",
        value: `order_forged.${expiresAt}.${"0".repeat(64)}`,
        url: baseURL,
      },
    ]);

    await page.goto("/order/order_forged/confirmed");
    await expect(page.getByTestId("order-complete-container")).toHaveCount(0);
    await expect(page.getByTestId("order-email")).toHaveCount(0);
  });
});
