import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { emailShell, escapeHtml } from "../lib/email-content";

type OrderLine = {
  title?: string;
  quantity?: number;
  total?: number;
};

type Order = {
  display_id?: number | string;
  email?: string;
  currency_code?: string;
  total?: number;
  items?: OrderLine[];
};

const formatMoney = (
  amount: number | undefined,
  currency: string | undefined
) =>
  new Intl.NumberFormat("ro-MD", {
    style: "currency",
    currency: (currency || "MDL").toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount || 0);

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const notificationService = container.resolve(Modules.NOTIFICATION);
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "display_id",
      "email",
      "currency_code",
      "total",
      "items.title",
      "items.quantity",
      "items.total",
    ],
    filters: { id: data.id },
  });
  const order = orders[0] as unknown as Order | undefined;
  if (!order?.email) return;

  const itemRows = (order.items || [])
    .map(
      (item) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #ddd">${escapeHtml(
          item.title
        )} × ${item.quantity || 1}</td><td style="padding:10px 0;border-bottom:1px solid #ddd;text-align:right">${escapeHtml(
          formatMoney(item.total, order.currency_code)
        )}</td></tr>`
    )
    .join("");
  const orderNumber = order.display_id || data.id;

  await notificationService.createNotifications({
    to: order.email,
    channel: "email",
    template: "order-placed",
    content: {
      subject: `Comanda DYLLU #${orderNumber} a fost înregistrată`,
      text: `Am înregistrat comanda #${orderNumber}. Total: ${formatMoney(
        order.total,
        order.currency_code
      )}.`,
      html: emailShell(
        `Comanda #${orderNumber}`,
        `<p>Mulțumim pentru comandă. Am înregistrat-o și revenim cu detaliile livrării.</p><table style="width:100%;border-collapse:collapse">${itemRows}<tr><td style="padding-top:16px;font-weight:800">Total</td><td style="padding-top:16px;text-align:right;font-weight:800">${escapeHtml(
          formatMoney(order.total, order.currency_code)
        )}</td></tr></table>`
      ),
    },
  });
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
