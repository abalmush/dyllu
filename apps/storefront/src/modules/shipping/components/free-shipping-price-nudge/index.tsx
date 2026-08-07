"use client";

import { convertToLocale } from "@lib/util/money";
import { isShippingOptionAllowedForAddress } from "@lib/shipping/delivery-area";
import { CheckCircleSolid, XMark } from "@medusajs/icons";
import {
  HttpTypes,
  StoreCart,
  StoreCartShippingOption,
  StorePrice,
} from "@medusajs/types";
import { Button, clx } from "@lib/ui-compat";
import LocalizedClientLink from "@modules/common/components/localized-client-link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { StoreFreeShippingPrice } from "types/global";

const computeTarget = (
  cart: HttpTypes.StoreCart,
  price: HttpTypes.StorePrice
) => {
  const priceRule = (price.price_rules || []).find(
    (pr) => pr.attribute === "item_total"
  );

  if (!priceRule) {
    return null;
  }

  const currentAmount = cart.item_total;
  const targetAmount = parseFloat(priceRule.value);

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return null;
  }

  if (priceRule.operator === "gt") {
    return {
      current_amount: currentAmount,
      target_amount: targetAmount,
      target_reached: currentAmount > targetAmount,
      target_remaining:
        currentAmount > targetAmount ? 0 : targetAmount + 1 - currentAmount,
      remaining_percentage: Math.min((currentAmount / targetAmount) * 100, 100),
    };
  } else if (priceRule.operator === "gte") {
    return {
      current_amount: currentAmount,
      target_amount: targetAmount,
      target_reached: currentAmount >= targetAmount,
      target_remaining:
        currentAmount >= targetAmount ? 0 : targetAmount - currentAmount,
      remaining_percentage: Math.min((currentAmount / targetAmount) * 100, 100),
    };
  } else if (priceRule.operator === "lt") {
    return {
      current_amount: currentAmount,
      target_amount: targetAmount,
      target_reached: targetAmount > currentAmount,
      target_remaining:
        targetAmount > currentAmount ? 0 : currentAmount + 1 - targetAmount,
      remaining_percentage: Math.min((currentAmount / targetAmount) * 100, 100),
    };
  } else if (priceRule.operator === "lte") {
    return {
      current_amount: currentAmount,
      target_amount: targetAmount,
      target_reached: targetAmount >= currentAmount,
      target_remaining:
        targetAmount >= currentAmount ? 0 : currentAmount - targetAmount,
      remaining_percentage: Math.min((currentAmount / targetAmount) * 100, 100),
    };
  } else {
    return {
      current_amount: currentAmount,
      target_amount: targetAmount,
      target_reached: currentAmount === targetAmount,
      target_remaining:
        targetAmount > currentAmount ? 0 : targetAmount - currentAmount,
      remaining_percentage: Math.min((currentAmount / targetAmount) * 100, 100),
    };
  }
};

export default function ShippingPriceNudge({
  variant = "inline",
  cart,
  shippingOptions,
}: {
  variant?: "popup" | "inline";
  cart: StoreCart;
  shippingOptions: StoreCartShippingOption[];
}) {
  if (!cart || !shippingOptions?.length) {
    return;
  }

  const freeShippingPrice = shippingOptions
    .filter((shippingOption) =>
      isShippingOptionAllowedForAddress(shippingOption, cart.shipping_address)
    )
    .map((shippingOption) => {
      const calculatedPrice = shippingOption.calculated_price;

      if (!calculatedPrice) {
        return;
      }

      const validCurrencyPrices = shippingOption.prices.filter(
        (price) =>
          price.currency_code === cart.currency_code &&
          (price.price_rules || []).some(
            (priceRule) => priceRule.attribute === "item_total"
          )
      );

      return validCurrencyPrices.map((price) => {
        const target = computeTarget(cart, price);
        if (!target) {
          return;
        }

        return {
          ...price,
          shipping_option_id: shippingOption.id,
          ...target,
        };
      });
    })
    .flat(1)
    .filter((price) => price !== undefined)

    .find((price) => price?.amount === 0);

  if (!freeShippingPrice) {
    return;
  }

  if (variant === "popup") {
    return <FreeShippingPopup cart={cart} price={freeShippingPrice} />;
  } else {
    return <FreeShippingInline cart={cart} price={freeShippingPrice} />;
  }
}

