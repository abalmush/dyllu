import { HttpTypes } from "@medusajs/types";

import { isPayOnDeliveryProvider } from "./payment";

export function hasCompleteCheckoutAddress(
  address?: HttpTypes.StoreCartAddress | null
): boolean {
  return !!(
    address?.first_name &&
    address.last_name &&
    address.address_1 &&
    address.postal_code &&
    address.city &&
    address.country_code
  );
}

export function hasCheckoutDetails(cart: HttpTypes.StoreCart): boolean {
  return !!(
    hasCompleteCheckoutAddress(cart.shipping_address) &&
    cart.shipping_address?.phone &&
    hasCompleteCheckoutAddress(cart.billing_address) &&
    cart.email &&
    (cart.shipping_methods?.length ?? 0) > 0
  );
}

export function hasCheckoutAmountDue(cart: HttpTypes.StoreCart): boolean {
  return typeof cart.total !== "number" || cart.total > 0;
}

export function hasReadyPayOnDelivery(cart: HttpTypes.StoreCart): boolean {
  if (!hasCheckoutAmountDue(cart)) {
    return true;
  }

  return !!cart.payment_collection?.payment_sessions?.find(
    (session) =>
      session.status === "pending" &&
      isPayOnDeliveryProvider(session.provider_id)
  );
}
