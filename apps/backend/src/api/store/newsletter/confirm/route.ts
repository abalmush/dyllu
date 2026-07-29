import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import type { NewsletterConfirmationQuery } from "../../../_shared/contracts";
import { verifyNewsletterToken } from "../../../../lib/newsletter-token";

export async function GET(
  req: MedusaRequest<unknown, NewsletterConfirmationQuery>,
  res: MedusaResponse
) {
  const token = (req.validatedQuery as NewsletterConfirmationQuery).token;
  const secret = process.env.JWT_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  const storefrontUrl = process.env.STOREFRONT_URL;
  const payload = secret ? verifyNewsletterToken(token, secret) : null;

  if (!payload || !apiKey || !storefrontUrl) {
    return res.status(400).json({
      error: "invalid_confirmation",
      message: "Linkul de confirmare este invalid sau a expirat.",
    });
  }

  const response = await fetch("https://api.resend.com/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: payload.email,
      unsubscribed: false,
    }),
  }).catch(() => null);
  if (!response) {
    return res.status(502).json({
      error: "subscription_failed",
      message: "Abonarea nu a putut fi confirmată.",
    });
  }
  if (!response.ok && response.status !== 409) {
    return res.status(502).json({
      error: "subscription_failed",
      message: "Abonarea nu a putut fi confirmată.",
    });
  }

  const redirectUrl = new URL("/", storefrontUrl);
  redirectUrl.searchParams.set("newsletter", "confirmed");
  return res.redirect(303, redirectUrl.toString());
}
