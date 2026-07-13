"use client";

import { Heading, Text, clx } from "@lib/ui-compat";
import { HttpTypes } from "@medusajs/types";
import {
  CheckoutStepKey,
  hasReadyPayment,
} from "@modules/checkout/lib/presentation";

import PaymentButton from "../payment-button";

type CheckoutCart = HttpTypes.StoreCart & {
  gift_cards?: Array<unknown> | null;
};

const Review = ({
  cart,
  activeStep,
}: {
  cart: CheckoutCart;
  activeStep: CheckoutStepKey;
}) => {
  const isOpen = activeStep === "review";

  const previousStepsCompleted =
    cart.shipping_address &&
    (cart.shipping_methods?.length ?? 0) > 0 &&
    hasReadyPayment(cart);

  return (
    <section className="clip-corner-cut-lg clip-shadow-md bg-card p-6 ring-1 ring-border small:p-8">
      <div className="mb-6 flex flex-row items-center justify-between">
        <div className="space-y-2">
          <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Pasul 4
          </Text>
          <Heading
            level="h2"
            className={clx(
              "flex flex-row items-baseline gap-x-2 font-display text-xl font-bold tracking-tight text-foreground",
              {
                "pointer-events-none select-none opacity-50": !isOpen,
              }
            )}
          >
            Verificare finală
          </Heading>
          {isOpen && (
            <Text className="text-sm text-muted-foreground">
              Ultimul pas: confirmă că detaliile comenzii sunt corecte și
              plasează comanda.
            </Text>
          )}
        </div>
      </div>
      {isOpen && previousStepsCompleted && (
        <>
          <div className="clip-corner-cut-md mb-6 bg-surface-subtle/60 p-5 ring-1 ring-border/70">
            <div className="w-full">
              <Text className="mb-1 text-sm text-muted-foreground">
                Prin apăsarea butonului de plasare confirmi că datele comenzii
                sunt corecte și că accepți termenii de vânzare, politica de
                retur și prelucrarea datelor necesare pentru livrare și
                facturare.
              </Text>
            </div>
          </div>
          <PaymentButton cart={cart} data-testid="submit-order-button" />
        </>
      )}
    </section>
  );
};

export default Review;
