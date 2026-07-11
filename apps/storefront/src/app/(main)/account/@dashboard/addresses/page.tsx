import { Metadata } from "next";
import { notFound } from "next/navigation";

import AddressBook from "@modules/account/components/address-book";

import { getRegion } from "@lib/data/regions";
import { retrieveCustomer } from "@lib/data/customer";

export const metadata: Metadata = {
  title: "Adrese",
  description: "Gestionează adresele salvate în contul tău DYLLU.",
};

export default async function Addresses() {
  const customer = await retrieveCustomer();
  const region = await getRegion();

  if (!customer || !region) {
    notFound();
  }

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">Adrese de livrare</h1>
        <p className="text-base-regular">
          Vezi și actualizează adresele de livrare. Poți salva mai multe adrese,
          iar acestea vor fi disponibile automat la checkout.
        </p>
      </div>
      <AddressBook customer={customer} region={region} />
    </div>
  );
}
