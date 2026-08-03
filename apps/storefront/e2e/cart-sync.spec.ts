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
    await page.waitForLoadState("networkidle");
    await expect(addButton).toBeEnabled();
    await addButton.click();

    await expect
      .poll(
        async () => {
          const cookies = await context.cookies();
          return cookies.some((cookie) => cookie.name === "_medusa_cart_id");
        },
        { timeout: 20_000 }
      )
      .toBe(true);

    await expect(
      page.getByRole("heading", {
        name: /Coșul tău/i,
      })
    ).toBeVisible({ timeout: 20_000 });

    await expect
      .poll(
        async () => {
          return (await page.locator('[data-testid="cart-item"]').count()) > 0;
        },
        { timeout: 20_000 }
      )
      .toBe(true);

    await page.getByRole("link", { name: "Vezi coșul" }).click();

    await expect(page).toHaveURL(/\/cart$/);

    await expect
      .poll(
        async () => {
          return (
            (await page.locator('[data-testid="product-row"]').count()) > 0
          );
        },
        { timeout: 20_000 }
      )
      .toBe(true);

    await page.goto("/checkout");

    await expect(page.getByTestId("checkout-container")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pagina nu a putut fi încărcată" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Finalizează comanda" })
    ).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Progres finalizare comandă" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Plată la livrare" })
    ).toHaveCount(0);
    await expect(page.getByTestId("submit-order-button")).toHaveText(
      "Plasează comanda"
    );
    await expect(page.getByTestId("cart-shipping")).toHaveText(
      "Se adaugă la plasare"
    );
    await expect(
      page.getByTestId("shipping-country-select").locator("option:checked")
    ).toHaveText("Republica Moldova");
    await page.getByTestId("shipping-first-name-input").fill("Ana");
    await page.getByTestId("shipping-last-name-input").fill("Popescu");
    await page.getByTestId("shipping-address-input").fill("Strada Test 1");
    await page.getByTestId("shipping-postal-code-input").fill("2001");
    await page.getByTestId("shipping-city-input").fill("Chișinău");
    await page.getByTestId("shipping-email-input").fill("ana@example.com");
    await page.getByTestId("shipping-phone-input").fill("+373 60 000 000");
    await page.getByTestId("submit-order-button").click();

    await expect(page).toHaveURL(/\/order\/[^/]+\/confirmed$/, {
      timeout: 30_000,
    });
    await expect(
      page
        .getByTestId("order-complete-container")
        .getByText("Comandă confirmată", { exact: true })
    ).toBeVisible();
    await expect(page.getByTestId("shipping-method-summary")).toContainText(
      "Standard Shipping"
    );

    const quantity = page.getByTestId("product-quantity");
    const unitPrice = page.getByTestId("product-unit-price");
    await expect(quantity).toHaveCount(1);
    await expect(unitPrice).toHaveCount(1);
    await expect(unitPrice).toHaveCSS("white-space", "nowrap");
    expect(
      await quantity.evaluate((element) => {
        const price = document.querySelector<HTMLElement>(
          '[data-testid="product-unit-price"]'
        );
        if (!price) return false;

        const quantityBox = element.getBoundingClientRect();
        const priceBox = price.getBoundingClientRect();
        const quantityCenter = quantityBox.top + quantityBox.height / 2;
        const priceCenter = priceBox.top + priceBox.height / 2;
        return Math.abs(quantityCenter - priceCenter) < 2;
      })
    ).toBe(true);
  });
});
