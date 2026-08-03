import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import {
  createOrderConfirmationEmail,
  type OrderConfirmationEmailSource,
} from "../lib/order-confirmation-email";
import { getStorefrontUrl } from "../lib/email-urls";

export const ORDER_CONFIRMATION_FIELDS = [
  "id",
  "display_id",
  "email",
  "created_at",
  "currency_code",
  "total",
  "subtotal",
  "item_subtotal",
  "shipping_total",
  "shipping_subtotal",
  "tax_total",
  "discount_total",
  "discount_subtotal",
  "gift_card_total",
  "shipping_address.*",
  "items.*",
  "items.tax_lines.*",
  "items.adjustments.*",
  "shipping_methods.*",
  "shipping_methods.tax_lines.*",
  "shipping_methods.adjustments.*",
  "payment_collections.payments.provider_id",
] as const;

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const notificationService = container.resolve(Modules.NOTIFICATION);
  const { data: orders } = await query.graph({
    entity: "order",
    // Medusa needs the item and shipping relations to calculate order totals.
    fields: [...ORDER_CONFIRMATION_FIELDS],
    filters: { id: data.id },
  });
  const order = orders[0] as unknown as
    | OrderConfirmationEmailSource
    | undefined;
  if (!order?.email) return;

  const content = createOrderConfirmationEmail(order, getStorefrontUrl("/"));

  await notificationService.createNotifications({
    to: order.email,
    channel: "email",
    template: "order-placed",
    content,
  });
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
