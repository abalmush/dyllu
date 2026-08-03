import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { getAdminUrl } from "../lib/email-urls";
import { createUserInviteEmail } from "../lib/transactional-emails";

type Invite = {
  email?: string;
  token?: string;
};

export default async function userInvitedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: invites } = await query.graph({
    entity: "invite",
    fields: ["email", "token"],
    filters: { id: data.id },
  });
  const invite = invites[0] as Invite | undefined;
  const url = getAdminUrl("/backend/invite");
  if (!invite?.email || !invite.token || !url) return;

  const inviteUrl = new URL(url);
  inviteUrl.searchParams.set("token", invite.token);
  const notificationService = container.resolve(Modules.NOTIFICATION);
  const content = createUserInviteEmail(inviteUrl.toString());
  await notificationService.createNotifications({
    to: invite.email,
    channel: "email",
    template: "user-invited",
    content,
  });
}

export const config: SubscriberConfig = {
  event: ["invite.created", "invite.resent"],
};
