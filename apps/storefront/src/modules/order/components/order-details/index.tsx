import { CheckCircle2 } from "lucide-react";

import { HttpTypes } from "@medusajs/types";
import { PageHero } from "@/components/molecules/page-hero";

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder;
  showStatus?: boolean;
};

const formatStatus = (str: string) => {
  const formatted = str.split("_").join(" ");
  return formatted.slice(0, 1).toUpperCase() + formatted.slice(1);
};

const dateFormatter = new Intl.DateTimeFormat("ro-MD", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  const firstName = order.shipping_address?.first_name?.trim();
  const greetingName = firstName ? `, ${firstName}` : "";

  const totalFormatted = new Intl.NumberFormat("ro-MD", {
    style: "currency",
    currency: order.currency_code.toUpperCase(),
  }).format(order.total);

  return (
    <PageHero
      surface="dark"
      eyebrow={{ label: "Comandă confirmată", icon: CheckCircle2 }}
      title={`Mulțumim${greetingName}!`}
      lede={
        <>
          Am primit comanda ta și am trimis confirmarea pe{" "}
          <span className="font-semibold text-background" data-testid="order-email">
            {order.email}
          </span>
          .
        </>
      }
      cta={{ href: "/", label: "Continuă cumpărăturile" }}
      stats={[
        {
          label: "Număr comandă",
          value: `#${order.display_id}`,
          "data-testid": "order-id",
        },
        {
          label: "Plasată la",
          value: dateFormatter.format(new Date(order.created_at)),
          "data-testid": "order-date",
        },
        {
          label: "Total",
          value: totalFormatted,
        },
      ]}
    >
      {showStatus && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-background/70">
          <span>
            Stare comandă:{" "}
            <span
              className="font-semibold text-background"
              data-testid="order-status"
            >
              {formatStatus(order.fulfillment_status)}
            </span>
          </span>
          <span>
            Stare plată:{" "}
            <span
              className="font-semibold text-background"
              data-testid="order-payment-status"
            >
              {formatStatus(order.payment_status)}
            </span>
          </span>
        </div>
      )}
    </PageHero>
  );
};

export default OrderDetails;
