import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";

import { getAdminUrl, getStorefrontUrl } from "../lib/email-urls";
import { createPasswordResetEmail } from "../lib/transactional-emails";

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
  const content = createPasswordResetEmail(resetUrl.toString());

  await notificationService.createNotifications({
    to: data.entity_id,
    channel: "email",
    template: "password-reset",
    content,
  });
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
};
