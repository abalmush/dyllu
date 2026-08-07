import { expect, test } from "@playwright/test";

test.describe("scroll-to-top button", () => {
  test("appears past one viewport of scroll and returns to top on click", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      document.body.style.minHeight = "400vh";
    });

    const button = page.getByTestId("scroll-to-top-button");
    await expect(button).toHaveAttribute("aria-hidden", "true");

    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5));
    await expect(button).toHaveAttribute("aria-hidden", "false");

    await button.click();

    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBeLessThan(5);
  });

  test("jumps instead of animating when prefers-reduced-motion is set", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.evaluate(() => {
      document.body.style.minHeight = "400vh";
    });
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5));

    const button = page.getByTestId("scroll-to-top-button");
    await expect(button).toHaveAttribute("aria-hidden", "false");

    await button.click();

    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBeLessThan(5);
  });
});
