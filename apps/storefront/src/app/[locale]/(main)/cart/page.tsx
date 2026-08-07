import { retrieveCart } from "@lib/data/cart";
import { retrieveCustomer } from "@lib/data/customer";
import CartTemplate from "@modules/cart/templates";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coș",
  description:
    "Revizuiește produsele din coș și pregătește finalizarea comenzii.",
};

export default async function Cart() {
  const [cart, customer] = await Promise.all([
    retrieveCart(),
    retrieveCustomer(),
  ]);

  return <CartTemplate cart={cart} customer={customer} />;
}
