"use client";

import { Radio, RadioGroup } from "@headlessui/react";
import { setShippingMethod } from "@lib/data/cart";
import { calculatePriceForShippingOption } from "@lib/data/fulfillment";
import { convertToLocale } from "@lib/util/money";
import { CheckCircleSolid, Loader } from "@medusajs/icons";
import { HttpTypes } from "@medusajs/types";
import { CheckoutStepKey } from "@modules/checkout/lib/presentation";
import { Button, clx, Heading, Text } from "@lib/ui-compat";
import ErrorMessage from "@modules/checkout/components/error-message";
import MedusaRadio from "@modules/common/components/radio";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function getFreeShippingThreshold(option: HttpTypes.StoreCartShippingOption) {
  const freePrice = option.prices.find(
    (price) =>
      price.amount === 0 &&
      price.price_rules?.some((rule) => rule.attribute === "item_total")
  );
  const rule = freePrice?.price_rules?.find(
    (priceRule) => priceRule.attribute === "item_total"
  );
  const threshold = Number(rule?.value);

  return Number.isFinite(threshold) ? threshold : null;
}

const PICKUP_OPTION_ON = "__PICKUP_ON";
const PICKUP_OPTION_OFF = "__PICKUP_OFF";
const EMPTY_CALCULATED_PRICES: Record<string, number> = {};

type ShippingProps = {
  cart: HttpTypes.StoreCart;
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null;
  activeStep: CheckoutStepKey;
};

type ShippingOptionWithZone = HttpTypes.StoreCartShippingOption & {
  service_zone?: {
    fulfillment_set?: {
      type?: string;
      location?: {
        address?: HttpTypes.StoreCartAddress;
      };
    };
  };
};

function formatAddress(address?: HttpTypes.StoreCartAddress) {
  if (!address) {
    return "";
  }

  let ret = "";

  if (address.address_1) {
    ret += ` ${address.address_1}`;
  }

  if (address.address_2) {
    ret += `, ${address.address_2}`;
  }

  if (address.postal_code) {
    ret += `, ${address.postal_code} ${address.city}`;
  }

  if (address.country_code) {
    ret += `, ${address.country_code.toUpperCase()}`;
  }

  return ret;
}

