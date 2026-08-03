import { Container } from "@/components/atoms/container";
import { Breadcrumbs } from "@/components/molecules/breadcrumbs";
import { Eyebrow } from "@/components/molecules/eyebrow";
import { retrieveCart } from "@lib/data/cart";
import { retrieveCustomer } from "@lib/data/customer";
import { hasCheckoutAmountDue } from "@lib/checkout/state";
import CheckoutSubmission from "@modules/checkout/components/checkout-submission";
import CheckoutForm from "@modules/checkout/templates/checkout-form";
import CheckoutSummary from "@modules/checkout/templates/checkout-summary";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Finalizare comandă",
};

export default async function Checkout() {
  const [cart, customer] = await Promise.all([
    retrieveCart(),
    retrieveCustomer(),
  ]);

  if (!cart?.items?.length) {
    redirect("/cart");
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
          <Eyebrow>Checkout simplu</Eyebrow>
          <h1 className="font-display text-display-sm text-foreground small:text-display-md font-extrabold tracking-tight text-balance">
            Finalizează comanda
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Completează datele de livrare și plasează comanda. Livrarea standard
            și plata la livrare se aplică automat.
          </p>
        </div>

        <CheckoutSubmission
          hasAmountDue={hasCheckoutAmountDue(cart)}
          details={<CheckoutForm cart={cart} customer={customer} />}
          summary={
            <CheckoutSummary
              cart={
                cart as typeof cart & {
                  promotions: import("@medusajs/types").HttpTypes.StorePromotion[];
                }
              }
            />
          }
        />
      </Container>
    </div>
  );
}
