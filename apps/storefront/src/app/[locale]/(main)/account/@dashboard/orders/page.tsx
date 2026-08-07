import { Metadata } from "next";

import OrderOverview from "@modules/account/components/order-overview";
import { notFound } from "next/navigation";
import { listOrders } from "@lib/data/orders";
import Divider from "@modules/common/components/divider";
import TransferRequestForm from "@modules/account/components/transfer-request-form";

export const metadata: Metadata = {
  title: "Comenzi",
  description: "Istoricul comenzilor tale DYLLU.",
};

export default async function Orders() {
  const orders = await listOrders();

  if (!orders) {
    notFound();
  }

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">Comenzi</h1>
        <p className="text-base-regular">
          Vezi comenzile plasate anterior și statusul lor. Dacă ai nevoie, poți
          solicita și transferul unei comenzi către contul tău.
        </p>
      </div>
      <div>
        <OrderOverview orders={orders} />
        <Divider className="my-16" />
        <TransferRequestForm />
      </div>
    </div>
  );
}