const Shipping: React.FC<ShippingProps> = ({
  cart,
  availableShippingMethods,
  activeStep,
}) => {
  const shippingMethods = useMemo(
    () =>
      availableShippingMethods?.filter(
        (method) => getFulfillmentType(method) !== "pickup"
      ) ?? [],
    [availableShippingMethods]
  );
  const pickupMethods = useMemo(
    () =>
      availableShippingMethods?.filter(
        (method) => getFulfillmentType(method) === "pickup"
      ) ?? [],
    [availableShippingMethods]
  );
  const calculatedShippingMethods = useMemo(
    () =>
      shippingMethods.filter((method) => method.price_type === "calculated"),
    [shippingMethods]
  );
  const calculatedPriceKey = JSON.stringify(
    calculatedShippingMethods.map((method) => method.id)
  );
  const initialShippingMethodId =
    cart.shipping_methods?.at(-1)?.shipping_option_id || null;

  const [isLoading, setIsLoading] = useState(false);
  const [showPickupOptions, setShowPickupOptions] = useState<string>(() =>
    pickupMethods.some((method) => method.id === initialShippingMethodId)
      ? PICKUP_OPTION_ON
      : PICKUP_OPTION_OFF
  );
  const [calculatedPriceState, setCalculatedPriceState] = useState<{
    key: string;
    prices: Record<string, number>;
  }>({ key: "", prices: EMPTY_CALCULATED_PRICES });
  const [error, setError] = useState<string | null>(null);
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    initialShippingMethodId
  );

  const router = useRouter();
  const pathname = usePathname();

  const isOpen = activeStep === "delivery";
  const hasPickupOptions = pickupMethods.length > 0;
  const isLoadingPrices =
    calculatedShippingMethods.length > 0 &&
    calculatedPriceState.key !== calculatedPriceKey;
  const calculatedPricesMap =
    calculatedPriceState.key === calculatedPriceKey
      ? calculatedPriceState.prices
      : EMPTY_CALCULATED_PRICES;

  useEffect(() => {
    if (calculatedShippingMethods.length === 0) {
      return;
    }

    let cancelled = false;
    const promises = calculatedShippingMethods.map((method) =>
      calculatePriceForShippingOption(method.id)
    );

    void Promise.allSettled(promises).then((results) => {
      if (cancelled) {
        return;
      }

      const prices: Record<string, number> = {};
      for (const result of results) {
        if (
          result.status === "fulfilled" &&
          result.value &&
          typeof result.value.amount === "number"
        ) {
          prices[result.value.id] = result.value.amount;
        }
      }

      setCalculatedPriceState({ key: calculatedPriceKey, prices });
    });

    return () => {
      cancelled = true;
    };
  }, [calculatedPriceKey, calculatedShippingMethods]);

  const handleEdit = () => {
    setError(null);
    router.push(pathname + "?step=delivery", { scroll: false });
  };

  const handleSubmit = () => {
    router.push(pathname + "?step=payment", { scroll: false });
  };

  const handleSetShippingMethod = async (
    id: string,
    variant: "shipping" | "pickup"
  ) => {
    setError(null);

    if (variant === "pickup") {
      setShowPickupOptions(PICKUP_OPTION_ON);
    } else {
      setShowPickupOptions(PICKUP_OPTION_OFF);
    }

    let currentId: string | null = null;
    setIsLoading(true);
    setShippingMethodId((prev) => {
      currentId = prev;
      return id;
    });

    await setShippingMethod(id)
      .catch((err) => {
        setShippingMethodId(currentId);

        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  if (activeStep === "review" && (cart.shipping_methods?.length ?? 0) > 0) {
    return null;
  }

  return (
    <section className="clip-corner-cut-lg clip-shadow-md bg-card ring-border small:p-8 p-6 ring-1">
      <div className="mb-6 flex flex-row items-center justify-between gap-4">
        <div className="space-y-2">
          <Text className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
            Pasul 2
          </Text>
          <Heading
            level="h2"
            className={clx(
              "font-display text-foreground flex flex-row items-baseline gap-x-2 text-xl font-bold tracking-tight",
              {
                "pointer-events-none opacity-50 select-none":
                  !isOpen && cart.shipping_methods?.length === 0,
              }
            )}
          >
            Livrare
            {!isOpen && (cart.shipping_methods?.length ?? 0) > 0 && (
              <CheckCircleSolid />
            )}
          </Heading>
          {isOpen && (
            <Text className="text-muted-foreground text-sm">
              Alege varianta de livrare sau ridicare care se potrivește cel mai
              bine comenzii tale.
            </Text>
          )}
        </div>
        {!isOpen &&
          cart?.shipping_address &&
          cart?.billing_address &&
          cart?.email && (
            <Text>
              <button
                onClick={handleEdit}
                className="text-primary hover:text-primary/80 text-sm font-semibold transition-colors"
                data-testid="edit-delivery-button"
              >
                Editează
              </button>
            </Text>
          )}
      </div>
      {isOpen ? (
        <>
          <div className="grid gap-4">
            <div className="clip-corner-cut-md bg-surface-subtle/60 ring-border/70 flex flex-col p-4 ring-1">
              <span className="text-foreground text-sm font-semibold tracking-tight">
                Metodă de livrare
              </span>
              <span className="text-muted-foreground mt-1 text-sm">
                Alege cum vrei să primești comanda.
              </span>
            </div>
            <div data-testid="delivery-options-container">
              <div className="pt-1">
                {hasPickupOptions && (
                  <RadioGroup
                    value={showPickupOptions}
                    onChange={() => {
                      const id = pickupMethods.find(
                        (option) => !option.insufficient_inventory
                      )?.id;

                      if (id) {
                        handleSetShippingMethod(id, "pickup");
                      }
                    }}
                  >
                    <Radio
                      value={PICKUP_OPTION_ON}
                      data-testid="delivery-option-radio"
                      className={clx(
                        "border-border bg-background hover:border-foreground/30 hover:bg-surface-subtle mb-4 flex cursor-pointer items-center justify-between rounded-2xl border px-6 py-4 transition-colors",
                        {
                          "border-foreground bg-surface-subtle ring-foreground/10 ring-1":
                            showPickupOptions === PICKUP_OPTION_ON,
                        }
                      )}
                    >
                      <div className="flex items-center gap-x-4">
                        <MedusaRadio
                          checked={showPickupOptions === PICKUP_OPTION_ON}
                        />
                        <span className="text-foreground text-sm font-semibold tracking-tight">
                          Ridicare din showroom
                        </span>
                      </div>
                      <span className="text-foreground text-sm font-semibold">
                        -
                      </span>
                    </Radio>
                  </RadioGroup>
                )}
                <RadioGroup
                  value={shippingMethodId}
                  onChange={(v) => {
                    if (v) {
                      return handleSetShippingMethod(v, "shipping");
                    }
                  }}
                >
                  {shippingMethods.map((option) => {
                    const isDisabled =
                      option.price_type === "calculated" &&
                      !isLoadingPrices &&
                      typeof calculatedPricesMap[option.id] !== "number";
                    const freeShippingThreshold =
                      getFreeShippingThreshold(option);

                    return (
                      <Radio
                        key={option.id}
                        value={option.id}
                        data-testid="delivery-option-radio"
                        disabled={isDisabled}
                        className={clx(
                          "border-border bg-background hover:border-foreground/30 hover:bg-surface-subtle mb-4 flex cursor-pointer items-center justify-between rounded-2xl border px-6 py-4 transition-colors",
                          {
                            "border-foreground bg-surface-subtle ring-foreground/10 ring-1":
                              option.id === shippingMethodId,
                            "hover:border-border hover:bg-background cursor-not-allowed opacity-60":
                              isDisabled,
                          }
                        )}
                      >
                        <div className="flex items-start gap-x-4">
                          <MedusaRadio
                            checked={option.id === shippingMethodId}
                          />
                          <span className="flex flex-col">
                            <span className="text-foreground text-sm font-semibold tracking-tight">
                              {option.name}
                            </span>
                            {freeShippingThreshold !== null && (
                              <span className="text-muted-foreground mt-1 text-xs">
                                Gratuit de la{" "}
                                {convertToLocale({
                                  amount: freeShippingThreshold,
                                  currency_code: cart.currency_code,
                                })}
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-foreground text-sm font-semibold">
                          {option.price_type === "flat" ? (
                            convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })
                          ) : typeof calculatedPricesMap[option.id] ===
                            "number" ? (
                            convertToLocale({
                              amount: calculatedPricesMap[option.id],
                              currency_code: cart?.currency_code,
                            })
                          ) : isLoadingPrices ? (
                            <Loader />
                          ) : (
                            "-"
                          )}
                        </span>
                      </Radio>
                    );
                  })}
                </RadioGroup>
              </div>
            </div>
          </div>

          {showPickupOptions === PICKUP_OPTION_ON && (
            <div className="grid gap-4">
              <div className="clip-corner-cut-md bg-surface-subtle/60 ring-border/70 flex flex-col p-4 ring-1">
                <span className="text-foreground text-sm font-semibold tracking-tight">
                  Magazin
                </span>
                <span className="text-muted-foreground mt-1 text-sm">
                  Alege punctul de ridicare cel mai convenabil.
                </span>
              </div>
              <div data-testid="delivery-options-container">
                <div className="pt-1">
                  <RadioGroup
                    value={shippingMethodId}
                    onChange={(v) => {
                      if (v) {
                        return handleSetShippingMethod(v, "pickup");
                      }
                    }}
                  >
                    {pickupMethods.map((option) => {
                      return (
                        <Radio
                          key={option.id}
                          value={option.id}
                          disabled={option.insufficient_inventory}
                          data-testid="delivery-option-radio"
                          className={clx(
                            "border-border bg-background hover:border-foreground/30 hover:bg-surface-subtle mb-4 flex cursor-pointer items-center justify-between rounded-2xl border px-6 py-4 transition-colors",
                            {
                              "border-foreground bg-surface-subtle ring-foreground/10 ring-1":
                                option.id === shippingMethodId,
                              "hover:border-border hover:bg-background cursor-not-allowed opacity-60":
                                option.insufficient_inventory,
                            }
                          )}
                        >
                          <div className="flex items-start gap-x-4">
                            <MedusaRadio
                              checked={option.id === shippingMethodId}
                            />
                            <div className="flex flex-col">
                              <span className="text-foreground text-sm font-semibold tracking-tight">
                                {option.name}
                              </span>
                              <span className="text-muted-foreground text-sm">
                                {formatAddress(getPickupAddress(option))}
                              </span>
                            </div>
                          </div>
                          <span className="text-foreground text-sm font-semibold">
                            {convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })}
                          </span>
                        </Radio>
                      );
                    })}
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          <div>
            <ErrorMessage
              error={error}
              data-testid="delivery-option-error-message"
            />
            <Button
              size="large"
              className="clip-corner-cut-sm mt-2 rounded-none"
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={!cart.shipping_methods?.[0]}
              data-testid="submit-delivery-option-button"
            >
              Continuă către plată
            </Button>
          </div>
        </>
      ) : (
        <div className="clip-corner-cut-md bg-surface-subtle/60 ring-border/70 p-6 ring-1">
          <div className="text-sm">
            {cart && (cart.shipping_methods?.length ?? 0) > 0 && (
              <div className="flex flex-col">
                <Text className="text-muted-foreground mb-1 text-xs font-semibold tracking-[0.18em] uppercase">
                  Metodă selectată
                </Text>
                <Text className="text-foreground text-sm">
                  {cart.shipping_methods!.at(-1)!.name}{" "}
                  {convertToLocale({
                    amount: cart.shipping_methods!.at(-1)!.amount!,
                    currency_code: cart?.currency_code,
                  })}
                </Text>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default Shipping;

function getFulfillmentType(option: HttpTypes.StoreCartShippingOption) {
  return (option as ShippingOptionWithZone).service_zone?.fulfillment_set?.type;
}

function getPickupAddress(option: HttpTypes.StoreCartShippingOption) {
  return (option as ShippingOptionWithZone).service_zone?.fulfillment_set
    ?.location?.address;
}
