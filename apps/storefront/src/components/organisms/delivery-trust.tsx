import * as React from "react";
import {
  BadgeCheck,
  Headset,
  RotateCcw,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/atoms/container";

type TrustItem = { icon: LucideIcon; title: string; detail: string };

export async function DeliveryTrust() {
  const t = await getTranslations("DeliveryTrust");

  const trustItems: TrustItem[] = [
    {
      icon: Truck,
      title: t("fastShipping.title"),
      detail: t("fastShipping.detail"),
    },
    {
      icon: ShieldCheck,
      title: t("confirmedPayment.title"),
      detail: t("confirmedPayment.detail"),
    },
    {
      icon: BadgeCheck,
      title: t("warranty.title"),
      detail: t("warranty.detail"),
    },
    {
      icon: RotateCcw,
      title: t("returns.title"),
      detail: t("returns.detail"),
    },
    {
      icon: Headset,
      title: t("support.title"),
      detail: t("support.detail"),
    },
  ];

  return (
    <section className="bg-background small:py-16 py-12">
      <Container>
        <div className="small:grid-cols-2 medium:grid-cols-3 grid gap-4">
          {trustItems.map((item) => (
            <div
              key={item.title}
              className="clip-corner-cut-md bg-card ring-border flex items-start gap-4 p-4 ring-1"
            >
              <span className="clip-corner-cut-xs bg-primary/10 text-primary grid size-10 shrink-0 place-items-center">
                <item.icon className="size-5" />
              </span>
              <div>
                <p className="text-foreground text-sm font-semibold">
                  {item.title}
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
