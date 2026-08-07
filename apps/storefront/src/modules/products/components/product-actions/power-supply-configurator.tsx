"use client";

import * as React from "react";
import Image from "next/image";
import { BatteryCharging, Check, Wrench } from "lucide-react";
import { useFormatter } from "next-intl";
import type { HttpTypes } from "@medusajs/types";

import { cn } from "@lib/utils";

type Props = {
  batteries: HttpTypes.StoreProduct[];
  chargers: HttpTypes.StoreProduct[];
  selectedBatteryId?: string;
  selectedChargerId?: string;
  onBatteryChange: (variantId?: string) => void;
  onChargerChange: (variantId?: string) => void;
};

const firstVariant = (product: HttpTypes.StoreProduct) => product.variants?.[0];

const productPrice = (product: HttpTypes.StoreProduct) =>
  firstVariant(product)?.calculated_price?.calculated_amount;

const metadataNumber = (value: unknown) => {
  const match = String(value ?? "").match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : Number.NaN;
};

const batteryCapacityNumber = (product: HttpTypes.StoreProduct) => {
  const metadataCapacity = metadataNumber(
    product.metadata?.battery_capacity_ah
  );
  if (Number.isFinite(metadataCapacity)) return metadataCapacity;

  return metadataNumber(product.title?.match(/\d+(?:[.,]\d+)?\s*Ah/i)?.[0]);
};

const batteryCapacity = (product: HttpTypes.StoreProduct) => {
  const capacity = batteryCapacityNumber(product);
  if (Number.isFinite(capacity)) return `${capacity} Ah`;
  return product.title?.match(/\d+(?:[.,]\d+)?\s*Ah/i)?.[0] ?? "Acumulator";
};

const batteryBenefit = (product: HttpTypes.StoreProduct) => {
  const capacity = batteryCapacityNumber(product);
  if (capacity >= 5) return "Autonomie maximă";
  if (capacity >= 4) return "Echilibru optim";
  return "Compact și ușor";
};

const isRapidCharger = (product: HttpTypes.StoreProduct) =>
  metadataNumber(product.metadata?.charger_output_a) >= 4 ||
  /rapid/i.test(product.title ?? "");

function SupplyModeCard({
  selected,
  accent,
  icon,
  title,
  description,
  badge,
  price,
  onSelect,
  testId,
}: {
  selected: boolean;
  accent?: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  price?: string;
  onSelect: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-testid={testId}
      className={cn(
        "focus-visible:ring-ring relative flex min-h-28 items-start gap-3 rounded-xl border p-3.5 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:outline-hidden",
        accent
          ? "border-primary/70 bg-primary-subtle hover:border-primary hover:bg-primary/15"
          : "border-border bg-background hover:border-foreground/40 hover:bg-muted",
        selected &&
          (accent
            ? "border-primary bg-primary/15 ring-primary shadow-sm ring-1"
            : "border-foreground ring-foreground shadow-sm ring-1")
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full",
          accent
            ? "bg-primary text-primary-foreground"
            : selected
              ? "bg-foreground text-background"
              : "bg-surface-subtle text-foreground"
        )}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        {badge ? (
          <span className="bg-primary text-primary-foreground mb-1.5 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black tracking-[0.12em] uppercase">
            {badge}
          </span>
        ) : null}
        <span className="text-foreground block text-sm font-bold">{title}</span>
        <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
          {description}
        </span>
        {price ? (
          <span className="text-foreground mt-2 block text-xs font-black">
            {price}
          </span>
        ) : null}
      </span>

      <span
        aria-hidden
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
          selected
            ? accent
              ? "border-primary bg-primary text-primary-foreground"
              : "border-foreground bg-foreground text-background"
            : "border-foreground/30 bg-background text-transparent"
        )}
      >
        <Check className="size-3 stroke-3" />
      </span>
    </button>
  );
}

function ChoiceCard({
  product,
  selected,
  label,
  description,
  recommended,
  onSelect,
}: {
  product: HttpTypes.StoreProduct;
  selected: boolean;
  label: string;
  description: string;
  recommended?: boolean;
  onSelect: () => void;
}) {
  const format = useFormatter();
  const image = product.thumbnail ?? product.images?.[0]?.url;
  const price = productPrice(product);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "clip-corner-cut-sm focus-visible:ring-ring bg-background relative flex min-w-0 items-center gap-3 p-3 text-left ring-1 transition-[background-color,box-shadow,transform] focus-visible:ring-2 focus-visible:outline-hidden",
        selected
          ? "ring-primary shadow-sm"
          : "ring-border hover:ring-foreground/30"
      )}
    >
      <span className="bg-surface-subtle relative size-16 shrink-0 overflow-hidden rounded-md">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            sizes="64px"
            className="object-contain p-1"
          />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-foreground text-sm font-bold">{label}</span>
          {recommended ? (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-black uppercase">
              Recomandat
            </span>
          ) : null}
        </span>
        <span className="text-muted-foreground mt-0.5 block text-xs">
          {description}
        </span>
        <span
          className={cn(
            "clip-corner-cut-sm mt-2 inline-flex px-3 py-1.5 text-sm font-black",
            price == null
              ? "bg-surface-subtle text-muted-foreground"
              : selected
                ? "bg-primary text-primary-foreground"
                : "bg-foreground text-background"
          )}
        >
          {price == null
            ? "Preț indisponibil"
            : `+${format.number(price, { maximumFractionDigits: 0 })} MDL`}
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border text-transparent"
        )}
      >
        <Check className="size-3.5 stroke-3" />
      </span>
    </button>
  );
}

