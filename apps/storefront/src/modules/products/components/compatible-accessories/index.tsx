import * as React from "react";
import { HttpTypes } from "@medusajs/types";
import { BatteryFull, Plug } from "lucide-react";

import { getCompatibleAccessories } from "@lib/data/compatible-accessories";
import { Container } from "@/components/atoms/container";
import { Eyebrow } from "@/components/molecules/eyebrow";
import { AccessoryCard } from "./accessory-card";

type Props = {
  product: HttpTypes.StoreProduct;
};

export async function CompatibleAccessories({ product }: Props) {
  const metadata = (product.metadata ?? {}) as Record<string, unknown>;
  const requiresBattery = metadata.requires_battery === true;
  const platform = String(metadata.platform ?? "");

  if (!requiresBattery || !platform.startsWith("dyllu-")) return null;

  const { batteries, chargers } = await getCompatibleAccessories(platform);
  if (batteries.length === 0 && chargers.length === 0) return null;

  return (
    <section className="border-y border-border bg-surface-subtle/40 py-16 small:py-20">
      <Container>
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
          <Eyebrow variant="primary">Completează-ți trusa</Eyebrow>
          <h2 className="font-display text-display-sm font-extrabold tracking-tight text-foreground small:text-display-md">
            Această sculă nu include acumulator
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground small:text-base">
            Adaugă un acumulator{chargers.length ? " și un încărcător" : ""}{" "}
            compatibil cu platforma {prettifyPlatform(platform)}.
          </p>
        </div>

        <div className="mt-10 grid gap-8 medium:mt-12 medium:grid-cols-2">
          {batteries.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-foreground">
                <BatteryFull className="size-4" />
                Acumulator
              </div>
              <div className="space-y-3">
                {batteries.map((p) => (
                  <AccessoryCard key={p.id} product={p} kind="battery" />
                ))}
              </div>
            </div>
          )}
          {chargers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-foreground">
                <Plug className="size-4" />
                Încărcător
              </div>
              <div className="space-y-3">
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
