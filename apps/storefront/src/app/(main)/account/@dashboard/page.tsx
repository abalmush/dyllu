import { Metadata } from "next";

import Overview from "@modules/account/components/overview";
import { notFound } from "next/navigation";
import { retrieveCustomer } from "@lib/data/customer";
import { listOrders } from "@lib/data/orders";

export const metadata: Metadata = {
  title: "Cont",
  description: "Privire de ansamblu asupra activității din contul tău DYLLU.",
};

export default async function OverviewTemplate() {
  const [customer, orders] = await Promise.all([
    retrieveCustomer(),
    listOrders(),
  ]);

  if (!customer) {
    notFound();
  }

  return <Overview customer={customer} orders={orders} />;
}
