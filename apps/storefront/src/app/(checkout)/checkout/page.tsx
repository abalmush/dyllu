import { Container } from "@/components/atoms/container";
import { Breadcrumbs } from "@/components/molecules/breadcrumbs";
import { Eyebrow } from "@/components/molecules/eyebrow";
import { CheckoutSteps } from "@/components/organisms/checkout-blocks";
import { retrieveCart } from "@lib/data/cart";
import { retrieveCustomer } from "@lib/data/customer";
import PaymentWrapper from "@modules/checkout/components/payment-wrapper";
import {
  getActiveCheckoutStep,
  getCheckoutStepIndex,
} from "@modules/checkout/lib/presentation";
import CheckoutForm from "@modules/checkout/templates/checkout-form";
import CheckoutSummary from "@modules/checkout/templates/checkout-summary";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Finalizare comandă",
};

type Props = {
  searchParams: Promise<{ step?: string }>;
};

export default async function Checkout(props: Props) {
  const [cart, customer, searchParams] = await Promise.all([
    retrieveCart(),
    retrieveCustomer(),
    props.searchParams,
  ]);

  if (!cart) {
    redirect("/cart");
  }

  const activeStep = getActiveCheckoutStep(cart, searchParams.step);

  if (searchParams.step !== activeStep) {
    redirect(`/checkout?step=${activeStep}`);
  }

  return (
    <div className="bg-surface-subtle">
      <Container className="small:py-12 py-8">
        <div className="mb-8 flex flex-col gap-4">
          <Breadcrumbs
            items={[
              { label: "Acasă", href: "/" },
              { label: "Coșul meu", href: "/cart" },
              { label: "Finalizare comandă" },
            ]}
          />
          <Eyebrow>Pas final</Eyebrow>
          <h1 className="font-display text-display-sm text-foreground small:text-display-md font-extrabold tracking-tight">
            Finalizează comanda
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Confirmă datele de livrare, alege plata și verifică întreaga comandă
            înainte de plasare.
          </p>
        </div>

        <div className="clip-corner-cut-lg clip-shadow-sm bg-card ring-border small:p-6 mb-8 p-4 ring-1">
          <CheckoutSteps current={getCheckoutStepIndex(activeStep)} />
        </div>

        <div className="small:grid-cols-[minmax(0,1fr)_380px] small:gap-12 grid grid-cols-1 gap-8">
          <PaymentWrapper cart={cart}>
            <CheckoutForm
              cart={cart}
              customer={customer}
              activeStep={activeStep}
            />
          </PaymentWrapper>
          <CheckoutSummary
            cart={
              cart as typeof cart & {
                promotions: import("@medusajs/types").HttpTypes.StorePromotion[];
              }
            }
            activeStep={activeStep}
          />
        </div>
      </Container>
    </div>
  );
}
