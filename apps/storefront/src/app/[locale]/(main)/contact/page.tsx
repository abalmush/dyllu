import { Link } from "@/i18n/navigation";
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
    "Date de contact, magazine și canale rapide pentru suportul DYLLU în Moldova.",
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
      <Container className="small:py-12 py-8">
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

          <div className="medium:grid-cols-2 xlarge:grid-cols-4 mt-6 grid gap-4">
            <a
              href={SITE_CONTACT.phoneHref}
              className="clip-corner-cut-lg bg-card ring-border hover:border-foreground/25 p-6 ring-1 transition-colors"
            >
              <Phone className="text-primary size-5" />
              <p className="text-muted-foreground mt-4 text-xs font-semibold tracking-[0.18em] uppercase">
                Telefon
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
                Email
              </p>
              <p className="text-foreground mt-2 text-sm font-semibold">
                {SITE_CONTACT.email}
              </p>
            </a>

            <div className="clip-corner-cut-lg bg-card ring-border p-6 ring-1">
              <MapPin className="text-primary size-5" />
              <p className="text-muted-foreground mt-4 text-xs font-semibold tracking-[0.18em] uppercase">
                Rețea magazine
              </p>
              <p className="text-foreground mt-2 text-sm font-semibold">
                {SITE_CONTACT.citiesSummary}
              </p>
            </div>

            <div className="clip-corner-cut-lg bg-card ring-border p-6 ring-1">
              <Phone className="text-primary size-5" />
              <p className="text-muted-foreground mt-4 text-xs font-semibold tracking-[0.18em] uppercase">
                Program
              </p>
              <p className="text-foreground mt-2 text-sm font-semibold">
                {SITE_CONTACT.hoursShort}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <SectionHeading
            eyebrow="Magazine DYLLU"
            title="Puncte principale în Chișinău"
            description="Pentru vizitare, ridicare și discuții despre produse sau service."
          />

          <div className="medium:grid-cols-3 mt-6 grid gap-4">
            {SHOWROOMS.map((showroom) => (
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
                  {showroom.note}
                </p>
                <p className="text-foreground mt-4 text-sm font-medium">
                  {showroom.schedule}
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
            eyebrow="Rețea națională"
            title="Suntem prezenți și în alte orașe"
            description="Extindem constant rețeaua DYLLU, iar informațiile de stoc și transfer între magazine se confirmă prin echipa comercială."
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
              Pentru confirmarea unui punct de lucru, verificarea stocului sau
              coordonarea unei ridicări, contactează-ne telefonic sau pe email.
            </p>
          </div>
        </section>

        <section className="mt-12">
          <div className="clip-corner-cut-lg bg-card ring-border small:p-8 p-6 ring-1">
            <SectionHeading
              eyebrow="Următorul pas"
              title="Ai nevoie de ofertă sau consultanță?"
              description="Spune-ne de ce ai nevoie și îți recomandăm produsul, setul sau accesoriile potrivite."
            />
            <div className="mt-6 flex flex-wrap gap-4">
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
