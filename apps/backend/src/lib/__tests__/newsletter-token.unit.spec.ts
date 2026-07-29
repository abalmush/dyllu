import {
  createNewsletterToken,
  verifyNewsletterToken,
} from "../newsletter-token";

const SECRET = "test-secret-with-at-least-thirty-two-characters";

describe("newsletter confirmation tokens", () => {
  it("round-trips a signed email", () => {
    const token = createNewsletterToken("client@example.com", SECRET);

    expect(verifyNewsletterToken(token, SECRET)?.email).toBe(
      "client@example.com"
    );
  });

  it("rejects changed tokens and signatures", () => {
    const token = createNewsletterToken("client@example.com", SECRET);
    const [payload, signature] = token.split(".");

    expect(
      verifyNewsletterToken(`${payload}x.${signature}`, SECRET)
    ).toBeNull();
    expect(
      verifyNewsletterToken(`${payload}.${signature}x`, SECRET)
    ).toBeNull();
    expect(verifyNewsletterToken(token, `${SECRET}-other`)).toBeNull();
  });
});
