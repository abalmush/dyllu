import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Metadata } from "next";

import { Button } from "@/components/atoms/button";
import { Container } from "@/components/atoms/container";
import { PageHero } from "@/components/molecules/page-hero";
import { SectionHeading } from "@/components/molecules/section-heading";
import { SHOWROOMS, SITE_CONTACT } from "@lib/site-content";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Date de contact, showroomuri și canale rapide pentru suportul DYLLU în Moldova.",
};

const NETWORK_CITIES = [
  "Bălți",
  "Orhei",
  "Edineț",
  "Ungheni",
  "Căușeni",
  "Fălești",
  "Cahul",
];

export default function ContactPage() {
  return (
    <div className="bg-surface-subtle">
      <Container className="py-8 small:py-12">
        <PageHero
          eyebrow={{ label: "Contact DYLLU" }}
          title="Suntem aproape de proiectul tău"
          lede="Folosește datele de mai jos pentru comenzi, service, verificarea stocului sau coordonarea unei livrări."
          stats={[
            { label: "Telefon", value: SITE_CONTACT.phoneDisplay },
            { label: "Email", value: SITE_CONTACT.email },
            { label: "Program", value: SITE_CONTACT.hoursShort },
          ]}
        />

        <section className="mt-8">
          <SectionHeading
            eyebrow="Canale directe"
            title="Alege cel mai rapid mod de a ne contacta"
            description="Pentru solicitări comerciale, suport tehnic și confirmarea comenzilor."
          />

          <div className="mt-6 grid gap-4 medium:grid-cols-2 xlarge:grid-cols-4">
            <a
              href={SITE_CONTACT.phoneHref}
              className="clip-corner-cut-lg bg-card p-5 ring-1 ring-border transition-colors hover:border-foreground/25"
            >
              <Phone className="size-5 text-primary" />
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Telefon
              </p>
              <p className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">
                {SITE_CONTACT.phoneDisplay}
              </p>
            </a>

            <a
              href={SITE_CONTACT.emailHref}
              className="clip-corner-cut-lg bg-card p-5 ring-1 ring-border transition-colors hover:border-foreground/25"
            >
              <Mail className="size-5 text-primary" />
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Email
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {SITE_CONTACT.email}
              </p>
            </a>

            <div className="clip-corner-cut-lg bg-card p-5 ring-1 ring-border">
              <MapPin className="size-5 text-primary" />
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Rețea magazine
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {SITE_CONTACT.citiesSummary}
              </p>
            </div>

            <div className="clip-corner-cut-lg bg-card p-5 ring-1 ring-border">
              <Phone className="size-5 text-primary" />
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Program
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {SITE_CONTACT.hoursShort}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <SectionHeading
            eyebrow="Showroomuri"
            title="Puncte principale în Chișinău"
            description="Pentru vizitare, ridicare și discuții despre produse sau service."
          />

          <div className="mt-6 grid gap-4 medium:grid-cols-3">
            {SHOWROOMS.map((showroom) => (
              <article
                key={`${showroom.city}-${showroom.address}`}
                className="clip-corner-cut-lg bg-card p-5 ring-1 ring-border"
              >
                <MapPin className="size-5 text-primary" />
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {showroom.city}
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">
                  {showroom.address}
                </h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  {showroom.note}
                </p>
                <p className="mt-4 text-sm font-medium text-foreground">
                  {showroom.schedule}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {showroom.phone}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <SectionHeading
            eyebrow="Rețea națională"
            title="Suntem prezenți și în alte orașe"
            description="Extindem constant rețeaua DYLLU, iar informațiile de stoc și transfer între magazine se confirmă prin echipa comercială."
          />

          <div className="clip-corner-cut-lg mt-6 bg-card p-6 ring-1 ring-border">
            <div className="flex flex-wrap gap-3">
              {NETWORK_CITIES.map((city) => (
                <span
                  key={city}
                  className="rounded-full border border-border bg-surface-subtle px-4 py-2 text-sm font-medium text-foreground"
                >
                  {city}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Pentru confirmarea unui punct de lucru, verificarea stocului sau
              coordonarea unei ridicări, contactează-ne telefonic sau pe email.
            </p>
          </div>
        </section>

        <section className="mt-12">
          <div className="clip-corner-cut-lg bg-card p-6 ring-1 ring-border small:p-8">
            <SectionHeading
              eyebrow="Următorul pas"
              title="Ai nevoie de ofertă sau consultanță?"
              description="Trimite-ne cerința și revenim cu recomandarea potrivită pentru produs, set, kit sau accesorii compatibile."
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="clip-corner-cut-sm rounded-none"
              >
                <a href={SITE_CONTACT.emailHref}>Scrie-ne pe email</a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={SITE_CONTACT.phoneHref}>Sună acum</a>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/store">Vezi catalogul</Link>
              </Button>
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}
