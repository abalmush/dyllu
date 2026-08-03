import { expect, test } from "@playwright/test";
import { HttpTypes } from "@medusajs/types";

import { isValidMoldovaPostalCode } from "../src/lib/checkout/address";
import { findPayOnDeliveryProviderId } from "../src/lib/checkout/payment";
import { findDefaultShippingOptionId } from "../src/lib/checkout/shipping";
import { hasReadyPayOnDelivery } from "../src/lib/checkout/state";
import compareAddresses from "../src/lib/util/compare-addresses";

function checkoutCart(
  overrides: Partial<HttpTypes.StoreCart> = {}
): HttpTypes.StoreCart {
  return {
    currency_code: "mdl",
    ...overrides,
  } as HttpTypes.StoreCart;
}

test("checkout selects the predefined standard delivery option", () => {
  expect(
    findDefaultShippingOptionId([
      { id: "so_express", type: { code: "express" } },
      { id: "so_standard", type: { code: "standard" } },
    ])
  ).toBe("so_standard");
});

test("checkout fails closed when standard delivery is unavailable", () => {
  expect(
    findDefaultShippingOptionId([
      {
        id: "so_standard",
        type: { code: "standard" },
        insufficient_inventory: true,
      },
      { id: "so_express", type: { code: "express" } },
    ])
  ).toBeNull();
});

test("checkout selects the pay-on-delivery provider", () => {
  expect(
    findPayOnDeliveryProviderId([
      { id: "pp_paypal_paypal" },
      { id: "pp_system_default" },
    ])
  ).toBe("pp_system_default");
});

test("checkout requires a pending pay-on-delivery session", () => {
  expect(
    hasReadyPayOnDelivery(
      checkoutCart({
        total: 100,
        payment_collection: {
          payment_sessions: [
            { provider_id: "pp_system_default", status: "pending" },
          ],
        } as HttpTypes.StorePaymentCollection,
      })
    )
  ).toBe(true);
  expect(
    hasReadyPayOnDelivery(
      checkoutCart({
        total: 100,
        payment_collection: {
          payment_sessions: [
            { provider_id: "pp_paypal_paypal", status: "pending" },
          ],
        } as HttpTypes.StorePaymentCollection,
      })
    )
  ).toBe(false);
});

test("a zero-total checkout does not require a payment session", () => {
  expect(hasReadyPayOnDelivery(checkoutCart({ total: 0 }))).toBe(true);
});

test("Moldova postal codes accept the supported formats only", () => {
  expect(isValidMoldovaPostalCode("2001")).toBe(true);
  expect(isValidMoldovaPostalCode("MD-2001")).toBe(true);
  expect(isValidMoldovaPostalCode("MD 2001")).toBe(true);
  expect(isValidMoldovaPostalCode("201")).toBe(false);
  expect(isValidMoldovaPostalCode("RO-2001")).toBe(false);
});

test("address comparison preserves apartment details", () => {
  const address = {
    address_1: "Strada Test 1",
    address_2: null,
    city: "Chișinău",
  };

  expect(compareAddresses(address, { ...address, address_2: "" })).toBe(true);
  expect(compareAddresses(address, { ...address, address_2: "12" })).toBe(
    false
  );
});
