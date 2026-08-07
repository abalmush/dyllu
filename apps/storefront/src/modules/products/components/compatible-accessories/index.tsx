import * as React from "react";
import { HttpTypes } from "@medusajs/types";
import { BatteryFull, Plug } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getCompatibleAccessories } from "@lib/data/compatible-accessories";
import { Container } from "@/components/atoms/container";
import { Eyebrow } from "@/components/molecules/eyebrow";
import { getProductPowerSupply } from "@modules/products/lib/product-presentation";
import { AccessoryCard } from "./accessory-card";

type Props = {
  product: HttpTypes.StoreProduct;
  variant?: HttpTypes.StoreProductVariant;
};

export async function CompatibleAccessories({ product, variant }: Props) {
  const t = await getTranslations("CompatibleAccessories");
  const supply = getProductPowerSupply(product, variant);
  const requiresBattery = supply?.batteryIncluded === false;
  const requiresCharger = supply?.chargerIncluded === false;
  const platform = supply?.platform ?? "";

  if (
    (!requiresBattery && !requiresCharger) ||
    !platform.startsWith("dyllu-")
  ) {
    return null;
  }

  const compatible = await getCompatibleAccessories(platform);
  const batteries = requiresBattery ? compatible.batteries : [];
  const chargers = requiresCharger ? compatible.chargers : [];
  if (batteries.length === 0 && chargers.length === 0) return null;

  return (
    <section
      id="compatible-power-accessories"
      className="border-border bg-surface-subtle/40 small:py-20 scroll-mt-24 border-y py-16"
    >
      <Container>
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <Eyebrow variant="primary">{t("eyebrow")}</Eyebrow>
          <h2 className="font-display text-display-sm text-foreground small:text-display-md font-extrabold tracking-tight">
            {requiresBattery
              ? t("headingChooseBattery")
              : t("headingAddCharger")}
          </h2>
          <p className="text-muted-foreground small:text-base max-w-xl text-sm">
            {requiresBattery
              ? chargers.length
                ? t("descriptionBatteryAndCharger", {
                    platform: prettifyPlatform(platform),
                  })
                : t("descriptionBatteryOnly", {
                    platform: prettifyPlatform(platform),
                  })
              : t("descriptionChargerOnly", {
                  platform: prettifyPlatform(platform),
                })}
          </p>
        </div>

        <div className="medium:mt-12 medium:grid-cols-2 mt-12 grid gap-8">
          {batteries.length > 0 && (
            <div className="space-y-4">
              <div className="text-foreground flex items-center gap-2 text-sm font-semibold tracking-[0.18em] uppercase">
                <BatteryFull className="size-4" />
                {t("batterySectionLabel")}
              </div>
              <div className="space-y-4">
                {batteries.map((p) => (
                  <AccessoryCard key={p.id} product={p} kind="battery" />
                ))}
              </div>
            </div>
          )}
          {chargers.length > 0 && (
            <div className="space-y-4">
              <div className="text-foreground flex items-center gap-2 text-sm font-semibold tracking-[0.18em] uppercase">
                <Plug className="size-4" />
                {t("chargerSectionLabel")}
              </div>
              <div className="space-y-4">
                {chargers.map((p) => (
                  <AccessoryCard key={p.id} product={p} kind="charger" />
                ))}
              </div>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

function prettifyPlatform(p: string): string {
  if (p === "dyllu-20v") return "DYLLU 20V Max";
  if (p === "dyllu-12v") return "DYLLU 12V";
  return p.replace(/^dyllu-/, "DYLLU ").toUpperCase();
}
