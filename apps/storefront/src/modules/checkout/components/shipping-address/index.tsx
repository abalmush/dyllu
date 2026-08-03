import { HttpTypes } from "@medusajs/types";
import { Container } from "@lib/ui-compat";
import { MD_POSTAL_CODE_PATTERN, MD_POSTAL_CODE_TITLE } from "@lib/constants";
import Checkbox from "@modules/common/components/checkbox";
import Input from "@modules/common/components/input";
import React, { useMemo, useState } from "react";
import AddressSelect from "../address-select";
import CountrySelect from "../country-select";

const ShippingAddress = ({
  customer,
  cart,
  checked,
  onChange,
}: {
  customer: HttpTypes.StoreCustomer | null;
  cart: HttpTypes.StoreCart | null;
  checked: boolean;
  onChange: () => void;
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({
    "shipping_address.first_name": cart?.shipping_address?.first_name || "",
    "shipping_address.last_name": cart?.shipping_address?.last_name || "",
    "shipping_address.address_1": cart?.shipping_address?.address_1 || "",
    "shipping_address.address_2": cart?.shipping_address?.address_2 || "",
    "shipping_address.company": cart?.shipping_address?.company || "",
    "shipping_address.postal_code": cart?.shipping_address?.postal_code || "",
    "shipping_address.city": cart?.shipping_address?.city || "",
    "shipping_address.country_code": cart?.shipping_address?.country_code || "",
    "shipping_address.province": cart?.shipping_address?.province || "",
    "shipping_address.phone": cart?.shipping_address?.phone || "",
    email: cart?.email || customer?.email || "",
  });

  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2),
    [cart?.region]
  );

  const addressesInRegion = useMemo(
    () =>
      customer?.addresses.filter(
        (a) => a.country_code && countriesInRegion?.includes(a.country_code)
      ),
    [customer?.addresses, countriesInRegion]
  );

  const setFormAddress = (
    address?: HttpTypes.StoreCartAddress | HttpTypes.StoreCustomerAddress,
    email?: string
  ) => {
    if (address) {
      setFormData((prevState) => ({
        ...prevState,
        "shipping_address.first_name": address?.first_name || "",
        "shipping_address.last_name": address?.last_name || "",
        "shipping_address.address_1": address?.address_1 || "",
        "shipping_address.address_2": address?.address_2 || "",
        "shipping_address.company": address?.company || "",
        "shipping_address.postal_code": address?.postal_code || "",
        "shipping_address.city": address?.city || "",
        "shipping_address.country_code": address?.country_code || "",
        "shipping_address.province": address?.province || "",
        "shipping_address.phone": address?.phone || "",
      }));
    }

    if (email) {
      setFormData((prevState) => ({
        ...prevState,
        email: email,
      }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      {customer && (addressesInRegion?.length || 0) > 0 && (
        <Container className="clip-corner-cut-md bg-surface-subtle/60 ring-border mb-6 flex flex-col gap-y-4 p-6 ring-1">
          <p className="text-muted-foreground text-sm">
            {`Salut${customer.first_name ? `, ${customer.first_name}` : ""}. Poți porni de la una dintre adresele salvate.`}
          </p>
          <AddressSelect
            addresses={addressesInRegion ?? []}
            addressInput={{
              first_name: formData["shipping_address.first_name"],
              last_name: formData["shipping_address.last_name"],
              address_1: formData["shipping_address.address_1"],
              address_2: formData["shipping_address.address_2"],
              company: formData["shipping_address.company"],
              postal_code: formData["shipping_address.postal_code"],
              city: formData["shipping_address.city"],
              country_code: formData["shipping_address.country_code"],
              province: formData["shipping_address.province"],
              phone: formData["shipping_address.phone"],
            }}
            onSelect={setFormAddress}
          />
        </Container>
      )}
      <div className="small:grid-cols-2 grid grid-cols-1 gap-4">
        <Input
          label="Prenume"
          name="shipping_address.first_name"
          autoComplete="given-name"
          value={formData["shipping_address.first_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-first-name-input"
        />
        <Input
          label="Nume"
          name="shipping_address.last_name"
          autoComplete="family-name"
          value={formData["shipping_address.last_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-last-name-input"
        />
        <Input
          label="Adresă"
          name="shipping_address.address_1"
          autoComplete="address-line1"
          value={formData["shipping_address.address_1"]}
          onChange={handleChange}
          required
          data-testid="shipping-address-input"
        />
        <Input
          label="Apartament, scară, etaj"
          name="shipping_address.address_2"
          autoComplete="address-line2"
          value={formData["shipping_address.address_2"]}
          onChange={handleChange}
          data-testid="shipping-address-2-input"
        />
        <Input
          label="Companie"
          name="shipping_address.company"
          value={formData["shipping_address.company"]}
          onChange={handleChange}
          autoComplete="organization"
          data-testid="shipping-company-input"
        />
        <Input
          label="Cod poștal"
          name="shipping_address.postal_code"
          autoComplete="postal-code"
          value={formData["shipping_address.postal_code"]}
          onChange={handleChange}
          required
          pattern={MD_POSTAL_CODE_PATTERN}
          title={MD_POSTAL_CODE_TITLE}
          data-testid="shipping-postal-code-input"
        />
        <div className="flex flex-col gap-2">
          <Input
            label="Oraș / Localitate"
            name="shipping_address.city"
            autoComplete="address-level2"
            value={formData["shipping_address.city"]}
            onChange={handleChange}
            required
            list="moldova-delivery-localities"
            aria-describedby="shipping-city-help"
            data-testid="shipping-city-input"
          />
          <datalist id="moldova-delivery-localities">
            <option value="Chișinău" />
            <option value="Botanica" />
            <option value="Buiucani" />
            <option value="Centru" />
            <option value="Ciocana" />
            <option value="sector Rîșcani" />
          </datalist>
          <p
            id="shipping-city-help"
            className="text-muted-foreground text-xs leading-relaxed"
          >
            Pentru livrare în orașul Chișinău poți indica Chișinău sau sectorul.
            Suburbiile municipiului sunt considerate livrare în țară.
          </p>
        </div>
        <CountrySelect
          name="shipping_address.country_code"
          autoComplete="country"
          region={cart?.region}
          value={formData["shipping_address.country_code"]}
          onChange={handleChange}
          required
          data-testid="shipping-country-select"
        />
        <Input
          label="Raion / Provincie"
          name="shipping_address.province"
          autoComplete="address-level1"
          value={formData["shipping_address.province"]}
          onChange={handleChange}
          data-testid="shipping-province-input"
        />
      </div>
      <div className="my-8">
        <Checkbox
          label="Adresa de facturare este aceeași cu adresa de livrare"
          name="same_as_billing"
          checked={checked}
          onChange={onChange}
          data-testid="billing-address-checkbox"
        />
      </div>
      <div className="small:grid-cols-2 mb-4 grid grid-cols-1 gap-4">
        <Input
          label="Email"
          name="email"
          type="email"
          title="Introdu o adresă de email validă."
          autoComplete="email"
          spellCheck={false}
          value={formData.email}
          onChange={handleChange}
          required
          data-testid="shipping-email-input"
        />
        <Input
          label="Telefon"
          name="shipping_address.phone"
          type="tel"
          autoComplete="tel"
          value={formData["shipping_address.phone"]}
          onChange={handleChange}
          required
          data-testid="shipping-phone-input"
        />
      </div>
    </>
  );
};

export default ShippingAddress;