export function PowerSupplyConfigurator({
  batteries,
  chargers,
  selectedBatteryId,
  selectedChargerId,
  onBatteryChange,
  onChargerChange,
}: Props) {
  const format = useFormatter();
  const [open, setOpen] = React.useState(false);
  const [chargerChoiceMade, setChargerChoiceMade] = React.useState(false);
  const hasOptions = batteries.length > 0;
  const recommendedBattery =
    batteries.find((battery) => batteryCapacityNumber(battery) === 4) ??
    batteries[0];
  const recommendedCharger =
    chargers.find((charger) => isRapidCharger(charger)) ?? chargers[0];
  const recommendedPowerPrice = [
    productPrice(recommendedBattery),
    recommendedCharger ? productPrice(recommendedCharger) : 0,
  ].reduce<number | undefined>(
    (total, price) =>
      total == null || price == null ? undefined : total + price,
    0
  );

  if (!hasOptions) return null;

  const selectToolOnly = () => {
    setOpen(false);
    setChargerChoiceMade(false);
    onBatteryChange(undefined);
    onChargerChange(undefined);
  };

  const selectBattery = (variantId: string) => {
    onBatteryChange(variantId);
  };

  const selectRecommendedPower = () => {
    setOpen(true);
    onBatteryChange(firstVariant(recommendedBattery)?.id);
    onChargerChange(
      recommendedCharger ? firstVariant(recommendedCharger)?.id : undefined
    );
    setChargerChoiceMade(Boolean(recommendedCharger));
  };

  return (
    <section
      aria-labelledby="power-configurator-title"
      className="clip-corner-cut-md border-border bg-surface-subtle/55 space-y-4 border p-4"
      data-testid="power-supply-configurator"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="bg-primary text-primary-foreground grid size-9 shrink-0 place-items-center rounded-full"
        >
          <BatteryCharging className="size-5" />
        </span>
        <div className="min-w-0">
          <h2
            id="power-configurator-title"
            className="text-foreground text-sm font-bold"
          >
            Sculă fără acumulator și încărcător
          </h2>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Cumpără doar scula sau completeaz-o cu alimentare compatibilă.
          </p>
        </div>
      </div>

      <div className="small:grid-cols-2 grid gap-2.5">
        <SupplyModeCard
          selected={!open}
          icon={<Wrench className="size-5" />}
          title="Doar scula"
          description="Am deja un acumulator compatibil DYLLU P20S."
          onSelect={selectToolOnly}
          testId="power-mode-tool-only"
        />
        <SupplyModeCard
          selected={open}
          accent
          icon={<BatteryCharging className="size-5" />}
          title="Sculă + acumulator"
          description={
            recommendedCharger
              ? "Gata de utilizare, cu încărcător compatibil."
              : "Completează scula cu un acumulator compatibil."
          }
          badge="Recomandat"
          price={
            recommendedPowerPrice == null
              ? undefined
              : `+${format.number(recommendedPowerPrice, { maximumFractionDigits: 0 })} MDL`
          }
          onSelect={selectRecommendedPower}
          testId="power-mode-with-battery"
        />
      </div>

      {open ? (
        <div className="space-y-4">
          <div>
            <p className="text-foreground mb-2 flex items-center gap-2 text-xs font-black tracking-[0.12em] uppercase">
              <span className="bg-foreground text-background grid size-5 place-items-center rounded-full text-[10px]">
                1
              </span>
              Alege acumulatorul
            </p>
            <div className="grid gap-2">
              {batteries.map((battery) => {
                const variantId = firstVariant(battery)?.id;
                if (!variantId) return null;
                const capacity = batteryCapacityNumber(battery);

                return (
                  <ChoiceCard
                    key={battery.id}
                    product={battery}
                    selected={selectedBatteryId === variantId}
                    label={batteryCapacity(battery)}
                    description={batteryBenefit(battery)}
                    recommended={capacity === 4}
                    onSelect={() => selectBattery(variantId)}
                  />
                );
              })}
            </div>
          </div>

          {selectedBatteryId && chargers.length > 0 ? (
            <div>
              <p className="text-foreground mb-2 flex items-center gap-2 text-xs font-black tracking-[0.12em] uppercase">
                <span className="bg-foreground text-background grid size-5 place-items-center rounded-full text-[10px]">
                  2
                </span>
                Ai nevoie și de încărcător?
              </p>
              <div className="grid gap-2">
                {chargers.map((charger) => {
                  const variantId = firstVariant(charger)?.id;
                  if (!variantId) return null;

                  return (
                    <ChoiceCard
                      key={charger.id}
                      product={charger}
                      selected={selectedChargerId === variantId}
                      label={
                        isRapidCharger(charger)
                          ? "Încărcător rapid"
                          : "Încărcător"
                      }
                      description="Compatibil cu acumulatorul selectat"
                      recommended={isRapidCharger(charger)}
                      onSelect={() => {
                        onChargerChange(variantId);
                        setChargerChoiceMade(true);
                      }}
                    />
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    onChargerChange(undefined);
                    setChargerChoiceMade(true);
                  }}
                  aria-pressed={chargerChoiceMade && !selectedChargerId}
                  className={cn(
                    "focus-visible:ring-ring min-h-10 rounded-md border px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-hidden",
                    chargerChoiceMade && !selectedChargerId
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  Am deja un încărcător
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
