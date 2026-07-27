"use client";

import { RadioGroup } from "@headlessui/react";
import { isManual, paymentInfoMap } from "@lib/constants";
import { initiatePaymentSession } from "@lib/data/cart";
import { CheckCircleSolid, CreditCard } from "@medusajs/icons";
import { HttpTypes } from "@medusajs/types";
import { Button, Container, Heading, Text, clx } from "@lib/ui-compat";
import ErrorMessage from "@modules/checkout/components/error-message";
import PaymentContainer from "@modules/checkout/components/payment-container";
import { CheckoutStepKey } from "@modules/checkout/lib/presentation";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type CheckoutCart = HttpTypes.StoreCart & {
  gift_cards?: Array<unknown> | null;
};

type PaymentMethod = {
  id: string;
};

const Payment = ({
  cart,
  availablePaymentMethods,
  activeStep,
}: {
  cart: CheckoutCart;
  availablePaymentMethods: PaymentMethod[];
  activeStep: CheckoutStepKey;
}) => {
  const supportedPaymentMethods = availablePaymentMethods.filter((method) =>
    isManual(method.id)
  );
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession) =>
      paymentSession.status === "pending" &&
      isManual(paymentSession.provider_id)
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? ""
  );

  const router = useRouter();
  const pathname = usePathname();

  const isOpen = activeStep === "payment";

  const setPaymentMethod = (method: string) => {
    setError(null);
    setSelectedPaymentMethod(method);
  };

  const paidByGiftcard = !!cart.gift_cards?.length && cart.total === 0;
  const hasSupportedPaymentMethod = supportedPaymentMethods.length > 0;

  const paymentReady =
    (activeSession && (cart.shipping_methods?.length ?? 0) !== 0) ||
    paidByGiftcard;

  const handleEdit = () => {
    setError(null);
    router.push(`${pathname}?step=payment`, {
      scroll: false,
    });
  };

  const handleSubmit = async () => {
    if (!paidByGiftcard && !isManual(selectedPaymentMethod)) {
      setError("Metoda de plată selectată nu este disponibilă.");
      return;
    }

    setIsLoading(true);
    try {
      const checkActiveSession =
        activeSession?.provider_id === selectedPaymentMethod;

      if (!paidByGiftcard && !checkActiveSession) {
        await initiatePaymentSession(selectedPaymentMethod);
      }

      router.push(`${pathname}?step=review`, {
        scroll: false,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nu am putut inițializa plata. Încearcă din nou."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="clip-corner-cut-lg clip-shadow-md bg-card ring-border small:p-8 p-6 ring-1">
      <div className="mb-6 flex flex-row items-center justify-between gap-4">
        <div className="space-y-2">
          <Text className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
            Pasul 3
          </Text>
          <Heading
            level="h2"
            className={clx(
              "font-display text-foreground flex flex-row items-baseline gap-x-2 text-xl font-bold tracking-tight",
              {
                "pointer-events-none opacity-50 select-none":
                  !isOpen && !paymentReady,
              }
            )}
          >
            Plată
            {!isOpen && paymentReady && <CheckCircleSolid />}
          </Heading>
          {isOpen && (
            <Text className="text-muted-foreground text-sm">
              Selectează metoda de plată și continuă către verificarea finală.
            </Text>
          )}
        </div>
        {!isOpen && paymentReady && (
          <Text>
            <button
              onClick={handleEdit}
              className="text-primary hover:text-primary/80 text-sm font-semibold transition-colors"
              data-testid="edit-payment-button"
            >
              Editează
            </button>
          </Text>
        )}
      </div>
      <div>
        <div className={isOpen ? "block" : "hidden"}>
          {!paidByGiftcard && hasSupportedPaymentMethod && (
            <RadioGroup
              value={selectedPaymentMethod}
              onChange={(value: string) => setPaymentMethod(value)}
            >
              {supportedPaymentMethods.map((paymentMethod) => (
                <div key={paymentMethod.id}>
                  <PaymentContainer
                    paymentInfoMap={paymentInfoMap}
                    paymentProviderId={paymentMethod.id}
                    selectedPaymentOptionId={selectedPaymentMethod}
                  />
                </div>
              ))}
            </RadioGroup>
          )}

          {paidByGiftcard && (
            <div className="clip-corner-cut-md bg-surface-subtle/60 ring-border/70 flex flex-col p-4 ring-1">
              <Text className="text-muted-foreground mb-1 text-xs font-semibold tracking-[0.18em] uppercase">
                Metodă de plată
              </Text>
              <Text
                className="text-foreground text-sm"
                data-testid="payment-method-summary"
              >
                Card cadou
              </Text>
            </div>
          )}

          <ErrorMessage
            error={
              error ??
              (!paidByGiftcard && !hasSupportedPaymentMethod
                ? "Momentan nu este disponibilă nicio metodă de plată. Contactează echipa DYLLU pentru ajutor."
                : null)
            }
            data-testid="payment-method-error-message"
          />

          <Button
            size="large"
            className="clip-corner-cut-sm mt-6 rounded-none"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={
              (!selectedPaymentMethod && !paidByGiftcard) ||
              (!paidByGiftcard && !hasSupportedPaymentMethod)
            }
            data-testid="submit-payment-button"
          >
            Continuă către verificare
          </Button>
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {cart && paymentReady && activeSession ? (
            <div className="clip-corner-cut-md bg-surface-subtle/60 ring-border/70 small:grid-cols-2 grid gap-6 p-6 ring-1">
              <div className="flex flex-col">
                <Text className="text-muted-foreground mb-1 text-xs font-semibold tracking-[0.18em] uppercase">
                  Metodă de plată
                </Text>
                <Text
                  className="text-foreground text-sm"
                  data-testid="payment-method-summary"
                >
                  {paymentInfoMap[activeSession?.provider_id]?.title ||
                    activeSession?.provider_id}
                </Text>
              </div>
              <div className="flex flex-col">
                <Text className="text-muted-foreground mb-1 text-xs font-semibold tracking-[0.18em] uppercase">
                  Confirmare plată
                </Text>
                <div
                  className="text-muted-foreground flex items-center gap-2 text-sm"
                  data-testid="payment-details-summary"
                >
                  <Container className="clip-corner-cut-xs bg-background ring-border flex h-8 w-fit items-center px-4 ring-1">
                    {paymentInfoMap[selectedPaymentMethod]?.icon || (
                      <CreditCard />
                    )}
                  </Container>
                  <Text>Ultimul pas este confirmarea finală a comenzii.</Text>
                </div>
              </div>
            </div>
          ) : paidByGiftcard ? (
            <div className="clip-corner-cut-md bg-surface-subtle/60 ring-border/70 flex flex-col p-6 ring-1">
              <Text className="text-muted-foreground mb-1 text-xs font-semibold tracking-[0.18em] uppercase">
                Metodă de plată
              </Text>
              <Text
                className="text-foreground text-sm"
                data-testid="payment-method-summary"
              >
                Card cadou
              </Text>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default Payment;
