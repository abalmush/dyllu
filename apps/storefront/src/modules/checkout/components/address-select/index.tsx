import { Listbox, Transition } from "@headlessui/react";
import { ChevronUpDown } from "@medusajs/icons";
import { clx } from "@lib/ui-compat";
import { Fragment, useMemo } from "react";

import Radio from "@modules/common/components/radio";
import compareAddresses from "@lib/util/compare-addresses";
import { HttpTypes } from "@medusajs/types";

type AddressSelectProps = {
  addresses: HttpTypes.StoreCustomerAddress[];
  addressInput: HttpTypes.StoreCartAddress | null;
  onSelect: (
    address: HttpTypes.StoreCartAddress | undefined,
    email?: string
  ) => void;
};

const AddressSelect = ({
  addresses,
  addressInput,
  onSelect,
}: AddressSelectProps) => {
  const handleSelect = (id: string) => {
    const savedAddress = addresses.find((a) => a.id === id);
    if (savedAddress) {
      onSelect(savedAddress as HttpTypes.StoreCartAddress);
    }
  };

  const selectedAddress = useMemo(() => {
    return addresses.find((a) => compareAddresses(a, addressInput));
  }, [addresses, addressInput]);

  return (
    <Listbox onChange={handleSelect} value={selectedAddress?.id}>
      <div className="relative">
        <Listbox.Button
          className="relative flex h-12 w-full cursor-default items-center justify-between rounded-md border border-border bg-background px-4 text-left text-sm text-foreground shadow-sm transition-colors focus:outline-none focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0"
          data-testid="shipping-address-select"
        >
          {({ open }) => (
            <>
              <span className="block truncate pr-4">
                {selectedAddress
                  ? selectedAddress.address_1
                  : "Alege o adresă salvată"}
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
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options
            className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-border bg-card p-2 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)] focus:outline-none"
            data-testid="shipping-address-options"
          >
            {addresses.map((address) => {
              return (
                <Listbox.Option
                  key={address.id}
                  value={address.id}
                  className="relative mb-2 cursor-default select-none rounded-lg px-4 py-4 transition-colors last:mb-0 hover:bg-surface-subtle"
                  data-testid="shipping-address-option"
                >
                  <div className="flex items-start gap-x-4">
                    <Radio
                      checked={selectedAddress?.id === address.id}
                      data-testid="shipping-address-radio"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold tracking-tight text-foreground">
                        {address.first_name} {address.last_name}
                      </span>
                      {address.company && (
                        <span className="text-sm text-muted-foreground">
                          {address.company}
                        </span>
                      )}
                      <div className="mt-2 flex flex-col text-left text-sm text-muted-foreground">
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
