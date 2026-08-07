import { Link } from "@/i18n/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/atoms/button";
import { Container } from "@/components/atoms/container";
import { PageHero } from "@/components/molecules/page-hero";
import { SectionHeading } from "@/components/molecules/section-heading";
import { SHOWROOMS, SITE_CONTACT } from "@lib/site-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ContactPage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const NETWORK_CITIES = [
  "Bălți",
  "Orhei",
  "Edineț",
  "Ungheni",
  "Căușeni",
  "Fălești",
  "Cahul",
];

export default async function ContactPage() {
  const t = await getTranslations("ContactPage");
  const tContact = await getTranslations("SiteContact");
  const tShowrooms = await getTranslations("Showrooms");

  return (
    <div className="bg-surface-subtle">
      <Container className="small:py-12 py-8">
        <PageHero
          eyebrow={{ label: t("heroEyebrow") }}
          title={t("heroTitle")}
          lede={t("heroLede")}
          stats={[
            { label: t("phoneLabel"), value: SITE_CONTACT.phoneDisplay },
            { label: t("emailLabel"), value: SITE_CONTACT.email },
            { label: t("hoursLabel"), value: tContact("hoursShort") },
          ]}
        />

        <section className="mt-8">
          <SectionHeading
            eyebrow={t("channelsEyebrow")}
            title={t("channelsTitle")}
            description={t("channelsDescription")}
          />

          <div className="medium:grid-cols-2 xlarge:grid-cols-4 mt-6 grid gap-4">
            <a
              href={SITE_CONTACT.phoneHref}
              className="clip-corner-cut-lg bg-card ring-border hover:border-foreground/25 p-6 ring-1 transition-colors"
            >
              <Phone className="text-primary size-5" />
              <p className="text-muted-foreground mt-4 text-xs font-semibold tracking-[0.18em] uppercase">
                {t("phoneLabel")}
              </p>
              <p className="font-display text-foreground mt-2 text-2xl font-bold tracking-tight">
                {SITE_CONTACT.phoneDisplay}
              </p>
            </a>

            <a
              href={SITE_CONTACT.emailHref}
              className="clip-corner-cut-lg bg-card ring-border hover:border-foreground/25 p-6 ring-1 transition-colors"
            >
              <Mail className="text-primary size-5" />
              <p className="text-muted-foreground mt-4 text-xs font-semibold tracking-[0.18em] uppercase">
                {t("emailLabel")}
              </p>
              <p className="text-foreground mt-2 text-sm font-semibold">
                {SITE_CONTACT.email}
              </p>
            </a>

            <div className="clip-corner-cut-lg bg-card ring-border p-6 ring-1">
              <MapPin className="text-primary size-5" />
              <p className="text-muted-foreground mt-4 text-xs font-semibold tracking-[0.18em] uppercase">
                {t("citiesLabel")}
              </p>
              <p className="text-foreground mt-2 text-sm font-semibold">
                {tContact("citiesSummary")}
              </p>
            </div>

            <div className="clip-corner-cut-lg bg-card ring-border p-6 ring-1">
              <Phone className="text-primary size-5" />
              <p className="text-muted-foreground mt-4 text-xs font-semibold tracking-[0.18em] uppercase">
                {t("hoursLabel")}
              </p>
              <p className="text-foreground mt-2 text-sm font-semibold">
                {tContact("hoursShort")}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <SectionHeading
            eyebrow={t("storesEyebrow")}
            title={t("storesTitle")}
            description={t("storesDescription")}
          />

          <div className="medium:grid-cols-3 mt-6 grid gap-4">
            {SHOWROOMS.map((showroom, index) => (
              <article
                key={`${showroom.city}-${showroom.address}`}
                className="clip-corner-cut-lg bg-card ring-border p-6 ring-1"
              >
                <MapPin className="text-primary size-5" />
                <p className="text-muted-foreground mt-4 text-xs font-semibold tracking-[0.18em] uppercase">
                  {showroom.city}
                </p>
                <h2 className="font-display text-foreground mt-2 text-2xl font-bold tracking-tight">
                  {showroom.address}
                </h2>
                <p className="text-muted-foreground mt-4 text-sm">
                  {tShowrooms(`note${index + 1}`)}
                </p>
                <p className="text-foreground mt-4 text-sm font-medium">
                  {tContact("hoursShort")}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {showroom.phone}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <SectionHeading
            eyebrow={t("networkEyebrow")}
            title={t("networkTitle")}
            description={t("networkDescription")}
          />

          <div className="clip-corner-cut-lg bg-card ring-border mt-6 p-6 ring-1">
            <div className="flex flex-wrap gap-4">
              {NETWORK_CITIES.map((city) => (
                <span
                  key={city}
                  className="border-border bg-surface-subtle text-foreground rounded-full border px-4 py-2 text-sm font-medium"
                >
                  {city}
                </span>
              ))}
            </div>
            <p className="text-muted-foreground mt-4 text-sm">
              {t("networkNote")}
            </p>
          </div>
        </section>

        <section className="mt-12">
          <div className="clip-corner-cut-lg bg-card ring-border small:p-8 p-6 ring-1">
            <SectionHeading
              eyebrow={t("nextStepEyebrow")}
              title={t("nextStepTitle")}
              description={t("nextStepDescription")}
            />
            <div className="mt-6 flex flex-wrap gap-4">
              <Button
                asChild
                size="lg"
                className="clip-corner-cut-sm rounded-none"
              >
                <a href={SITE_CONTACT.emailHref}>{t("emailCta")}</a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={SITE_CONTACT.phoneHref}>{t("phoneCta")}</a>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/store">{t("catalogCta")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}
