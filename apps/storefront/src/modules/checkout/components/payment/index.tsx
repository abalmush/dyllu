"use client";

import { RadioGroup } from "@headlessui/react";
import { paymentInfoMap } from "@lib/constants";
import { initiatePaymentSession } from "@lib/data/cart";
import { CheckCircleSolid, CreditCard } from "@medusajs/icons";
import { Button, Container, Heading, Text, clx } from "@lib/ui-compat";
import ErrorMessage from "@modules/checkout/components/error-message";
import PaymentContainer from "@modules/checkout/components/payment-container";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const Payment = ({
  cart,
  availablePaymentMethods,
}: {
  cart: any;
  availablePaymentMethods: any[];
}) => {
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession: any) => paymentSession.status === "pending"
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? ""
  );

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isOpen = searchParams.get("step") === "payment";

  const setPaymentMethod = (method: string) => {
    setError(null);
    setSelectedPaymentMethod(method);
  };

  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0;

  const paymentReady =
    (activeSession && cart?.shipping_methods.length !== 0) || paidByGiftcard;

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      params.set(name, value);
      return params.toString();
    },
    [searchParams]
  );

  const handleEdit = () => {
    router.push(pathname + "?" + createQueryString("step", "payment"), {
      scroll: false,
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const checkActiveSession =
        activeSession?.provider_id === selectedPaymentMethod;

      if (!checkActiveSession) {
        await initiatePaymentSession(cart, {
          provider_id: selectedPaymentMethod,
        });
      }

      return router.push(pathname + "?" + createQueryString("step", "review"), {
        scroll: false,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setError(null);
  }, [isOpen]);

  return (
    <section className="clip-corner-cut-lg clip-shadow-md bg-card p-6 ring-1 ring-border small:p-8">
      <div className="mb-6 flex flex-row items-center justify-between gap-4">
        <div className="space-y-2">
          <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Pasul 3
          </Text>
          <Heading
            level="h2"
            className={clx(
              "flex flex-row items-baseline gap-x-2 font-display text-xl font-bold tracking-tight text-foreground",
              {
                "pointer-events-none select-none opacity-50":
                  !isOpen && !paymentReady,
              }
            )}
          >
            Plată
            {!isOpen && paymentReady && <CheckCircleSolid />}
          </Heading>
          {isOpen && (
            <Text className="text-sm text-muted-foreground">
              Selectează metoda de plată și continuă către verificarea finală.
            </Text>
          )}
        </div>
        {!isOpen && paymentReady && (
          <Text>
            <button
              onClick={handleEdit}
              className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
              data-testid="edit-payment-button"
            >
              Editează
            </button>
          </Text>
        )}
      </div>
      <div>
        <div className={isOpen ? "block" : "hidden"}>
          {!paidByGiftcard && availablePaymentMethods?.length && (
            <RadioGroup
              value={selectedPaymentMethod}
              onChange={(value: string) => setPaymentMethod(value)}
            >
              {availablePaymentMethods.map((paymentMethod) => (
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
            <div className="clip-corner-cut-md flex flex-col bg-surface-subtle/60 p-4 ring-1 ring-border/70">
              <Text className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Metodă de plată
              </Text>
              <Text
                className="text-sm text-foreground"
                data-testid="payment-method-summary"
              >
                Card cadou
              </Text>
            </div>
          )}

          <ErrorMessage
            error={error}
            data-testid="payment-method-error-message"
          />

          <Button
            size="large"
            className="clip-corner-cut-sm mt-6 rounded-none"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!selectedPaymentMethod && !paidByGiftcard}
            data-testid="submit-payment-button"
          >
            Continuă către verificare
          </Button>
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {cart && paymentReady && activeSession ? (
            <div className="clip-corner-cut-md grid gap-5 bg-surface-subtle/60 p-5 ring-1 ring-border/70 small:grid-cols-2">
              <div className="flex flex-col">
                <Text className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Metodă de plată
                </Text>
                <Text
                  className="text-sm text-foreground"
                  data-testid="payment-method-summary"
                >
                  {paymentInfoMap[activeSession?.provider_id]?.title ||
                    activeSession?.provider_id}
                </Text>
              </div>
              <div className="flex flex-col">
                <Text className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Confirmare plată
                </Text>
                <div
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  data-testid="payment-details-summary"
                >
                  <Container className="clip-corner-cut-xs flex h-8 w-fit items-center bg-background px-3 ring-1 ring-border">
                    {paymentInfoMap[selectedPaymentMethod]?.icon || (
                      <CreditCard />
                    )}
                  </Container>
                  <Text>Ultimul pas este confirmarea finală a comenzii.</Text>
                </div>
              </div>
            </div>
          ) : paidByGiftcard ? (
            <div className="clip-corner-cut-md flex flex-col bg-surface-subtle/60 p-5 ring-1 ring-border/70">
              <Text className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Metodă de plată
              </Text>
              <Text
                className="text-sm text-foreground"
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
