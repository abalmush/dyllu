import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

import type { NewsletterSubscription } from "../../_shared/contracts";
import { emailButton, emailShell } from "../../../lib/email-content";
import { getNewsletterConfirmationUrl } from "../../../lib/email-urls";
import { createNewsletterToken } from "../../../lib/newsletter-token";

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
  await notificationService.createNotifications({
    to: email,
    channel: "email",
    template: "newsletter-confirmation",
    content: {
      subject: "Confirmă abonarea la noutățile DYLLU",
      text: `Confirmă abonarea accesând: ${confirmationUrl}`,
      html: emailShell(
        "Confirmă abonarea",
        `<p>Ai solicitat să primești noutățile DYLLU.</p>${emailButton(
          "Confirmă adresa de email",
          confirmationUrl.toString()
        )}<p>Dacă nu ai făcut această solicitare, ignoră mesajul.</p>`
      ),
    },
  });

  return res.status(202).json({ status: "confirmation_sent" });
}
