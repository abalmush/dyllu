import { HttpTypes } from "@medusajs/types";

import { Container } from "@/components/atoms/container";
import { Breadcrumbs } from "@/components/molecules/breadcrumbs";
import { Eyebrow } from "@/components/molecules/eyebrow";
import EmptyCartMessage from "../components/empty-cart-message";
import SignInPrompt from "../components/sign-in-prompt";
import ItemsTemplate from "./items";
import Summary from "./summary";

type Props = {
  cart: HttpTypes.StoreCart | null;
  customer: HttpTypes.StoreCustomer | null;
};

export default function CartTemplate({ cart, customer }: Props) {
  return (
    <div
      className={cart?.items?.length ? "bg-surface-subtle" : undefined}
      data-testid="cart-container"
    >
      <Container className="small:py-12 py-8">
        {cart?.items?.length ? (
          <>
            <div className="mb-8 flex flex-col gap-4">
              <Breadcrumbs
                items={[{ label: "Acasă", href: "/" }, { label: "Coșul meu" }]}
              />
              <Eyebrow>Comandă DYLLU</Eyebrow>
              <h1 className="font-display text-display-sm text-foreground small:text-display-md font-extrabold tracking-tight">
                Coșul tău
              </h1>
              <p className="text-muted-foreground max-w-2xl text-sm">
                Verifică produsele, adaugă accesoriile utile și mergi mai
                departe către finalizarea comenzii.
              </p>
            </div>
            <div className="small:grid-cols-[minmax(0,1fr)_minmax(0,360px)] small:gap-12 grid gap-8">
              <div className="flex flex-col gap-6">
                {!customer && <SignInPrompt />}
                <ItemsTemplate cart={cart} />
              </div>
              {cart.region && (
                <div className="small:sticky small:top-28 small:self-start">
                  <Summary
                    cart={
                      cart as HttpTypes.StoreCart & {
                        promotions: HttpTypes.StorePromotion[];
                      }
                    }
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <EmptyCartMessage />
        )}
      </Container>
    </div>
  );
}
