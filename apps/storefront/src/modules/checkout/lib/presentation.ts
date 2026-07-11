import { HttpTypes } from "@medusajs/types";

type CheckoutCart = HttpTypes.StoreCart & {
  gift_cards?: Array<unknown> | null;
};

export type CheckoutStepKey = "address" | "delivery" | "payment" | "review";

const CHECKOUT_STEP_INDEX: Record<CheckoutStepKey, number> = {
  address: 0,
  delivery: 1,
  payment: 2,
  review: 3,
};

export function getCheckoutStepIndex(step: CheckoutStepKey): number {
  return CHECKOUT_STEP_INDEX[step];
}

export function isCheckoutStep(value?: string): value is CheckoutStepKey {
  return (
    value === "address" ||
    value === "delivery" ||
    value === "payment" ||
    value === "review"
  );
}

export function isPaidByGiftCard(cart: CheckoutCart): boolean {
  return !!cart?.gift_cards?.length && cart.total === 0;
}

export function hasReadyPayment(cart: CheckoutCart): boolean {
  if (isPaidByGiftCard(cart)) {
    return true;
  }

  return !!cart.payment_collection?.payment_sessions?.find(
    (paymentSession) => paymentSession.status === "pending"
  );
}

export function getNextCheckoutStep(cart: CheckoutCart): CheckoutStepKey {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address";
  }

  if ((cart.shipping_methods?.length ?? 0) === 0) {
    return "delivery";
  }

  if (!hasReadyPayment(cart)) {
    return "payment";
  }

  return "review";
}

export function getActiveCheckoutStep(
  cart: CheckoutCart,
  requestedStep?: string
): CheckoutStepKey {
  if (requestedStep && isCheckoutStep(requestedStep)) {
    return requestedStep;
  }

  return getNextCheckoutStep(cart);
}
