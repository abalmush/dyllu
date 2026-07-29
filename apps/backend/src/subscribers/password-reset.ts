import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";

import { emailButton, emailShell } from "../lib/email-content";
import { getAdminUrl, getStorefrontUrl } from "../lib/email-urls";

type ResetEvent = {
  entity_id: string;
  token: string;
  actor_type: string;
};

export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<ResetEvent>) {
  const basePath =
    data.actor_type === "customer"
      ? "/reset-password"
      : "/backend/reset-password";
  const url =
    data.actor_type === "customer"
      ? getStorefrontUrl(basePath)
      : getAdminUrl(basePath);
  if (!url) return;

  const resetUrl = new URL(url);
  resetUrl.searchParams.set("token", data.token);
  resetUrl.searchParams.set("email", data.entity_id);
  const notificationService = container.resolve(Modules.NOTIFICATION);

  await notificationService.createNotifications({
    to: data.entity_id,
    channel: "email",
    template: "password-reset",
    content: {
      subject: "Resetarea parolei DYLLU",
      text: `Resetează parola accesând: ${resetUrl}`,
      html: emailShell(
        "Resetarea parolei",
        `<p>Am primit o solicitare de resetare a parolei.</p>${emailButton(
          "Resetează parola",
          resetUrl.toString()
        )}<p>Linkul expiră în 15 minute. Dacă nu ai făcut solicitarea, ignoră mesajul.</p>`
      ),
    },
  });
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
};
