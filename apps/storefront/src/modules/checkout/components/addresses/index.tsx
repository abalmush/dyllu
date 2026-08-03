"use client";

import compareAddresses from "@lib/util/compare-addresses";
import { HttpTypes } from "@medusajs/types";
import { Heading, Text, useToggleState } from "@lib/ui-compat";
import BillingAddress from "../billing_address";
import ShippingAddress from "../shipping-address";

const Addresses = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null;
  customer: HttpTypes.StoreCustomer | null;
}) => {
  const { state: sameAsBilling, toggle: toggleSameAsBilling } = useToggleState(
    cart?.shipping_address && cart?.billing_address
      ? compareAddresses(cart?.shipping_address, cart?.billing_address)
      : true
  );

  return (
    <section className="clip-corner-cut-lg clip-shadow-md bg-card ring-border small:p-8 p-6 ring-1">
      <div className="mb-6 flex flex-row items-center justify-between gap-4">
        <div className="space-y-2">
          <Text className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
            Contact și adresă
          </Text>
          <Heading
            level="h2"
            className="font-display text-foreground flex flex-row items-baseline gap-x-2 text-xl font-bold tracking-tight"
          >
            Date pentru livrare
          </Heading>
          <Text className="text-muted-foreground text-sm">
            Completează datele clientului și adresa unde trebuie să ajungă
            comanda.
          </Text>
        </div>
      </div>
      <div className="space-y-6">
        <ShippingAddress
          key={String(cart?.updated_at ?? cart?.id ?? "new")}
          customer={customer}
          checked={sameAsBilling}
          onChange={toggleSameAsBilling}
          cart={cart}
        />

        {!sameAsBilling && (
          <div className="clip-corner-cut-md bg-surface-subtle/60 ring-border/70 p-6 ring-1">
            <Heading
              level="h2"
              className="font-display text-foreground pb-2 text-lg font-bold tracking-tight"
            >
              Date de facturare
            </Heading>

            <BillingAddress cart={cart} />
          </div>
        )}
      </div>
    </section>
  );
};

export default Addresses;
