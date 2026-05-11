import { HttpTypes } from "@medusajs/types";

import { Container } from "@/components/atoms/container";
import { Breadcrumbs } from "@/components/molecules/breadcrumbs";
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
    <Container className="py-8 small:py-12" data-testid="cart-container">
      {cart?.items?.length ? (
        <>
          <div className="mb-8 flex flex-col gap-2">
            <Breadcrumbs
              items={[
                { label: "Acasă", href: "/" },
                { label: "Coșul meu" },
              ]}
            />
            <h1 className="font-display text-display-sm font-extrabold tracking-tight text-foreground small:text-display-md">
              Coșul tău
            </h1>
            <p className="text-sm text-muted-foreground">
              Verifică produsele și finalizează comanda în câțiva pași.
            </p>
          </div>
          <div className="grid gap-8 small:grid-cols-[minmax(0,1fr)_minmax(0,360px)] small:gap-12">
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
  );
}
