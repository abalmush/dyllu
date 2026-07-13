import { cookies as nextCookies } from "next/headers";

import { SectionHeading } from "@/components/molecules/section-heading";
import CartTotals from "@modules/common/components/cart-totals";
import Help from "@modules/order/components/help";
import Items from "@modules/order/components/items";
import OnboardingCta from "@modules/order/components/onboarding-cta";
import OrderDetails from "@modules/order/components/order-details";
import ShippingDetails from "@modules/order/components/shipping-details";
import PaymentDetails from "@modules/order/components/payment-details";
import { HttpTypes } from "@medusajs/types";

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder;
};

export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies();

  const isOnboarding =
    process.env.NODE_ENV !== "production" &&
    cookies.get("_medusa_onboarding")?.value === "true";

  return (
    <div className="min-h-[calc(100vh-64px)] py-6">
      <div className="content-container flex h-full w-full max-w-4xl flex-col items-center justify-center gap-y-10">
        {isOnboarding && <OnboardingCta orderId={order.id} />}
        <div
          className="flex h-full w-full max-w-4xl flex-col gap-8 py-10"
          data-testid="order-complete-container"
        >
          <OrderDetails order={order} />
          <section className="flex flex-col gap-6">
            <SectionHeading
              eyebrow="Comanda ta"
              title="Sumar"
              description="Articolele și costurile pentru comanda plasată."
            />
            <Items order={order} />
            <CartTotals totals={order} />
          </section>
          <section className="flex flex-col gap-6">
            <SectionHeading eyebrow="Livrare" title="Detalii expediere" />
            <ShippingDetails order={order} />
          </section>
          <section className="flex flex-col gap-6">
            <SectionHeading eyebrow="Plată" title="Detalii plată" />
            <PaymentDetails order={order} />
          </section>
          <Help />
        </div>
      </div>
    </div>
  );
}
