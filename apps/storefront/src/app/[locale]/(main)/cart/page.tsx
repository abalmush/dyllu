import { retrieveCart } from "@lib/data/cart";
import { retrieveCustomer } from "@lib/data/customer";
import CartTemplate from "@modules/cart/templates";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Cart");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function Cart() {
  const [cart, customer] = await Promise.all([
    retrieveCart(),
    retrieveCustomer(),
  ]);

  return <CartTemplate cart={cart} customer={customer} />;
}
