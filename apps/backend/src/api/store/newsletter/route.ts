import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

import type { NewsletterSubscription } from "../../_shared/contracts";
import { getNewsletterConfirmationUrl } from "../../../lib/email-urls";
import { createNewsletterToken } from "../../../lib/newsletter-token";
import { createNewsletterConfirmationEmail } from "../../../lib/transactional-emails";

export async function POST(
  req: MedusaRequest<NewsletterSubscription>,
  res: MedusaResponse
) {
  const { email, website } = req.validatedBody;
  if (website) {
    return res.status(202).json({ status: "confirmation_sent" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const secret = process.env.JWT_SECRET;
  const confirmationBaseUrl = getNewsletterConfirmationUrl();
  if (!apiKey || !secret || !confirmationBaseUrl) {
    return res.status(503).json({
      error: "email_unavailable",
      message: "Abonarea nu este disponibilă momentan.",
    });
  }

  const token = createNewsletterToken(email.toLowerCase(), secret);
  const confirmationUrl = new URL(confirmationBaseUrl);
  confirmationUrl.searchParams.set("token", token);

  const notificationService = req.scope.resolve(Modules.NOTIFICATION);
  const content = createNewsletterConfirmationEmail(confirmationUrl.toString());
  await notificationService.createNotifications({
    to: email,
    channel: "email",
    template: "newsletter-confirmation",
    content,
  });

  return res.status(202).json({ status: "confirmation_sent" });
}
