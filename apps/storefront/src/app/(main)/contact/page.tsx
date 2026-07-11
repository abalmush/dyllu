import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Metadata } from "next";

import { Button } from "@/components/atoms/button";
import { Container } from "@/components/atoms/container";
import { PageHero } from "@/components/molecules/page-hero";
import { SectionHeading } from "@/components/molecules/section-heading";
import { SHOWROOMS, SITE_CONTACT, SITE_SOCIALS } from "@lib/site-content";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Date de contact, showroomuri și canale rapide pentru suportul DYLLU by INGCO în Moldova.",
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

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.07 5.66 21.21 10.44 22v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22C18.34 21.21 22 17.07 22 12.06Z" />
    </svg>
  );
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

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

            <a
              href={SITE_SOCIALS.facebook}
              target="_blank"
              rel="noreferrer"
              className="clip-corner-cut-lg bg-card p-5 ring-1 ring-border transition-colors hover:border-foreground/25"
            >
              <FacebookIcon className="size-5 text-primary" />
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Facebook
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                INGCO Moldova
              </p>
            </a>

            <a
              href={SITE_SOCIALS.instagram}
              target="_blank"
              rel="noreferrer"
              className="clip-corner-cut-lg bg-card p-5 ring-1 ring-border transition-colors hover:border-foreground/25"
            >
              <InstagramIcon className="size-5 text-primary" />
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Instagram
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                @ingco_moldova
              </p>
            </a>
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
            description="Extindem constant rețeaua DYLLU by INGCO, iar informațiile de stoc și transfer între magazine se confirmă prin echipa comercială."
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
