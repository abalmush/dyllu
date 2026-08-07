import * as React from "react";
import { CreditCard, Headphones, Repeat2, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/atoms/container";
import { FeatureStat } from "@/components/molecules/feature-stat";

export async function TrustBand() {
  const t = await getTranslations("TrustBand");

  const features = [
    {
      icon: <Truck className="size-5" />,
      title: t("freeShipping.title"),
      description: t("freeShipping.description"),
    },
    {
      icon: <Repeat2 className="size-5" />,
      title: t("returns.title"),
      description: t("returns.description"),
    },
    {
      icon: <CreditCard className="size-5" />,
      title: t("orderConfirmation.title"),
      description: t("orderConfirmation.description"),
    },
    {
      icon: <Headphones className="size-5" />,
      title: t("support.title"),
      description: t("support.description"),
    },
  ];

  return (
    <section className="border-border bg-surface-subtle/60 border-y py-12">
      <Container>
        <div className="small:grid-cols-2 medium:grid-cols-4 grid gap-4">
          {features.map((f) => (
            <FeatureStat key={f.title} {...f} />
          ))}
        </div>
      </Container>
    </section>
  );
}