function FreeShippingInline({
  cart,
  price,
}: {
  cart: StoreCart;
  price: StorePrice & {
    target_reached: boolean;
    target_remaining: number;
    remaining_percentage: number;
  };
}) {
  const t = useTranslations("FreeShippingNudge");

  return (
    <div className="rounded-lg border bg-neutral-100 p-2">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-neutral-600">
          <div>
            {price.target_reached ? (
              <div className="flex items-center gap-1.5">
                <CheckCircleSolid className="inline-block text-green-500" />{" "}
                {t("activated")}
              </div>
            ) : (
              t("unlock")
            )}
          </div>

          <div
            className={clx("visible", {
              "invisible opacity-0": price.target_reached,
            })}
          >
            {t.rich("remaining", {
              value: convertToLocale({
                amount: price.target_remaining,
                currency_code: cart.currency_code,
              }),
              amount: (chunks) => (
                <span className="text-neutral-950">{chunks}</span>
              ),
            })}
          </div>
        </div>
        <div className="flex justify-between gap-1">
          <div
            className={clx(
              "h-1 max-w-full rounded-full bg-linear-to-r from-zinc-400 to-zinc-500 duration-500 ease-in-out",
              {
                "from-green-400 to-green-500": price.target_reached,
              }
            )}
            style={{ width: `${price.remaining_percentage}%` }}
          ></div>
          <div className="h-1 w-fit grow rounded-full bg-neutral-300"></div>
        </div>
      </div>
    </div>
  );
}

function FreeShippingPopup({
  cart,
  price,
}: {
  cart: StoreCart;
  price: StoreFreeShippingPrice;
}) {
  const t = useTranslations("FreeShippingNudge");
  const [isClosed, setIsClosed] = useState(false);

  return (
    <div
      className={clx(
        "fixed right-5 bottom-5 z-10 flex flex-col items-end gap-2 transition-all duration-500 ease-in-out",
        {
          "invisible opacity-0 delay-1000": price.target_reached,
          "invisible opacity-0": isClosed,
          "visible opacity-100": !price.target_reached && !isClosed,
        }
      )}
    >
      <div>
        <Button
          className="rounded-full border-none bg-neutral-900 p-2 text-sm shadow-none outline-hidden"
          onClick={() => setIsClosed(true)}
        >
          <XMark />
        </Button>
      </div>

      <div className="w-[400px] rounded-lg bg-black p-6 text-white">
        <div className="pb-4">
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-neutral-400">
              <div>
                {price.target_reached ? (
                  <div className="flex items-center gap-1.5">
                    <CheckCircleSolid className="inline-block text-green-500" />{" "}
                    {t("activated")}
                  </div>
                ) : (
                  t("unlock")
                )}
              </div>

              <div
                className={clx("visible", {
                  "invisible opacity-0": price.target_reached,
                })}
              >
                {t.rich("remaining", {
                  value: convertToLocale({
                    amount: price.target_remaining,
                    currency_code: cart.currency_code,
                  }),
                  amount: (chunks) => (
                    <span className="text-white">{chunks}</span>
                  ),
                })}
              </div>
            </div>
            <div className="flex justify-between gap-1">
              <div
                className={clx(
                  "h-1.5 max-w-full rounded-full bg-linear-to-r from-zinc-400 to-zinc-500 duration-500 ease-in-out",
                  {
                    "from-green-400 to-green-500": price.target_reached,
                  }
                )}
                style={{ width: `${price.remaining_percentage}%` }}
              ></div>
              <div className="h-1.5 w-fit grow rounded-full bg-zinc-600"></div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <LocalizedClientLink
            className="rounded-2xl border border-white bg-transparent px-4 py-2.5 text-sm shadow-none outline-hidden"
            href="/cart"
          >
            {t("viewCart")}
          </LocalizedClientLink>

          <LocalizedClientLink
            className="grow rounded-2xl border border-white bg-white px-4 py-2.5 text-center text-sm text-neutral-950 shadow-none outline-hidden"
            href="/store"
          >
            {t("viewProducts")}
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  );
}
