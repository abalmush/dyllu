import { Listbox, Transition } from "@headlessui/react";
import { ChevronUpDown } from "@medusajs/icons";
import { clx } from "@lib/ui-compat";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

import Radio from "@modules/common/components/radio";
import compareAddresses from "@lib/util/compare-addresses";
import { HttpTypes } from "@medusajs/types";

type AddressSelectProps = {
  addresses: HttpTypes.StoreCustomerAddress[];
  addressInput: Partial<HttpTypes.StoreCartAddress> | null;
  onSelect: (
    address:
      | HttpTypes.StoreCartAddress
      | HttpTypes.StoreCustomerAddress
      | undefined,
    email?: string
  ) => void;
};

const AddressSelect = ({
  addresses,
  addressInput,
  onSelect,
}: AddressSelectProps) => {
  const t = useTranslations("Checkout.addressSelect");
  const handleSelect = (id: string) => {
    const savedAddress = addresses.find((a) => a.id === id);
    if (savedAddress) {
      onSelect(savedAddress);
    }
  };

  const selectedAddress = useMemo(() => {
    return addresses.find((a) => compareAddresses(a, addressInput));
  }, [addresses, addressInput]);

  return (
    <Listbox onChange={handleSelect} value={selectedAddress?.id}>
      <div className="relative">
        <Listbox.Button
          className="border-border bg-background text-foreground focus-visible:border-foreground focus-visible:ring-ring/20 relative flex h-12 w-full cursor-default items-center justify-between rounded-md border px-4 text-left text-sm shadow-xs transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-0"
          data-testid="shipping-address-select"
        >
          {({ open }) => (
            <>
              <span className="block truncate pr-4">
                {selectedAddress ? selectedAddress.address_1 : t("placeholder")}
              </span>
              <ChevronUpDown
                className={clx(
                  "transition-rotate text-muted-foreground duration-200",
                  {
                    "rotate-180 transform": open,
                  }
                )}
              />
            </>
          )}
        </Listbox.Button>
        <Transition
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options
            className="border-border bg-card absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-xl border p-2 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)] focus:outline-hidden"
            data-testid="shipping-address-options"
          >
            {addresses.map((address) => {
              return (
                <Listbox.Option
                  key={address.id}
                  value={address.id}
                  className="hover:bg-surface-subtle relative mb-2 cursor-default rounded-lg px-4 py-4 transition-colors select-none last:mb-0"
                  data-testid="shipping-address-option"
                >
                  <div className="flex items-start gap-x-4">
                    <Radio
                      checked={selectedAddress?.id === address.id}
                      data-testid="shipping-address-radio"
                    />
                    <div className="flex flex-col">
                      <span className="text-foreground text-sm font-semibold tracking-tight">
                        {address.first_name} {address.last_name}
                      </span>
                      {address.company && (
                        <span className="text-muted-foreground text-sm">
                          {address.company}
                        </span>
                      )}
                      <div className="text-muted-foreground mt-2 flex flex-col text-left text-sm">
                        <span>
                          {address.address_1}
                          {address.address_2 && (
                            <span>, {address.address_2}</span>
                          )}
                        </span>
                        <span>
                          {address.postal_code}, {address.city}
                        </span>
                        <span>
                          {address.province && `${address.province}, `}
                          {address.country_code?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Listbox.Option>
              );
            })}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
};

export default AddressSelect;
