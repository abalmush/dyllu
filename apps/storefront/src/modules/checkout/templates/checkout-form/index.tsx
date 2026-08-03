import { HttpTypes } from "@medusajs/types";
import Addresses from "@modules/checkout/components/addresses";

export default function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null;
  customer: HttpTypes.StoreCustomer | null;
}) {
  if (!cart) {
    return null;
  }

  return <Addresses cart={cart} customer={customer} />;
}
