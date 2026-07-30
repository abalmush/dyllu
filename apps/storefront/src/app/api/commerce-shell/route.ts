import { NextResponse } from "next/server";

import { listCartOptions, retrieveCart } from "@lib/data/cart";
import { retrieveCustomer } from "@lib/data/customer";
import { HttpTypes } from "@medusajs/types";

export const dynamic = "force-dynamic";

export type CommerceShellResponse = {
  cart: HttpTypes.StoreCart | null;
  authenticated: boolean;
  shippingOptions: HttpTypes.StoreCartShippingOption[];
};

export async function GET() {
  const [cart, customer] = await Promise.all([
    retrieveCart(),
    retrieveCustomer(),
  ]);

  const shippingOptions = cart
    ? (await listCartOptions()).shipping_options
    : [];

  const body: CommerceShellResponse = {
    cart,
    authenticated: customer !== null,
    shippingOptions,
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
