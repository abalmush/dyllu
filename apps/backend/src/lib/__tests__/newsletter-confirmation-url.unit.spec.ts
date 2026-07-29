import { getNewsletterConfirmationUrl } from "../email-urls";

describe("newsletter confirmation URL", () => {
  it("uses the public confirmation endpoint", () => {
    process.env.ADMIN_CORS =
      "http://localhost:7001,https://api.dyllu.md";

    expect(getNewsletterConfirmationUrl()).toBe(
      "https://api.dyllu.md/newsletter/confirm"
    );
  });
});
