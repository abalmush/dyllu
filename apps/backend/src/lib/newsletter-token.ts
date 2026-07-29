import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_LIFETIME_SECONDS = 60 * 60 * 24;

type TokenPayload = {
  email: string;
  expiresAt: number;
};

export function createNewsletterToken(email: string, secret: string) {
  const encoded = Buffer.from(
    JSON.stringify({
      email,
      expiresAt: Math.floor(Date.now() / 1_000) + TOKEN_LIFETIME_SECONDS,
    } satisfies TokenPayload)
  ).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyNewsletterToken(token: string, secret: string) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = Buffer.from(sign(encoded, secret));
  const received = Buffer.from(signature);
  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as TokenPayload;
    if (
      typeof payload.email !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt < Math.floor(Date.now() / 1_000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}
