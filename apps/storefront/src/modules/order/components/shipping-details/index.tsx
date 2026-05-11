import { convertToLocale } from "@lib/util/money";
import { HttpTypes } from "@medusajs/types";
import { Text } from "@lib/ui-compat";

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder;
};

const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
      <div
        className="flex flex-1 flex-col"
        data-testid="shipping-address-summary"
      >
        <Text className="txt-medium-plus mb-1 text-ui-fg-base">
          Adresă de livrare
        </Text>
        <Text className="txt-medium text-ui-fg-subtle">
          {order.shipping_address?.first_name}{" "}
          {order.shipping_address?.last_name}
        </Text>
        <Text className="txt-medium text-ui-fg-subtle">
          {order.shipping_address?.address_1}{" "}
          {order.shipping_address?.address_2}
        </Text>
        <Text className="txt-medium text-ui-fg-subtle">
          {order.shipping_address?.postal_code},{" "}
          {order.shipping_address?.city}
        </Text>
        <Text className="txt-medium text-ui-fg-subtle">
          {order.shipping_address?.country_code?.toUpperCase()}
        </Text>
      </div>

      <div
        className="flex flex-1 flex-col"
        data-testid="shipping-contact-summary"
      >
        <Text className="txt-medium-plus mb-1 text-ui-fg-base">Contact</Text>
        <Text className="txt-medium text-ui-fg-subtle">
          {order.shipping_address?.phone}
        </Text>
        <Text className="txt-medium text-ui-fg-subtle">{order.email}</Text>
      </div>

      <div
        className="flex flex-1 flex-col"
        data-testid="shipping-method-summary"
      >
        <Text className="txt-medium-plus mb-1 text-ui-fg-base">Metodă</Text>
        <Text className="txt-medium text-ui-fg-subtle">
          {(order as any).shipping_methods[0]?.name} (
          {convertToLocale({
            amount: order.shipping_methods?.[0].total ?? 0,
            currency_code: order.currency_code,
          })}
          )
        </Text>
      </div>
    </div>
  );
};

export default ShippingDetails;
