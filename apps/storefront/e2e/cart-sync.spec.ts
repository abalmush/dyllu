import { expect, test } from "@playwright/test";

test.describe("cart sync", () => {
  test("adding a product updates the drawer and cart page", async ({
    page,
    context,
  }) => {
    await page.goto("/store");

    const addButton = page
      .locator('button[aria-label^="Adaugă"]:not([disabled])')
      .first();

    await expect(addButton).toBeVisible();
    await addButton.click();

    await expect
      .poll(async () => {
        const cookies = await context.cookies();
        return cookies.some((cookie) => cookie.name === "_medusa_cart_id");
      })
      .toBe(true);

    await expect(
      page.getByRole("heading", {
        name: /Coșul tău/i,
      })
    ).toBeVisible();

    await expect
      .poll(async () => {
        return (await page.locator('[data-testid="cart-item"]').count()) > 0;
      })
      .toBe(true);

    await page.getByRole("link", { name: "Vezi coșul" }).click();

    await expect(page).toHaveURL(/\/cart$/);

    await expect
      .poll(async () => {
        return (await page.locator('[data-testid="product-row"]').count()) > 0;
      })
      .toBe(true);
  });
});
