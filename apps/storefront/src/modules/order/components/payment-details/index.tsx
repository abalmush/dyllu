import { Container, Text } from "@lib/ui-compat";

import { paymentInfoMap } from "@lib/constants";
import { convertToLocale } from "@lib/util/money";
import { HttpTypes } from "@medusajs/types";

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder;
};

const PaymentDetails = ({ order }: PaymentDetailsProps) => {
  const payment = order.payment_collections?.[0].payments?.[0];

  if (!payment) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
      <div className="flex flex-1 flex-col">
        <Text className="txt-medium-plus mb-1 text-ui-fg-base">
          Metodă de plată
        </Text>
        <Text
          className="txt-medium text-ui-fg-subtle"
          data-testid="payment-method"
        >
          {paymentInfoMap[payment.provider_id].title}
        </Text>
      </div>
      <div className="flex flex-[2] flex-col">
        <Text className="txt-medium-plus mb-1 text-ui-fg-base">
          Detalii plată
        </Text>
        <div className="txt-medium flex items-center gap-2 text-ui-fg-subtle">
          <Container className="flex h-7 w-fit items-center bg-ui-button-neutral-hover p-2">
            {paymentInfoMap[payment.provider_id].icon}
          </Container>
          <Text data-testid="payment-amount">
            {convertToLocale({
              amount: payment.amount,
              currency_code: order.currency_code,
            })}{" "}
            achitat la {new Date(payment.created_at ?? "").toLocaleString("ro-MD")}
          </Text>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetails;
