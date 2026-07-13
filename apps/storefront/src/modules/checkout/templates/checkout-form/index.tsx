import { listCartShippingMethods } from "@lib/data/fulfillment";
import { listCartPaymentMethods } from "@lib/data/payment";
import { HttpTypes } from "@medusajs/types";
import { CheckoutStepKey } from "@modules/checkout/lib/presentation";
import Addresses from "@modules/checkout/components/addresses";
import Payment from "@modules/checkout/components/payment";
import Review from "@modules/checkout/components/review";
import ReviewItems from "@modules/checkout/components/review-items";
import Shipping from "@modules/checkout/components/shipping";

export default async function CheckoutForm({
  cart,
  customer,
  activeStep,
}: {
  cart: HttpTypes.StoreCart | null;
  customer: HttpTypes.StoreCustomer | null;
  activeStep: CheckoutStepKey;
}) {
  if (!cart) {
    return null;
  }

  const [shippingMethods, paymentMethods] = await Promise.all([
    listCartShippingMethods(),
    listCartPaymentMethods(cart.region?.id ?? ""),
  ]);

  const shouldUseReviewLayout =
    activeStep === "review" && (cart.shipping_methods?.length ?? 0) > 0;

  return (
    <div className="grid w-full grid-cols-1 gap-y-6">
      <Addresses cart={cart} customer={customer} activeStep={activeStep} />

      {shouldUseReviewLayout ? (
        <ReviewItems cart={cart} />
      ) : (
        <Shipping
          cart={cart}
          availableShippingMethods={shippingMethods}
          activeStep={activeStep}
        />
      )}

      <Payment
        cart={cart}
        availablePaymentMethods={paymentMethods}
        activeStep={activeStep}
      />

      <Review cart={cart} activeStep={activeStep} />
    </div>
  );
}
