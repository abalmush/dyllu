import { expect, test } from "@playwright/test";

// Guards the Phase 3/4 fix directly: adding to cart must settle with a
// single Server Action request and open the minibag without waiting for a
// full-route RSC refresh. If refresh()/router.refresh() ever creeps back
// into the cart mutation path, this starts failing.
test.describe("cart mutation request budget", () => {
  test("adding to cart from the PLP issues exactly one mutation request", async ({
    page,
  }) => {
    await page.goto("/store");

    const addButton = page
      .locator('button[aria-label^="Adaugă"]:not([disabled])')
      .first();
    await expect(addButton).toBeVisible();

    const mutationRequests: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/store")) {
        mutationRequests.push(request.url());
      }
    });

    await addButton.click();

    await expect(page.getByRole("heading", { name: /Coșul tău/i })).toBeVisible(
      { timeout: 5_000 }
    );

    await expect
      .poll(() => mutationRequests.length, { timeout: 5_000 })
      .toBe(1);
  });
});
