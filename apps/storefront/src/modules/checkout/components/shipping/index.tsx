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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const PICKUP_OPTION_ON = "__PICKUP_ON";
const PICKUP_OPTION_OFF = "__PICKUP_OFF";

type ShippingProps = {
  cart: HttpTypes.StoreCart;
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null;
  activeStep?: CheckoutStepKey;
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
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);

  const [showPickupOptions, setShowPickupOptions] =
    useState<string>(PICKUP_OPTION_OFF);
  const [calculatedPricesMap, setCalculatedPricesMap] = useState<
    Record<string, number>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    cart.shipping_methods?.at(-1)?.shipping_option_id || null
  );

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isOpen = searchParams.get("step") === "delivery";

  const _shippingMethods = availableShippingMethods?.filter(
    (sm) => getFulfillmentType(sm) !== "pickup"
  );

  const _pickupMethods = availableShippingMethods?.filter(
    (sm) => getFulfillmentType(sm) === "pickup"
  );

  const hasPickupOptions = !!_pickupMethods?.length;

  useEffect(() => {
    setIsLoadingPrices(true);

    if (_shippingMethods?.length) {
      const promises = _shippingMethods
        .filter((sm) => sm.price_type === "calculated")
        .map((sm) => calculatePriceForShippingOption(sm.id, cart.id));

      if (promises.length) {
        Promise.allSettled(promises).then((res) => {
          const pricesMap: Record<string, number> = {};
          res
            .filter((r) => r.status === "fulfilled")
            .forEach((p) => (pricesMap[p.value?.id || ""] = p.value?.amount!));

          setCalculatedPricesMap(pricesMap);
          setIsLoadingPrices(false);
        });
      }
    }

    if (_pickupMethods?.find((m) => m.id === shippingMethodId)) {
      setShowPickupOptions(PICKUP_OPTION_ON);
    }
  }, [availableShippingMethods]);

  const handleEdit = () => {
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

    await setShippingMethod({ cartId: cart.id, shippingMethodId: id })
      .catch((err) => {
        setShippingMethodId(currentId);

        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    setError(null);
  }, [isOpen]);

  if (activeStep === "review" && (cart.shipping_methods?.length ?? 0) > 0) {
    return null;
  }

  return (
    <section className="clip-corner-cut-lg clip-shadow-md bg-card p-6 ring-1 ring-border small:p-8">
      <div className="mb-6 flex flex-row items-center justify-between gap-4">
        <div className="space-y-2">
          <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Pasul 2
          </Text>
          <Heading
            level="h2"
            className={clx(
              "flex flex-row items-baseline gap-x-2 font-display text-xl font-bold tracking-tight text-foreground",
              {
                "pointer-events-none select-none opacity-50":
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
            <Text className="text-sm text-muted-foreground">
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
                className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
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
            <div className="clip-corner-cut-md flex flex-col bg-surface-subtle/60 p-4 ring-1 ring-border/70">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Metodă de livrare
              </span>
              <span className="mt-1 text-sm text-muted-foreground">
                Alege cum vrei să primești comanda.
              </span>
            </div>
            <div data-testid="delivery-options-container">
              <div className="pt-1">
                {hasPickupOptions && (
                  <RadioGroup
                    value={showPickupOptions}
                    onChange={() => {
                      const id = _pickupMethods.find(
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
                        "mb-3 flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-background px-5 py-4 transition-colors hover:border-foreground/30 hover:bg-surface-subtle",
                        {
                          "border-foreground bg-surface-subtle ring-1 ring-foreground/10":
                            showPickupOptions === PICKUP_OPTION_ON,
                        }
                      )}
                    >
                      <div className="flex items-center gap-x-4">
                        <MedusaRadio
                          checked={showPickupOptions === PICKUP_OPTION_ON}
                        />
                        <span className="text-sm font-semibold tracking-tight text-foreground">
                          Ridicare din showroom
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
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
                  {_shippingMethods?.map((option) => {
                    const isDisabled =
                      option.price_type === "calculated" &&
                      !isLoadingPrices &&
                      typeof calculatedPricesMap[option.id] !== "number";

                    return (
                      <Radio
                        key={option.id}
                        value={option.id}
                        data-testid="delivery-option-radio"
                        disabled={isDisabled}
                        className={clx(
                          "mb-3 flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-background px-5 py-4 transition-colors hover:border-foreground/30 hover:bg-surface-subtle",
                          {
                            "border-foreground bg-surface-subtle ring-1 ring-foreground/10":
                              option.id === shippingMethodId,
                            "cursor-not-allowed opacity-60 hover:border-border hover:bg-background":
                              isDisabled,
                          }
                        )}
                      >
                        <div className="flex items-center gap-x-4">
                          <MedusaRadio
                            checked={option.id === shippingMethodId}
                          />
                          <span className="text-sm font-semibold tracking-tight text-foreground">
                            {option.name}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          {option.price_type === "flat" ? (
                            convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })
                          ) : calculatedPricesMap[option.id] ? (
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
              <div className="clip-corner-cut-md flex flex-col bg-surface-subtle/60 p-4 ring-1 ring-border/70">
                <span className="text-sm font-semibold tracking-tight text-foreground">
                  Magazin
                </span>
                <span className="mt-1 text-sm text-muted-foreground">
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
                    {_pickupMethods?.map((option) => {
                      return (
                        <Radio
                          key={option.id}
                          value={option.id}
                          disabled={option.insufficient_inventory}
                          data-testid="delivery-option-radio"
                          className={clx(
                            "mb-3 flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-background px-5 py-4 transition-colors hover:border-foreground/30 hover:bg-surface-subtle",
                            {
                              "border-foreground bg-surface-subtle ring-1 ring-foreground/10":
                                option.id === shippingMethodId,
                              "cursor-not-allowed opacity-60 hover:border-border hover:bg-background":
                                option.insufficient_inventory,
                            }
                          )}
                        >
                          <div className="flex items-start gap-x-4">
                            <MedusaRadio
                              checked={option.id === shippingMethodId}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold tracking-tight text-foreground">
                                {option.name}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {formatAddress(getPickupAddress(option))}
                              </span>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-foreground">
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
        <div className="clip-corner-cut-md bg-surface-subtle/60 p-5 ring-1 ring-border/70">
          <div className="text-sm">
            {cart && (cart.shipping_methods?.length ?? 0) > 0 && (
              <div className="flex flex-col">
                <Text className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Metodă selectată
                </Text>
                <Text className="text-sm text-foreground">
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
