"use client";

import { setAddresses } from "@lib/data/cart";
import compareAddresses from "@lib/util/compare-addresses";
import { convertToLocale } from "@lib/util/money";
import { CheckCircleSolid } from "@medusajs/icons";
import { HttpTypes } from "@medusajs/types";
import { CheckoutStepKey } from "@modules/checkout/lib/presentation";
import { Heading, Text, useToggleState } from "@lib/ui-compat";
import Spinner from "@modules/common/icons/spinner";
import { usePathname, useRouter } from "next/navigation";
import { useActionState } from "react";
import BillingAddress from "../billing_address";
import ErrorMessage from "../error-message";
import ShippingAddress from "../shipping-address";
import { SubmitButton } from "../submit-button";

const Addresses = ({
  cart,
  customer,
  activeStep,
}: {
  cart: HttpTypes.StoreCart | null;
  customer: HttpTypes.StoreCustomer | null;
  activeStep: CheckoutStepKey;
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const isOpen = activeStep === "address";

  const { state: sameAsBilling, toggle: toggleSameAsBilling } = useToggleState(
    cart?.shipping_address && cart?.billing_address
      ? compareAddresses(cart?.shipping_address, cart?.billing_address)
      : true
  );

  const handleEdit = () => {
    router.push(pathname + "?step=address");
  };

  const [message, formAction] = useActionState(setAddresses, null);
  const selectedShippingMethod = cart?.shipping_methods?.at(-1);
  const showDeliveryMethodSummary =
    activeStep === "review" && !!selectedShippingMethod;

  return (
    <section className="clip-corner-cut-lg clip-shadow-md bg-card p-6 ring-1 ring-border small:p-8">
      <div className="mb-6 flex flex-row items-center justify-between gap-4">
        <div className="space-y-2">
          <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Pasul 1
          </Text>
          <Heading
            level="h2"
            className="flex flex-row items-baseline gap-x-2 font-display text-xl font-bold tracking-tight text-foreground"
          >
            Date de livrare
            {!isOpen && <CheckCircleSolid />}
          </Heading>
          {isOpen && (
            <Text className="text-sm text-muted-foreground">
              Completează datele clientului și adresa unde trebuie să ajungă
              comanda.
            </Text>
          )}
        </div>
        {!isOpen && cart?.shipping_address && (
          <Text>
            <button
              onClick={handleEdit}
              className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
              data-testid="edit-address-button"
            >
              Editează
            </button>
          </Text>
        )}
      </div>
      {isOpen ? (
        <form action={formAction} className="space-y-6">
          <div className="space-y-6">
            <ShippingAddress
              customer={customer}
              checked={sameAsBilling}
              onChange={toggleSameAsBilling}
              cart={cart}
            />

            {!sameAsBilling && (
              <div className="clip-corner-cut-md bg-surface-subtle/60 p-5 ring-1 ring-border/70">
                <Heading
                  level="h2"
                  className="pb-2 font-display text-lg font-bold tracking-tight text-foreground"
                >
                  Date de facturare
                </Heading>

                <BillingAddress cart={cart} />
              </div>
            )}
            <SubmitButton
              className="clip-corner-cut-sm mt-2 rounded-none"
              data-testid="submit-address-button"
            >
              Continuă către livrare
            </SubmitButton>
            <ErrorMessage error={message} data-testid="address-error-message" />
          </div>
        </form>
      ) : (
        <div className="text-sm">
          {cart && cart.shipping_address ? (
            <div className="clip-corner-cut-md bg-surface-subtle/60 p-5 ring-1 ring-border/70">
              <div
                className={
                  showDeliveryMethodSummary
                    ? "grid gap-5 small:grid-cols-2 medium:grid-cols-4"
                    : "grid gap-5 small:grid-cols-3"
                }
              >
                <div
                  className="flex flex-col"
                  data-testid="shipping-address-summary"
                >
                  <Text className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Livrare
                  </Text>
                  <Text className="text-sm text-foreground">
                    {cart.shipping_address.first_name}{" "}
                    {cart.shipping_address.last_name}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {cart.shipping_address.address_1}{" "}
                    {cart.shipping_address.address_2}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {cart.shipping_address.postal_code},{" "}
                    {cart.shipping_address.city}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {cart.shipping_address.country_code?.toUpperCase()}
                  </Text>
                </div>

                <div
                  className="flex flex-col"
                  data-testid="shipping-contact-summary"
                >
                  <Text className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Contact
                  </Text>
                  <Text className="text-sm text-foreground">
                    {cart.shipping_address.phone}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {cart.email}
                  </Text>
                </div>

                <div
                  className="flex flex-col"
                  data-testid="billing-address-summary"
                >
                  <Text className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Facturare
                  </Text>

                  {sameAsBilling ? (
                    <Text className="text-sm text-muted-foreground">
                      Folosește aceeași adresă ca la livrare.
                    </Text>
                  ) : (
                    <>
                      <Text className="text-sm text-foreground">
                        {cart.billing_address?.first_name}{" "}
                        {cart.billing_address?.last_name}
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        {cart.billing_address?.address_1}{" "}
                        {cart.billing_address?.address_2}
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        {cart.billing_address?.postal_code},{" "}
                        {cart.billing_address?.city}
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        {cart.billing_address?.country_code?.toUpperCase()}
                      </Text>
                    </>
                  )}
                </div>
                {showDeliveryMethodSummary && (
                  <div className="flex flex-col">
                    <Text className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Metodă de livrare
                    </Text>
                    <Text className="text-sm text-foreground">
                      {selectedShippingMethod?.name}
                    </Text>
                    {selectedShippingMethod?.amount !== undefined && (
                      <Text className="text-sm text-muted-foreground">
                        {selectedShippingMethod.amount === 0
                          ? "Gratuită"
                          : convertToLocale({
                              amount: selectedShippingMethod.amount,
                              currency_code: cart.currency_code,
                            })}
                      </Text>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <Spinner />
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default Addresses;
